import type {
  DiagnosisResult,
  FeedbackInput,
  MissingInformationItem
} from '@/lib/diagnosis'
import { displayIssueType } from '@/lib/display-labels'
import { normalizePrioritySuggestion } from '@/lib/priority-normalization'

export type TicketType =
  | 'bug'
  | 'data_issue'
  | 'product_requirement'

export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  bug: 'Bug单',
  data_issue: '数据问题单',
  product_requirement: '产品需求单'
}

export type GeneratedTicket = {
  ticketType: TicketType
  title: string
  markdownContent: string
  structuredData: Record<string, unknown>
  promptVersion: string
  humanConfirmed: boolean
  generatedAt: string
}

export type GenerateTicketInput = {
  ticketType: TicketType
  diagnosis: DiagnosisResult
  feedbackInput: FeedbackInput
  modifiedFields: string[]
  confirmedAt: string
  attachmentNames?: string[]
}

export function recommendTicketType(
  issueType: DiagnosisResult['issueType']
): TicketType {
  if (issueType === 'Bug') {
    return 'bug'
  }

  if (issueType === '地图或业务数据问题') {
    return 'data_issue'
  }

  return 'product_requirement'
}

export function generateTicket({
  ticketType,
  diagnosis,
  feedbackInput,
  modifiedFields,
  confirmedAt,
  attachmentNames = []
}: GenerateTicketInput): GeneratedTicket {
  const generatedAt = new Date().toISOString()
  const title = normalizeValue(diagnosis.summary)
  const common = buildCommonData({
    diagnosis,
    feedbackInput,
    modifiedFields,
    confirmedAt,
    attachmentNames
  })

  const markdownContent =
    ticketType === 'bug'
      ? buildBugTicketMarkdown(common)
      : ticketType === 'data_issue'
        ? buildDataIssueTicketMarkdown(common)
        : buildProductRequirementTicketMarkdown(common)

  return {
    ticketType,
    title,
    markdownContent,
    structuredData: {
      ticketType,
      ticketTypeLabel: TICKET_TYPE_LABELS[ticketType],
      ...common,
      generatedAt
    },
    promptVersion: diagnosis.promptVersion,
    humanConfirmed: true,
    generatedAt
  }
}

type CommonTicketData = {
  title: string
  originalFeedback: string
  productName: string
  productType: string
  productModule: string
  issueType: string
  userScenario: string
  actualResult: string
  expectedResult: string
  prioritySuggestion: string
  missingInformation: MissingInformationItem[]
  uncertainty: string
  recommendedNextAction: string
  userFacts: string[]
  aiInferences: string[]
  evidenceQuotes: string[]
  promptVersion: string
  humanConfirmed: boolean
  confirmedAt: string
  modifiedFields: string[]
  attachmentNames: string[]
  environment: {
    deviceInfo: string
    appVersion: string
    occurredAt: string
    location: string
    additionalContext: string
  }
}

function buildCommonData({
  diagnosis,
  feedbackInput,
  modifiedFields,
  confirmedAt,
  attachmentNames
}: Omit<GenerateTicketInput, 'ticketType'>): CommonTicketData {
  return {
    title: normalizeValue(diagnosis.summary),
    originalFeedback: normalizeValue(feedbackInput.feedbackText),
    productName: normalizeValue(feedbackInput.productName),
    productType: normalizeValue(feedbackInput.productType),
    productModule: normalizeValue(diagnosis.productModule),
    issueType: normalizeValue(displayIssueType(diagnosis.issueType)),
    userScenario: normalizeValue(diagnosis.userScenario),
    actualResult: normalizeValue(diagnosis.actualResult),
    expectedResult: normalizeValue(diagnosis.expectedResult),
    prioritySuggestion: normalizeTicketPriority(
      diagnosis,
      feedbackInput
    ),
    missingInformation: diagnosis.missingInformation,
    uncertainty: normalizeValue(diagnosis.uncertainty),
    recommendedNextAction: normalizeValue(
      diagnosis.recommendedNextAction
    ),
    userFacts: diagnosis.userFacts,
    aiInferences: diagnosis.aiInferences,
    evidenceQuotes: diagnosis.evidenceQuotes,
    promptVersion: diagnosis.promptVersion,
    humanConfirmed: true,
    confirmedAt,
    modifiedFields,
    attachmentNames: attachmentNames ?? [],
    environment: {
      deviceInfo: normalizeValue(feedbackInput.deviceInfo),
      appVersion: normalizeValue(feedbackInput.appVersion),
      occurredAt: normalizeValue(feedbackInput.occurredAt),
      location: normalizeValue(feedbackInput.location),
      additionalContext: normalizeValue(
        feedbackInput.additionalContext
      )
    }
  }
}

function buildBugTicketMarkdown(data: CommonTicketData): string {
  return [
    `# ${data.title}`,
    '',
    '## 单据信息',
    line('单据类型', 'Bug单'),
    commonMetadata(data),
    '',
    '## 用户原始反馈',
    block(data.originalFeedback),
    '',
    '## 产品与环境',
    productAndEnvironment(data),
    '',
    '## 问题描述',
    line('产品模块', data.productModule),
    line('用户场景', data.userScenario),
    line('实际情况', data.actualResult),
    line('期望效果', data.expectedResult),
    '',
    '## 复现与影响',
    line('复现步骤', '待补充'),
    line('处理优先级', data.prioritySuggestion),
    '',
    sharedEvidence(data)
  ].join('\n')
}

