'use client'

import type {
  DiagnosisResult,
  FeedbackInput
} from '@/lib/diagnosis'
import {
  generateTicket,
  recommendTicketType,
  TICKET_TYPE_LABELS,
  type GeneratedTicket,
  type TicketType
} from '@/lib/ticket'
import {
  CheckSquare,
  Clipboard,
  Download,
  FileJson,
  FileText,
  RefreshCw
} from 'lucide-react'
import { useMemo, useState } from 'react'

type TicketGeneratorProps = {
  diagnosis: DiagnosisResult
  feedbackInput: FeedbackInput
  modifiedFields: string[]
  confirmedAt: string
}

const ticketTypes: TicketType[] = [
  'bug',
  'data_issue',
  'product_requirement'
]

export default function TicketGenerator({
  diagnosis,
  feedbackInput,
  modifiedFields,
  confirmedAt
}: TicketGeneratorProps) {
  const recommendedType = useMemo(
    () => recommendTicketType(diagnosis.issueType),
    [diagnosis.issueType]
  )

  const [selectedType, setSelectedType] =
    useState<TicketType>(recommendedType)
  const [checked, setChecked] = useState(false)
  const [generatedTicket, setGeneratedTicket] =
    useState<GeneratedTicket | null>(null)
  const [showJson, setShowJson] = useState(false)
  const [copyMessage, setCopyMessage] = useState('')

  const selectedDiffersFromRecommendation =
    selectedType !== recommendedType

  function handleGenerate() {
    if (!checked) return

    setGeneratedTicket(
      generateTicket({
        ticketType: selectedType,
        diagnosis,
        feedbackInput,
        modifiedFields,
        confirmedAt
      })
    )
    setShowJson(false)
    setCopyMessage('')
  }

  async function handleCopyMarkdown() {
    if (!generatedTicket) return

    await navigator.clipboard.writeText(
      generatedTicket.markdownContent
    )
    setCopyMessage('已复制到剪贴板')
  }

  function handleDownloadMarkdown() {
    if (!generatedTicket) return

    const blob = new Blob(
      [generatedTicket.markdownContent],
      {
        type: 'text/markdown;charset=utf-8'
      }
    )
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `${generatedTicket.title || 'ticket'}.md`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50/40 p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-700" />

            <h2 className="text-xl font-semibold text-slate-900">
              标准问题单生成
            </h2>
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            当前问题单将基于产品经理已确认的审核结果生成。
          </p>
        </div>

        <span className="w-fit rounded-full border border-emerald-200 bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
          人工已确认
        </span>
      </div>

      <div className="mt-6 space-y-5">
        <div>
          <p className="mb-3 text-sm font-medium text-slate-700">
            选择问题单类型
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            {ticketTypes.map(type => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  setSelectedType(type)
                  setGeneratedTicket(null)
                  setCopyMessage('')
                }}
                className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
                  selectedType === type
                    ? 'border-blue-500 bg-white text-blue-700 ring-4 ring-blue-100'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300'
                }`}
              >
                {TICKET_TYPE_LABELS[type]}
              </button>
            ))}
          </div>

          {selectedDiffersFromRecommendation && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              你选择的问题单类型与诊断建议不同，将以人工选择为准。
            </div>
          )}
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={checked}
            onChange={event =>
              setChecked(event.target.checked)
            }
            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />

          <span>
            我已检查诊断结果、人工修改内容、缺失信息和优先级建议。
          </span>
        </label>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            disabled={!checked}
            onClick={handleGenerate}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <CheckSquare className="h-4 w-4" />
            生成问题单
          </button>

          {generatedTicket && (
            <button
              type="button"
              onClick={handleGenerate}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              重新生成
            </button>
          )}
        </div>
      </div>

      {generatedTicket && (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
            <div>
              <p className="text-sm font-medium text-blue-600">
                Markdown预览
              </p>

              <h3 className="mt-1 font-semibold text-slate-900">
                {generatedTicket.title}
              </h3>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCopyMarkdown}
                className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Clipboard className="h-3.5 w-3.5" />
                复制Markdown
              </button>

              <button
                type="button"
                onClick={handleDownloadMarkdown}
                className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-3.5 w-3.5" />
                下载.md
              </button>

              <button
                type="button"
                onClick={() => setShowJson(current => !current)}
                className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <FileJson className="h-3.5 w-3.5" />
                查看结构化JSON
              </button>
            </div>
          </div>

          {copyMessage && (
            <p className="mt-3 text-sm text-emerald-700">
              {copyMessage}
            </p>
          )}

          <pre className="mt-4 max-h-[520px] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-4 text-sm leading-6 text-slate-100">
            {showJson
              ? JSON.stringify(
                generatedTicket.structuredData,
                null,
                2
              )
              : generatedTicket.markdownContent}
          </pre>
        </div>
      )}
    </section>
  )
}
