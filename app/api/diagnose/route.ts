import { DiagnosisSchema, FeedbackInputSchema } from '@/lib/diagnosis'
import {
  buildDiagnosisUserPrompt,
  DIAGNOSIS_SYSTEM_PROMPT
} from '@/lib/prompts/diagnosis-prompt'
import OpenAI from 'openai'
import { zodResponseFormat } from 'openai/helpers/zod'

export const runtime = 'nodejs'

/**
 * 统一生成接口错误响应。
 *
 * 前端只需要识别 code 和 message，
 * 不直接暴露服务端堆栈或密钥信息。
 */
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

export async function POST(request: Request) {
  try {
    /**
     * 第一步：检查服务端是否配置了API Key。
     *
     * API Key只允许存在于服务端环境变量中，
     * 不能由浏览器传进来。
     */
    const apiKey = process.env.OPENAI_API_KEY

    if (!apiKey) {
      return createErrorResponse(
        'API_KEY_MISSING',
        '服务端尚未配置模型API Key',
        500
      )
    }

    /**
     * 第二步：读取浏览器提交的JSON。
     */
    const requestBody: unknown = await request.json()

    /**
     * 第三步：校验输入。
     *
     * safeParse不会直接抛出异常，
     * 而是返回success和校验结果。
     */
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
     * 第四步：创建服务端OpenAI客户端。
     *
     * 放在POST函数内部，是为了避免没有配置密钥时，
     * 项目启动阶段直接报错。
     */
    const openai = new OpenAI({
      apiKey
    })

    const model =
      process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini'

    /**
     * 第五步：调用模型并要求结构化输出。
     *
     * 当前项目沿用官方示例所使用的beta命名空间，
     * 与项目当前安装的openai 4.x版本保持兼容。
     */
    const completion =
      await openai.beta.chat.completions.parse({
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

    /**
     * 模型可能因为安全或其他原因拒绝回答。
     */
    if (message?.refusal) {
      return createErrorResponse(
        'MODEL_REFUSAL',
        '模型未能完成本次反馈诊断',
        422
      )
    }

    /**
     * parsed是经过DiagnosisSchema解析后的结果。
     */
    const diagnosis = message?.parsed

    if (!diagnosis) {
      return createErrorResponse(
        'MODEL_OUTPUT_INVALID',
        'AI返回结果格式不完整，本次诊断未生成',
        502
      )
    }

    /**
     * 再执行一次本地Schema校验。
     *
     * 虽然SDK已经解析过，但这里属于服务端防御性校验，
     * 确保发给前端的数据符合项目自己的规则。
     */
    const diagnosisResult =
      DiagnosisSchema.safeParse(diagnosis)

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
        model,
        promptVersion: diagnosisResult.data.promptVersion
      }
    })
  } catch (error) {
    /**
     * 日志只记录错误对象，
     * 不主动打印完整用户反馈或API Key。
     */
    console.error('Diagnosis API error:', error)

    return createErrorResponse(
      'DIAGNOSIS_FAILED',
      '诊断请求失败，请稍后重试',
      500
    )
  }
}