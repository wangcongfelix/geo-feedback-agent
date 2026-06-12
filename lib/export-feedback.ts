import type { FeedbackRecord } from '@/lib/feedback-record'

const CSV_COLUMNS = [
  'feedback_id',
  'raw_feedback',
  'product_module',
  'issue_type',
  'alternative_issue_type',
  'severity',
  'priority',
  'confidence',
  'missing_information_count',
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
  usedDirectoryPicker: boolean
  message: string
}

type DirectoryPickerWindow = Window & {
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
      issue_type: diagnosis?.issueType ?? '',
      alternative_issue_type:
        diagnosis?.alternativeIssueType ?? '',
      severity: diagnosis?.severitySuggestion ?? '',
      priority: diagnosis?.prioritySuggestion ?? '',
      confidence: diagnosis?.confidenceLevel ?? '',
      missing_information_count: String(
        diagnosis?.missingInformation.length ?? ''
      ),
      review_status: record.reviewStatus,
      modified_field_count: String(record.modifiedFields.length),
      ticket_generated: record.ticketMarkdown ? 'true' : 'false',
      ticket_type: record.ticketType ?? '',
      ticket_filename: record.ticketMarkdown
        ? buildTicketFilename(record)
        : '',
      processing_status: record.processingStatus,
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

export function downloadFeedbackMasterCsv(
  records: FeedbackRecord[]
) {
  const filename = `feedback_master_${formatDateForFilename(
    new Date()
  )}.csv`

  downloadTextFile(filename, buildFeedbackMasterCsv(records), 'text/csv')
}

export async function exportSelectedFeedbackPackage(
  records: FeedbackRecord[]
): Promise<ExportResult> {
  const exportable = records.filter(
    record =>
      record.reviewStatus === 'confirmed' && record.ticketMarkdown
  )
  const csv = buildFeedbackMasterCsv(records)
  const windowWithPicker = window as DirectoryPickerWindow

  if (windowWithPicker.showDirectoryPicker) {
    const root = await windowWithPicker.showDirectoryPicker()
    const folder = await root.getDirectoryHandle(
      `GeoFeedback_${formatDateForFilename(new Date())}`,
      { create: true }
    )
    const ticketsFolder = await folder.getDirectoryHandle('tickets', {
      create: true
    })

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
      usedDirectoryPicker: true,
      message: `已导出 ${exportable.length} 个问题单。`
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
    usedDirectoryPicker: false,
    message:
      '当前浏览器不支持选择导出目录，已降级为逐个下载文件。'
  }
}

function buildTicketFilename(record: FeedbackRecord): string {
  const type = record.ticketType ?? 'ticket'

  return `${record.id}_${type}.md`
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
