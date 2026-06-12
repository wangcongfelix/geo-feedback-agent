import { z } from 'zod'

/**
 * 用户提交给诊断接口的原始信息。
 *
 * 只有 feedbackText 必填，其余字段允许为空。
 * 空字符串表示用户没有提供，不允许系统自行猜测。
 */
export const FeedbackInputSchema = z.object({
  feedbackText: z
    .string()
    .trim()
    .min(1, '请输入用户反馈原文'),

  productName: z.string().default(''),
  productType: z.string().default(''),
  deviceInfo: z.string().default(''),
  appVersion: z.string().default(''),
  occurredAt: z.string().default(''),
  location: z.string().default(''),
  additionalContext: z.string().default('')
})

/**
 * 产品模块分类。
 *
 * 首版采用较粗的模块，避免类别过多导致模型分类不稳定。
 */
export const ProductModuleSchema = z.enum([
  '搜索与POI',
  '地图展示与图层',
  '路线规划与导航',
  '定位与轨迹',
  '离线地图、文件与数据管理',
  '实时交通、航班与出行信息',
  '账号、收藏与数据同步',
  'B端平台配置与数据处理',
  '其他或无法判断'
])

/**
 * 问题类型分类。
 *
 * “信息不足”必须作为一个合法结果，
 * 避免模型为了完成分类而强行猜测。
 */
export const IssueTypeSchema = z.enum([
  'Bug',
  '地图或业务数据问题',
  '产品需求',
  '使用咨询或操作问题',
  '信息不足，暂时无法判断'
])

/**
 * 严重程度描述问题造成的影响，
 * 不直接等于产品排期优先级。
 */
export const SeveritySchema = z.enum([
  'S1',
  'S2',
  'S3',
  'S4',
  '待人工判断'
])

/**
 * 优先级只是AI建议，最终由产品经理确认。
 */
export const PrioritySchema = z.enum([
  'P0',
  'P1',
  'P2',
  'P3',
  '待人工判断'
])

export const ConfidenceLevelSchema = z.enum([
  '高',
  '中',
  '低'
])

export const PromptVersionSchema = z.enum(['v1', 'v2'])

/**
 * 单项缺失信息。
 */
export const MissingInformationItemSchema = z.object({
  field: z.string(),
  reason: z.string(),

  status: z.enum([
    '已提供',
    '未提供',
    '暂时未知',
    '不适用'
  ]),

  /**
   * 没有内容时返回空字符串，
   * 不允许模型自行补充。
   */
  value: z.string()
})

/**
 * AI必须返回的完整诊断结果。
 *
 * 当前字段全部设置为必填，
 * 即使无法判断，也必须使用：
 * “未知”“待补充”“信息不足”等明确表达。
 */
export const DiagnosisSchema = z.object({
  summary: z.string(),

  userScenario: z.string(),

  productModule: ProductModuleSchema,

  issueType: IssueTypeSchema,

  /**
   * 如果存在第二种可能，在这里说明。
   * 没有备选类型时返回“无”。
   */
  alternativeIssueType: z.string(),

  actualResult: z.string(),

  expectedResult: z.string(),

  severitySuggestion: SeveritySchema,

  prioritySuggestion: PrioritySchema,

  confidenceLevel: ConfidenceLevelSchema,

  /**
   * 只能写用户明确提供的事实。
   */
  userFacts: z.array(z.string()),

  /**
   * 必须明确标记为推测，不能当成事实。
   */
  aiInferences: z.array(z.string()),

  /**
   * 必须来自用户原始反馈，不允许伪造原话。
   */
  evidenceQuotes: z.array(z.string()),

  missingInformation: z.array(
    MissingInformationItemSchema
  ),

  uncertainty: z.string(),

  recommendedNextAction: z.string(),

  promptVersion: PromptVersionSchema
})

/**
 * 根据Zod Schema自动生成TypeScript类型。
 *
 * 以后页面、API和人工审核组件都使用同一套类型，
 * 避免字段名称不一致。
 */
export type FeedbackInput = z.infer<
  typeof FeedbackInputSchema
>

export type MissingInformationItem = z.infer<
  typeof MissingInformationItemSchema
>

export type DiagnosisResult = z.infer<
  typeof DiagnosisSchema
>

export type PromptVersion = z.infer<
  typeof PromptVersionSchema
>
