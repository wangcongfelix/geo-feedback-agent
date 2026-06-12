import type { DiagnosisResult } from '@/lib/diagnosis'
import type {
  FeedbackProcessingStatus,
  FeedbackRecord
} from '@/lib/feedback-record'
import type { ReviewStatus } from '@/lib/review'

export type StatusTone =
  | 'gray'
  | 'orange'
  | 'blue'
  | 'green'
  | 'red'

export function displayIssueType(issueType: string): string {
  if (
    issueType === '使用咨询或操作问题' ||
    issueType === '信息不足，暂时无法判断'
  ) {
    return '使用体验或操作问题'
  }

  return issueType || '-'
}

export function processingStatusLabel(
  status: FeedbackProcessingStatus
): string {
  const labels: Record<FeedbackProcessingStatus, string> = {
    pending: '待处理',
    processing: '处理中',
    diagnosed: '诊断完成',
    failed: '处理失败',
    confirmed: '已完成'
  }

  return labels[status]
}

export function processingStatusTone(
  status: FeedbackProcessingStatus
): StatusTone {
  if (status === 'processing') return 'orange'
  if (status === 'diagnosed') return 'blue'
  if (status === 'failed') return 'red'
  if (status === 'confirmed') return 'green'

  return 'gray'
}

export function reviewStatusLabel(status: ReviewStatus): string {
  const labels: Record<ReviewStatus, string> = {
    not_reviewed: '未审核',
    reviewing: '审核中',
    confirmed: '已确认'
  }

  return labels[status]
}

export function reviewStatusTone(status: ReviewStatus): StatusTone {
  if (status === 'reviewing') return 'orange'
  if (status === 'confirmed') return 'green'

  return 'gray'
}

export function ticketStatusLabel(record: FeedbackRecord): string {
  return record.ticketMarkdown ? '已生成' : '未生成'
}

export function ticketStatusTone(record: FeedbackRecord): StatusTone {
  return record.ticketMarkdown ? 'green' : 'gray'
}

export function priorityTone(
  priority: DiagnosisResult['prioritySuggestion'] | string
): StatusTone {
  return priority === '待人工判断' ? 'orange' : 'blue'
}
