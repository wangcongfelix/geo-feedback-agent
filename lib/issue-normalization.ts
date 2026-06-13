import type { DiagnosisResult } from '@/lib/diagnosis'

const functionFailurePatterns = [
  '打不开',
  '无法打开',
  '白屏',
  '黑屏',
  '闪退',
  '崩溃',
  '卡死',
  '无响应',
  '点击没反应',
  '一直加载',
  '加载失败',
  '无法显示',
  '无法使用'
]

const dataIssuePatterns = [
  '地址错误',
  '名称错误',
  '已经拆除',
  '已经关闭',
  '道路封闭但仍推荐',
  '航班状态错误',
  '公交到站信息错误',
  '地图信息过期'
]

const requirementPatterns = [
  '能不能增加',
  '希望增加',
  '建议增加',
  '是否支持',
  '想要一个',
  '可以加一个'
]

const usagePatterns = [
  '不好用',
  '难用',
  '不方便',
  '体验不好',
  '不会用',
  '怎么用',
  '在哪里打开',
  '找不到入口'
]

export function normalizeInsufficientIssueType({
  diagnosis,
  feedbackText
}: {
  diagnosis: DiagnosisResult
  feedbackText: string
}): DiagnosisResult {
  if (diagnosis.issueType !== '信息不足，暂时无法判断') {
    return diagnosis
  }

  if (matchesAny(feedbackText, functionFailurePatterns)) {
    return {
      ...diagnosis,
      issueType: 'Bug',
      productModule: normalizeFailureProductModule({
        feedbackText,
        productModule: diagnosis.productModule
      })
    }
  }

  if (matchesAny(feedbackText, dataIssuePatterns)) {
    return {
      ...diagnosis,
      issueType: '地图或业务数据问题'
    }
  }

  if (matchesAny(feedbackText, requirementPatterns)) {
    return {
      ...diagnosis,
      issueType: '产品需求'
    }
  }

  if (matchesAny(feedbackText, usagePatterns)) {
    return normalizeToUsageQuestion(diagnosis)
  }

  return normalizeToUsageQuestion({
    ...diagnosis,
    uncertainty:
      appendSentence(
        diagnosis.uncertainty,
        '反馈描述过于笼统，当前只能归为使用体验或操作问题，仍需补充具体功能、操作步骤和实际问题表现。'
      ),
    missingInformation:
      diagnosis.missingInformation.length > 0
        ? diagnosis.missingInformation
        : [
            {
              field: '具体功能',
              reason: '用于确认用户认为不好用或无法完成的具体功能。',
              status: '未提供',
              value: ''
            },
            {
              field: '操作步骤',
              reason: '用于确认用户进入该功能前后的操作路径。',
              status: '未提供',
              value: ''
            },
            {
              field: '实际问题表现',
              reason: '用于判断是功能异常、数据问题、需求缺口还是操作理解问题。',
              status: '未提供',
              value: ''
            }
          ]
  })
}

export function hasFunctionFailureSignal(feedbackText: string) {
  return matchesAny(feedbackText, functionFailurePatterns)
}

function normalizeToUsageQuestion(
  diagnosis: DiagnosisResult
): DiagnosisResult {
  return {
    ...diagnosis,
    issueType: '使用咨询或操作问题',
    confidenceLevel: '低',
    prioritySuggestion: diagnosis.prioritySuggestion || '待人工判断',
    missingInformation: ensureUsageMissingInformation(
      diagnosis.missingInformation
    )
  }
}

function ensureUsageMissingInformation(
  items: DiagnosisResult['missingInformation']
): DiagnosisResult['missingInformation'] {
  const required = [
    {
      field: '具体功能',
      reason: '用于确认用户认为不好用或无法完成的具体功能。',
      status: '未提供' as const,
      value: ''
    },
    {
      field: '操作步骤',
      reason: '用于确认用户进入该功能前后的操作路径。',
      status: '未提供' as const,
      value: ''
    },
    {
      field: '实际问题表现',
      reason: '用于判断是功能异常、数据问题、需求缺口还是操作理解问题。',
      status: '未提供' as const,
      value: ''
    }
  ]
  const existingFields = new Set(items.map(item => item.field))
  const additions = required.filter(
    item => !existingFields.has(item.field)
  )

  return [...items, ...additions]
}

function normalizeFailureProductModule({
  feedbackText,
  productModule
}: {
  feedbackText: string
  productModule: DiagnosisResult['productModule']
}): DiagnosisResult['productModule'] {
  if (
    feedbackText.includes('地图') &&
    (feedbackText.includes('白屏') ||
      feedbackText.includes('黑屏') ||
      feedbackText.includes('无法显示'))
  ) {
    return '地图展示与图层'
  }

  return productModule
}

function matchesAny(text: string, patterns: string[]) {
  return patterns.some(pattern => text.includes(pattern))
}

function appendSentence(current: string, sentence: string) {
  const trimmed = current.trim()

  if (!trimmed) {
    return sentence
  }

  if (trimmed.includes(sentence)) {
    return trimmed
  }

  return `${trimmed} ${sentence}`
}
