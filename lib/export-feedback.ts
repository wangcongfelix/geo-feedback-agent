import {
  displayIssueType,
  processingStatusLabel,
  reviewStatusLabel,
  ticketStatusLabel
} from '@/lib/display-labels'
import type { FeedbackRecord } from '@/lib/feedback-record'
import { normalizePrioritySuggestion } from '@/lib/priority-normalization'

const CSV_COLUMNS = [
  'feedback_id',
  'raw_feedback',
  'product_module',
  'issue_type',
  'alternative_issue_type',
  'priority',
  'confidence',
  'pending_information_count',
  'review_status',
  'modified_field_count',
  'ticket_generated',
  'ticket_type',
  'ticket_filename',
  'processing_status',
  'error_message',
  'prompt_version',
  'provider',
  'model',
  'created_at',
  'processed_at'
] as const

export type ExportResult = {
  cancelled: boolean
  usedNativePicker: boolean
  message: string
}

type PickerWindow = Window & {
  showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>
}

export function buildFeedbackMasterCsv(
  records: FeedbackRecord[]
): string {
  const rows = records.map(record => {
    const diagnosis = record.reviewedDiagnosis ?? record.diagnosis

    return {
      feedback_id: record.id,
      raw_feedback: record.rawFeedback,
      product_module: diagnosis?.productModule ?? '',
      issue_type: displayIssueType(diagnosis?.issueType ?? ''),
      alternative_issue_type: displayIssueType(
        diagnosis?.alternativeIssueType ?? ''
      ),
      priority: diagnosis ? getExportPriority(record, diagnosis) : '',
      confidence: diagnosis?.confidenceLevel ?? '',
      pending_information_count: String(
        diagnosis?.missingInformation.length ?? ''
      ),
      review_status: reviewStatusLabel(record.reviewStatus),
      modified_field_count: String(record.modifiedFields.length),
      ticket_generated: ticketStatusLabel(record),
      ticket_type: record.ticketType ?? '',
      ticket_filename: record.ticketMarkdown
        ? buildTicketFilename(record)
        : '',
      processing_status: processingStatusLabel(
        record.processingStatus
      ),
      error_message: record.errorMessage,
      prompt_version: diagnosis?.promptVersion ?? '',
      provider: record.provider,
      model: record.model,
      created_at: record.createdAt,
      processed_at: record.processedAt
    }
  })

  return `\uFEFF${CSV_COLUMNS.join(',')}\n${rows
    .map(row =>
      CSV_COLUMNS.map(column =>
        escapeCsvValue(row[column] ?? '')
      ).join(',')
    )
    .join('\n')}\n`
}

export async function saveFeedbackMasterCsv(
  records: FeedbackRecord[]
): Promise<ExportResult> {
  const filename = `feedback_master_${formatDateForFilename(
    new Date()
  )}.csv`
  const csv = buildFeedbackMasterCsv(records)

  downloadTextFile(filename, csv, 'text/csv')

  return {
    cancelled: false,
    usedNativePicker: false,
    message: '反馈总表已下载'
  }
}

export async function exportSelectedFeedbackPackage(
  records: FeedbackRecord[]
): Promise<ExportResult> {
  const exportable = records.filter(
    record =>
      record.reviewStatus === 'confirmed' && record.ticketMarkdown
  )
  const csv = buildFeedbackMasterCsv(records)
  const pickerWindow = window as PickerWindow
  const timestamp = formatDateForFilename(new Date())

  if (pickerWindow.showDirectoryPicker) {
    try {
      const root = await pickerWindow.showDirectoryPicker()
      const folder = await root.getDirectoryHandle(
        `GeoFeedback_${timestamp}`,
        { create: true }
      )
      const ticketsFolder = await folder.getDirectoryHandle(
        'tickets',
        { create: true }
      )

      await writeFileToDirectory(
        folder,
        'feedback_master.csv',
        csv
      )

      for (const record of exportable) {
        await writeFileToDirectory(
          ticketsFolder,
          buildTicketFilename(record),
          record.ticketMarkdown
        )
      }

      return {
        cancelled: false,
        usedNativePicker: true,
        message:
          exportable.length > 0
            ? '反馈总表和问题单已保存到所选文件夹'
            : '当前没有可导出的问题单，仅保存反馈总表'
      }
    } catch (error) {
      if (isAbortError(error)) {
        return {
          cancelled: true,
          usedNativePicker: true,
          message: ''
        }
      }

      throw error
    }
  }

  downloadTextFile('feedback_master.csv', csv, 'text/csv')

  for (const record of exportable) {
    downloadTextFile(
      buildTicketFilename(record),
      record.ticketMarkdown,
      'text/markdown'
    )
  }

  return {
    cancelled: false,
    usedNativePicker: false,
    message: '当前浏览器不支持文件夹写入，已改为普通下载'
  }
}

function buildTicketFilename(record: FeedbackRecord): string {
  const type = record.ticketType ?? 'ticket'

  return `${record.id}_${type}.md`
}

function getExportPriority(
  record: FeedbackRecord,
  diagnosis: NonNullable<FeedbackRecord['diagnosis']>
): string {
  if (
    record.reviewedDiagnosis?.prioritySuggestion === 'P0' &&
    record.modifiedFields.includes('prioritySuggestion')
  ) {
    return 'P0'
  }

  return normalizePrioritySuggestion({
    feedbackText: record.rawFeedback,
    productModule: diagnosis.productModule,
    issueType: diagnosis.issueType,
    prioritySuggestion: diagnosis.prioritySuggestion,
    confidenceLevel: diagnosis.confidenceLevel
  })
}

async function writeFileToDirectory(
  directory: FileSystemDirectoryHandle,
  filename: string,
  content: string
) {
  const handle = await directory.getFileHandle(filename, {
    create: true
  })
  const writable = await handle.createWritable()

  await writable.write(content)
  await writable.close()
}

function downloadTextFile(
  filename: string,
  content: string,
  type: string
) {
  const blob = new Blob([content], {
    type: `${type};charset=utf-8`
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function escapeCsvValue(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`
  }

  return value
}

function formatDateForFilename(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')

  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '_',
    pad(date.getHours()),
    pad(date.getMinutes())
  ].join('')
}

function isAbortError(error: unknown) {
  return (
    error instanceof DOMException &&
    error.name === 'AbortError'
  )
}
