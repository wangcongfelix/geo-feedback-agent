import {
  DiagnosisSchema,
  FeedbackInputSchema,
  type FeedbackInput
} from '@/lib/diagnosis'
import {
  hasFunctionFailureSignal,
  normalizeInsufficientIssueType
} from '@/lib/issue-normalization'
import {
  buildDiagnosisUserPrompt,
  DIAGNOSIS_SYSTEM_PROMPT
} from '@/lib/prompts/diagnosis-prompt'
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'

export const runtime = 'nodejs'

function createErrorResponse(
  code: string,
  message: string,
  status: number
) {
  return Response.json(
    {
      success: false,
      error: {
        code,
        message
      }
    },
    { status }
  )
}

function isTimeoutError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }

  return (
    error.name.toLowerCase().includes('timeout') ||
    error.message.toLowerCase().includes('timeout') ||
    error.message.includes('timed out')
  )
}

function parseJsonObject(content: string | null) {
  if (!content) {
    return null
  }

  try {
    return JSON.parse(content) as unknown
  } catch {
    return null
  }
}

function getTopLevelKeys(value: unknown) {
  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  ) {
    return Object.keys(value)
  }

  return []
}

const bugGuardrailMessage =
  '内部判断提示：该反馈已经明确描述功能异常。不得仅因缺少设备、版本或复现信息，将issueType判断为“信息不足，暂时无法判断”。除非存在更明确的数据问题证据，否则优先判断为Bug。'

function shouldApplyBugGuardrail(feedbackText: string) {
  return hasFunctionFailureSignal(feedbackText)
}

function buildGuardedDiagnosisUserPrompt(
  feedbackInput: FeedbackInput
) {
  const prompt = buildDiagnosisUserPrompt(feedbackInput)

  if (!shouldApplyBugGuardrail(feedbackInput.feedbackText)) {
    return {
      prompt,
      guardrailApplied: false
    }
  }

  return {
    prompt: `${prompt}\n\n${bugGuardrailMessage}`,
    guardrailApplied: true
  }
}

/**
 * Mock诊断结果。
 *
 * 作用：
 * 1. 不消耗API额度；
 * 2. 让前端页面、人工审核、问题单生成可以先开发；
 * 3. 保证返回结构符合DiagnosisSchema；
 * 4. 后续接真实模型时不用重写前端。
 */
function createMockDiagnosis(feedbackInput: FeedbackInput) {
  const feedbackText = feedbackInput.feedbackText
  const isBug = /崩溃|闪退|白屏|卡死|打不开|无法打开|一直加载/.test(feedbackText)
  const isDataIssue = /定位|道路|封路|封闭|地图|地点|地址|POI|路况|航班.*(错误|不准|没更新)/i.test(feedbackText)
  const isRequirement = /希望|建议|能否|能不能|最好|新增|增加|支持|想要/.test(feedbackText)
  const issueType = isBug
    ? 'Bug'
    : isDataIssue
      ? '地图或业务数据问题'
      : isRequirement
        ? '产品需求'
        : '使用咨询或操作问题'
  const productModule = /导航|路线|道路|封路|封闭/.test(feedbackText)
    ? '路线规划与导航'
    : /定位|轨迹/.test(feedbackText)
      ? '定位与轨迹'
      : /收藏|账号|同步/.test(feedbackText)
        ? '账号、收藏与数据同步'
        : /地图|图层/.test(feedbackText)
          ? '地图展示与图层'
          : '其他或无法判断'

  return {
    summary: feedbackText.replace(/\s+/g, ' ').slice(0, 30) || '截图反馈待进一步确认',
    userScenario: '用户通过微信截图反馈产品使用情况。',
    productModule,
    issueType,
    alternativeIssueType: '无',
    actualResult: `用户反馈：${feedbackText}`,
    expectedResult: isRequirement
      ? `用户期望：${feedbackText}`
      : '用户可能期望相关功能或数据恢复正常。',
    severitySuggestion: isBug ? 'S2' : 'S3',
    prioritySuggestion: '待人工判断',
    confidenceLevel: feedbackText.length >= 10 ? '中' : '低',
    userFacts: [feedbackText],
    aiInferences: [],
    evidenceQuotes: [feedbackText.slice(0, 80)],
    missingInformation: [
      {
        field: '产品版本与复现环境',
        reason: '用于后续排查和复现当前反馈。',
        status: '未提供',
        value: ''
      }
    ],
    uncertainty: '当前分类来自截图文字，仍需产品经理结合原图复核。',
    recommendedNextAction: '建议核对截图原文、用户标识与反馈时间后确认归档。',
    promptVersion: 'v1'
  }
}

