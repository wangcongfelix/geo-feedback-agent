import type {
  DiagnosisResult,
  FeedbackInput
} from '@/lib/diagnosis'
import type { ReviewStatus } from '@/lib/review'
import type { TicketType } from '@/lib/ticket'

export type FeedbackProcessingStatus =
  | 'pending'
  | 'processing'
  | 'diagnosed'
  | 'failed'
  | 'confirmed'

export type FeedbackRecord = {
  id: string
  rawFeedback: string
  optionalContext: Omit<FeedbackInput, 'feedbackText'>
  diagnosis: DiagnosisResult | null
  reviewedDiagnosis: DiagnosisResult | null
  reviewStatus: ReviewStatus
  modifiedFields: string[]
  ticketType: TicketType | null
  ticketMarkdown: string
  processingStatus: FeedbackProcessingStatus
  errorMessage: string
  createdAt: string
  processedAt: string
  provider: string
  model: string
}
