import type { DiagnosisResult } from '@/lib/diagnosis'

export type NormalizedPriority = 'P1' | 'P2' | 'P3'

export type NormalizePriorityInput = {
  feedbackText: string
  productModule: DiagnosisResult['productModule']
  issueType: DiagnosisResult['issueType']
  prioritySuggestion: DiagnosisResult['prioritySuggestion']
  confidenceLevel: DiagnosisResult['confidenceLevel']
}

const p1Patterns = [
  '打不开',
  '无法打开',
  '白屏',
  '黑屏',
  '崩溃',
  '闪退',
  '卡死',
  '完全无法使用',
  '核心页面无法进入',
  '导航持续推荐封闭道路',
  '明确安全风险',
  '明显安全风险'
]

const p2Patterns = [
  '收藏',
  '轨迹',
  '账号数据丢失',
  '收藏地点全部不见',
  '全部不见',
  '数据丢失',
  '同步失败',
  '离线地图下载后无法使用',
  '核心功能部分不可用',
  '航班',
  '公交',
  '道路状态错误',
  '充电站',
  '状态错误',
  '重要业务数据明显错误',
  '稳定复现'
]

const p3Patterns = [
  '不好用',
  '不方便',
  '难用',
  '体验不好',
  '名称',
  '地址',
  '营业状态',
  '改名',
  '旧名字'
]

export function normalizePrioritySuggestion({
  feedbackText,
  productModule,
  issueType,
  prioritySuggestion,
  confidenceLevel
}: NormalizePriorityInput): NormalizedPriority {
  const ruleBasedPriority = inferPriorityByRules({
    feedbackText,
    productModule,
    issueType,
    confidenceLevel
  })

  if (prioritySuggestion === 'P1') {
    return ruleBasedPriority === 'P2' ? 'P2' : 'P1'
  }

  if (prioritySuggestion === 'P2') {
    return ruleBasedPriority === 'P1' ? 'P1' : 'P2'
  }

  if (prioritySuggestion === 'P3') {
    return ruleBasedPriority
  }

  return ruleBasedPriority
}

function inferPriorityByRules({
  feedbackText,
  productModule,
  issueType,
  confidenceLevel
}: Omit<NormalizePriorityInput, 'prioritySuggestion'>): NormalizedPriority {
  if (matchesAny(feedbackText, p1Patterns)) {
    return 'P1'
  }

  if (isImportantDataOrCoreFunctionIssue(feedbackText, productModule)) {
    return 'P2'
  }

  if (
    issueType === '使用咨询或操作问题' ||
    issueType === '产品需求' ||
    issueType === '信息不足，暂时无法判断'
  ) {
    return 'P3'
  }

  if (matchesAny(feedbackText, p3Patterns)) {
    return 'P3'
  }

  if (confidenceLevel === '低') {
    return 'P3'
  }

  if (issueType === '地图或业务数据问题') {
    return 'P3'
  }

  return 'P3'
}

function isImportantDataOrCoreFunctionIssue(
  feedbackText: string,
  productModule: DiagnosisResult['productModule']
) {
  if (matchesAny(feedbackText, p2Patterns)) {
    return true
  }

  return (
    productModule === '账号、收藏与数据同步' ||
    productModule === '实时交通、航班与出行信息'
  )
}

function matchesAny(text: string, patterns: string[]) {
  return patterns.some(pattern => text.includes(pattern))
}