export async function POST(request: Request) {
  try {
    const requestBody: unknown = await request.json()

    const inputResult = FeedbackInputSchema.safeParse(requestBody)

    if (!inputResult.success) {
      return Response.json(
        {
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: '提交的反馈信息格式不正确',
            details: inputResult.error.flatten()
          }
        },
        { status: 400 }
      )
    }

    const feedbackInput = inputResult.data
    const guardedPrompt =
      buildGuardedDiagnosisUserPrompt(feedbackInput)

    /**
     * 默认使用Mock模式。
     *
     * 只要USE_MOCK_AI不是明确的false，
     * 就不会调用真实模型。
     */
    const useMockAI = process.env.USE_MOCK_AI !== 'false'

    if (useMockAI) {
      const mockDiagnosis = createMockDiagnosis(feedbackInput)
      const parsedMock = DiagnosisSchema.parse(mockDiagnosis)
      const normalizedMock = normalizeInsufficientIssueType({
        diagnosis: parsedMock,
        feedbackText: feedbackInput.feedbackText
      })

      return Response.json({
        success: true,
        data: normalizedMock,
        meta: {
          provider: 'mock',
          model: 'mock-diagnosis-v1',
          promptVersion: normalizedMock.promptVersion,
          guardrailApplied: guardedPrompt.guardrailApplied,
          inputEcho: {
            feedbackText: feedbackInput.feedbackText,
            productType: feedbackInput.productType
          }
        }
      })
    }

    const aiProvider =
      process.env.AI_PROVIDER?.trim().toLowerCase() ||
      'deepseek'

    if (aiProvider === 'deepseek') {
      const apiKey = process.env.DEEPSEEK_API_KEY

      if (!apiKey) {
        return createErrorResponse(
          'API_KEY_MISSING',
          '服务端尚未配置DeepSeek API Key',
          500
        )
      }

      const client = new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: 'https://api.deepseek.com',
        timeout: 30_000,
        maxRetries: 0
      })

      const model =
        process.env.DEEPSEEK_MODEL?.trim() ||
        'deepseek-v4-flash'

      try {
        const completion =
          await client.chat.completions.create({
            model,
            messages: [
              {
                role: 'system',
                content: DIAGNOSIS_SYSTEM_PROMPT
              },
              {
                role: 'user',
                content: guardedPrompt.prompt
              }
            ],
            response_format: {
              type: 'json_object'
            }
          })

        const parsedJson = parseJsonObject(
          completion.choices[0]?.message.content ?? null
        )

        if (!parsedJson) {
          return createErrorResponse(
            'MODEL_OUTPUT_INVALID',
            'AI返回结果不是有效JSON，本次诊断未生成',
            502
          )
        }

        const diagnosisResult =
          DiagnosisSchema.safeParse(parsedJson)

        if (!diagnosisResult.success) {
          if (process.env.NODE_ENV !== 'production') {
            console.error(
              'Diagnosis schema validation failed. Parsed JSON top-level keys:',
              getTopLevelKeys(parsedJson)
            )
            console.error(
              'Diagnosis schema validation issues:',
              diagnosisResult.error.issues
            )
          }

          return createErrorResponse(
            'MODEL_OUTPUT_INVALID',
            'AI返回结果未通过结构校验',
            502
          )
        }

        const normalizedDiagnosis = normalizeInsufficientIssueType({
          diagnosis: diagnosisResult.data,
          feedbackText: feedbackInput.feedbackText
        })

        return Response.json({
          success: true,
          data: normalizedDiagnosis,
          meta: {
            provider: 'deepseek',
            model,
            promptVersion:
              normalizedDiagnosis.promptVersion,
            guardrailApplied: guardedPrompt.guardrailApplied
          }
        })
      } catch (error) {
        if (isTimeoutError(error)) {
          return createErrorResponse(
            'MODEL_TIMEOUT',
            '模型服务响应超时，请稍后重试',
            504
          )
        }

        throw error
      }
    }

    if (aiProvider !== 'gemini') {
      return createErrorResponse(
        'AI_PROVIDER_UNSUPPORTED',
        '当前模型供应商配置暂不支持',
        400
      )
    }

    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return createErrorResponse(
        'API_KEY_MISSING',
        '服务端尚未配置Gemini API Key',
        500
      )
    }

    /**
     * Gemini作为备用供应商保留。
     *
     * Google提供了OpenAI兼容接口，
     * 因此当前项目不需要重写完整模型调用层。
     */
    const client = new OpenAI({
      apiKey,
      baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/'
    })

    const model =
      process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash'

    const completion = await client.beta.chat.completions.parse({
      model,
      messages: [
        {
          role: 'system',
          content: DIAGNOSIS_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: guardedPrompt.prompt
        }
      ],
      response_format: zodResponseFormat(
        DiagnosisSchema,
        'feedback_diagnosis'
      )
    })

    const message = completion.choices[0]?.message

    if (message?.refusal) {
      return createErrorResponse(
        'MODEL_REFUSAL',
        '模型未能完成本次反馈诊断',
        422
      )
    }

    const diagnosis = message?.parsed

    if (!diagnosis) {
      return createErrorResponse(
        'MODEL_OUTPUT_INVALID',
        'AI返回结果格式不完整，本次诊断未生成',
        502
      )
    }

    const diagnosisResult = DiagnosisSchema.safeParse(diagnosis)

    if (!diagnosisResult.success) {
      console.error(
        'Diagnosis schema validation failed:',
        diagnosisResult.error.flatten()
      )

      return createErrorResponse(
        'MODEL_OUTPUT_INVALID',
        'AI返回结果未通过结构校验',
        502
      )
    }

    const normalizedDiagnosis = normalizeInsufficientIssueType({
      diagnosis: diagnosisResult.data,
      feedbackText: feedbackInput.feedbackText
    })

    return Response.json({
      success: true,
      data: normalizedDiagnosis,
      meta: {
        provider: 'gemini',
        model,
        promptVersion: normalizedDiagnosis.promptVersion,
        guardrailApplied: guardedPrompt.guardrailApplied
      }
    })
  } catch (error) {
    console.error('Diagnosis API error:', error)

    return createErrorResponse(
      'DIAGNOSIS_FAILED',
      '诊断请求失败，请稍后重试',
      500
    )
  }
}
