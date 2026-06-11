import { DiagnosisSchema, FeedbackInputSchema } from '@/lib/diagnosis'
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

/**
 * Mock诊断结果。
 *
 * 作用：
 * 1. 不消耗API额度；
 * 2. 让前端页面、人工审核、问题单生成可以先开发；
 * 3. 保证返回结构符合DiagnosisSchema；
 * 4. 后续接真实模型时不用重写前端。
 */
function createMockDiagnosis() {
  return {
    summary: '驾车导航持续推荐封闭道路',
    userScenario: '用户驾车前往机场，并使用路线规划与导航功能。',
    productModule: '路线规划与导航',
    issueType: '地图或业务数据问题',
    alternativeIssueType: '可能为路线规划Bug，需要进一步排查。',
    actualResult: '导航持续推荐用户描述为已经封闭的道路。',
    expectedResult: '用户可能期望导航避开不可通行道路，并重新规划可用路线。',
    severitySuggestion: 'S2',
    prioritySuggestion: '待人工判断',
    confidenceLevel: '中',
    userFacts: [
      '用户正在开车去机场。',
      '用户反馈导航推荐了一条已经封闭的路。',
      '用户反馈重新规划后仍然推荐该道路。'
    ],
    aiInferences: [
      '可能与道路通行数据未及时更新有关。',
      '可能与路线规划未正确规避封闭道路有关。'
    ],
    evidenceQuotes: [
      '开车去机场时',
      '导航一直让我走一条已经封闭的路',
      '重新规划后还是走这里'
    ],
    missingInformation: [
      {
        field: '发生时间',
        reason: '用于判断是否为临时封路、实时路况延迟或长期道路数据问题。',
        status: '未提供',
        value: ''
      },
      {
        field: '具体道路或位置',
        reason: '用于定位涉及的道路数据或路线规划问题。',
        status: '未提供',
        value: ''
      },
      {
        field: '起点和终点',
        reason: '用于复现路线规划结果。',
        status: '未提供',
        value: ''
      },
      {
        field: '产品版本',
        reason: '用于排查是否与特定版本策略或客户端问题有关。',
        status: '未提供',
        value: ''
      }
    ],
    uncertainty:
      '当前无法确认这是道路通行数据未更新，还是路线规划策略没有正确规避封闭道路。',
    recommendedNextAction:
      '建议补充发生时间、具体道路、起点终点和截图后，由产品经理判断是否提交数据问题单或Bug单。',
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

    /**
     * 默认使用Mock模式。
     *
     * 只要USE_MOCK_AI不是明确的false，
     * 就不会调用真实模型。
     */
    const useMockAI = process.env.USE_MOCK_AI !== 'false'

    if (useMockAI) {
      const mockDiagnosis = createMockDiagnosis()
      const parsedMock = DiagnosisSchema.parse(mockDiagnosis)

      return Response.json({
        success: true,
        data: parsedMock,
        meta: {
          provider: 'mock',
          model: 'mock-diagnosis-v1',
          promptVersion: parsedMock.promptVersion,
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
                content: buildDiagnosisUserPrompt(feedbackInput)
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

        return Response.json({
          success: true,
          data: diagnosisResult.data,
          meta: {
            provider: 'deepseek',
            model,
            promptVersion:
              diagnosisResult.data.promptVersion
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
          content: buildDiagnosisUserPrompt(feedbackInput)
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

    return Response.json({
      success: true,
      data: diagnosisResult.data,
      meta: {
        provider: 'gemini',
        model,
        promptVersion: diagnosisResult.data.promptVersion
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