function buildDataIssueTicketMarkdown(
  data: CommonTicketData
): string {
  return [
    `# ${data.title}`,
    '',
    '## 单据信息',
    line('单据类型', '数据问题单'),
    commonMetadata(data),
    '',
    '## 用户原始反馈',
    block(data.originalFeedback),
    '',
    '## 数据问题描述',
    line('产品模块', data.productModule),
    line('用户场景', data.userScenario),
    line('实际情况', data.actualResult),
    line('期望效果', data.expectedResult),
    line('问题位置', data.environment.location),
    '',
    '## 处理建议',
    line('处理优先级', data.prioritySuggestion),
    line('建议下一步', data.recommendedNextAction),
    '',
    sharedEvidence(data)
  ].join('\n')
}

function buildProductRequirementTicketMarkdown(
  data: CommonTicketData
): string {
  return [
    `# ${data.title}`,
    '',
    '## 单据信息',
    line('单据类型', '产品需求单'),
    commonMetadata(data),
    '',
    '## 用户原始反馈',
    block(data.originalFeedback),
    '',
    '## 需求背景',
    line('产品模块', data.productModule),
    line('用户场景', data.userScenario),
    line('当前痛点', data.actualResult),
    line('期望能力', data.expectedResult),
    '',
    '## 需求判断',
    line('处理优先级', data.prioritySuggestion),
    line('待验证问题', data.uncertainty),
    line('建议下一步', data.recommendedNextAction),
    '',
    sharedEvidence(data)
  ].join('\n')
}

function commonMetadata(data: CommonTicketData): string {
  return [
    line('问题类型诊断', data.issueType),
    line('Prompt版本', data.promptVersion),
    line('人工确认状态', '已确认'),
    line('人工确认时间', data.confirmedAt),
    line(
      '人工修改字段',
      data.modifiedFields.length > 0
        ? data.modifiedFields.join('、')
        : '无'
    )
  ].join('\n')
}

function productAndEnvironment(data: CommonTicketData): string {
  return [
    line('产品名称', data.productName),
    line('产品类型', data.productType),
    line('设备与系统', data.environment.deviceInfo),
    line('产品版本', data.environment.appVersion),
    line('发生时间', data.environment.occurredAt),
    line('发生地点', data.environment.location),
    line('其他补充', data.environment.additionalContext)
  ].join('\n')
}

function normalizeTicketPriority(
  diagnosis: DiagnosisResult,
  feedbackInput: FeedbackInput
): string {
  if (diagnosis.prioritySuggestion === 'P0') {
    return 'P0'
  }

  return normalizePrioritySuggestion({
    feedbackText: feedbackInput.feedbackText,
    productModule: diagnosis.productModule,
    issueType: diagnosis.issueType,
    prioritySuggestion: diagnosis.prioritySuggestion,
    confidenceLevel: diagnosis.confidenceLevel
  })
}

function sharedEvidence(data: CommonTicketData): string {
  return [
    '## 问题附件',
    formatAttachments(data.attachmentNames),
    '',
    '## 待补充信息',
    formatMissingInformation(data.missingInformation),
    '',
    '## 用户明确提供的事实',
    formatList(data.userFacts),
    '',
    '## AI推测',
    formatInferences(data.aiInferences),
    '',
    '## 用户原话证据',
    formatList(data.evidenceQuotes),
    '',
    '## 不确定性',
    block(data.uncertainty)
  ].join('\n')
}

function formatAttachments(items: string[]): string {
  if (items.length === 0) {
    return '- 未提供'
  }

  return items.map(item => `- ${normalizeValue(item)}`).join('\n')
}

function formatMissingInformation(
  items: MissingInformationItem[]
): string {
  if (items.length === 0) {
    return '- 待补充'
  }

  return items
    .map(item => {
      const value = item.value.trim()
        ? item.value
        : '待补充'

      return [
        `- ${normalizeValue(item.field)}`,
        `  - 状态：${normalizeValue(item.status)}`,
        `  - 当前值：${value}`,
        `  - 原因：${normalizeValue(item.reason)}`
      ].join('\n')
    })
    .join('\n')
}

function formatList(items: string[]): string {
  if (items.length === 0) {
    return '- 待补充'
  }

  return items.map(item => `- ${normalizeValue(item)}`).join('\n')
}

function formatInferences(items: string[]): string {
  if (items.length === 0) {
    return '- 待验证：待补充'
  }

  return items
    .map(item => `- 待验证：${normalizeValue(item)}`)
    .join('\n')
}

function line(label: string, value: string): string {
  return `- ${label}：${normalizeValue(value)}`
}

function block(value: string): string {
  return normalizeValue(value)
}

function normalizeValue(value: string | undefined): string {
  const trimmed = value?.trim()

  return trimmed ? trimmed : '待补充'
}
