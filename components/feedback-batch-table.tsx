'use client'

import HumanReviewForm from '@/components/human-review-form'
import TicketGenerator from '@/components/ticket-generator'
import {
  downloadFeedbackMasterCsv,
  exportSelectedFeedbackPackage
} from '@/lib/export-feedback'
import type { FeedbackRecord } from '@/lib/feedback-record'
import type { FeedbackInput } from '@/lib/diagnosis'
import { getModifiedFields } from '@/lib/review'
import type { GeneratedTicket } from '@/lib/ticket'
import {
  CheckCircle2,
  Download,
  FileDown,
  Filter,
  TableProperties
} from 'lucide-react'
import { useMemo, useState } from 'react'

type FeedbackBatchTableProps = {
  records: FeedbackRecord[]
  selectedRecordId: string
  selectedIds: string[]
  onSelectRecord: (id: string) => void
  onToggleSelected: (id: string) => void
  onToggleAllSelected: (ids: string[]) => void
  onUpdateRecord: (
    id: string,
    updater: (record: FeedbackRecord) => FeedbackRecord
  ) => void
  onBatchAccept: (ids: string[]) => void
}

export default function FeedbackBatchTable({
  records,
  selectedRecordId,
  selectedIds,
  onSelectRecord,
  onToggleSelected,
  onToggleAllSelected,
  onUpdateRecord,
  onBatchAccept
}: FeedbackBatchTableProps) {
  const [moduleFilter, setModuleFilter] = useState('')
  const [issueTypeFilter, setIssueTypeFilter] = useState('')
  const [reviewStatusFilter, setReviewStatusFilter] =
    useState('')
  const [pendingOnly, setPendingOnly] = useState(false)
  const [exportMessage, setExportMessage] = useState('')

  const moduleOptions = uniqueValues(
    records.map(record =>
      record.reviewedDiagnosis?.productModule ??
      record.diagnosis?.productModule ??
      ''
    )
  )
  const issueTypeOptions = uniqueValues(
    records.map(record =>
      record.reviewedDiagnosis?.issueType ??
      record.diagnosis?.issueType ??
      ''
    )
  )

  const filteredRecords = records.filter(record => {
    const diagnosis = record.reviewedDiagnosis ?? record.diagnosis
    const matchesModule =
      !moduleFilter || diagnosis?.productModule === moduleFilter
    const matchesIssueType =
      !issueTypeFilter || diagnosis?.issueType === issueTypeFilter
    const matchesReview =
      !reviewStatusFilter ||
      record.reviewStatus === reviewStatusFilter
    const matchesPending =
      !pendingOnly ||
      diagnosis?.severitySuggestion === '待人工判断' ||
      diagnosis?.prioritySuggestion === '待人工判断'

    return (
      matchesModule &&
      matchesIssueType &&
      matchesReview &&
      matchesPending
    )
  })

  const selectedRecord =
    records.find(record => record.id === selectedRecordId) ??
    filteredRecords[0] ??
    records[0]
  const selectedRecords = records.filter(record =>
    selectedIds.includes(record.id)
  )
  const batchAcceptableIds = selectedRecords
    .filter(record => {
      if (!record.diagnosis || !record.reviewedDiagnosis) {
        return false
      }

      return (
        record.reviewStatus !== 'confirmed' &&
        getModifiedFields(
          record.diagnosis,
          record.reviewedDiagnosis
        ).length === 0
      )
    })
    .map(record => record.id)

  const overview = useMemo(
    () => buildBatchOverview(records),
    [records]
  )

  async function handleExportSelectedPackage() {
    const result = await exportSelectedFeedbackPackage(
      selectedRecords
    )

    setExportMessage(result.message)
  }

  return (
    <section className="space-y-5">
      <BatchOverview overview={overview} />

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
          <div>
            <div className="flex items-center gap-2">
              <TableProperties className="h-5 w-5 text-blue-700" />
              <h2 className="text-xl font-semibold">
                批量反馈总表
              </h2>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              最多20条，逐条顺序诊断；点击行查看和审核单条反馈。
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadFeedbackMasterCsv(records)}
              className="flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              导出总表CSV
            </button>

            <button
              type="button"
              disabled={selectedRecords.length === 0}
              onClick={handleExportSelectedPackage}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <FileDown className="h-4 w-4" />
              导出选中问题单
            </button>
          </div>
        </div>

        {exportMessage && (
          <p className="mt-3 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">
            {exportMessage}
          </p>
        )}

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <FilterSelect
            label="产品模块"
            value={moduleFilter}
            options={moduleOptions}
            onChange={setModuleFilter}
          />
          <FilterSelect
            label="问题类型"
            value={issueTypeFilter}
            options={issueTypeOptions}
            onChange={setIssueTypeFilter}
          />
          <FilterSelect
            label="审核状态"
            value={reviewStatusFilter}
            options={['not_reviewed', 'reviewing', 'confirmed']}
            onChange={setReviewStatusFilter}
          />
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={pendingOnly}
              onChange={event =>
                setPendingOnly(event.target.checked)
              }
            />
            仅看待人工判断
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={
                filteredRecords.length > 0 &&
                filteredRecords.every(record =>
                  selectedIds.includes(record.id)
                )
              }
              onChange={event =>
                onToggleAllSelected(
                  event.target.checked
                    ? filteredRecords.map(record => record.id)
                    : []
                )
              }
            />
            选择当前筛选结果
          </label>

          <button
            type="button"
            disabled={batchAcceptableIds.length === 0}
            onClick={() => onBatchAccept(batchAcceptableIds)}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <CheckCircle2 className="h-4 w-4" />
            批量接受AI建议
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-[1180px] w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs text-slate-500">
                <th className="border-b border-slate-200 px-3 py-2">
                  选择
                </th>
                <th className="border-b border-slate-200 px-3 py-2">
                  编号
                </th>
                <th className="border-b border-slate-200 px-3 py-2">
                  原始反馈摘要
                </th>
                <th className="border-b border-slate-200 px-3 py-2">
                  产品模块
                </th>
                <th className="border-b border-slate-200 px-3 py-2">
                  问题类型
                </th>
                <th className="border-b border-slate-200 px-3 py-2">
                  严重程度
                </th>
                <th className="border-b border-slate-200 px-3 py-2">
                  优先级
                </th>
                <th className="border-b border-slate-200 px-3 py-2">
                  置信度
                </th>
                <th className="border-b border-slate-200 px-3 py-2">
                  缺失
                </th>
                <th className="border-b border-slate-200 px-3 py-2">
                  处理状态
                </th>
                <th className="border-b border-slate-200 px-3 py-2">
                  审核状态
                </th>
                <th className="border-b border-slate-200 px-3 py-2">
                  问题单
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map(record => {
                const diagnosis =
                  record.reviewedDiagnosis ?? record.diagnosis
                const selected = record.id === selectedRecord?.id

                return (
                  <tr
                    key={record.id}
                    onClick={() => onSelectRecord(record.id)}
                    className={`cursor-pointer ${
                      selected
                        ? 'bg-blue-50'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="border-b border-slate-100 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(record.id)}
                        onChange={() => onToggleSelected(record.id)}
                        onClick={event => event.stopPropagation()}
                      />
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 font-medium">
                      {record.id}
                    </td>
                    <td className="max-w-[260px] border-b border-slate-100 px-3 py-3">
                      <span className="line-clamp-2">
                        {record.rawFeedback}
                      </span>
                      {record.errorMessage && (
                        <span className="mt-1 block text-xs text-red-600">
                          {record.errorMessage}
                        </span>
                      )}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3">
                      {diagnosis?.productModule ?? '-'}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3">
                      {diagnosis?.issueType ?? '-'}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3">
                      {diagnosis?.severitySuggestion ?? '-'}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3">
                      {diagnosis?.prioritySuggestion ?? '-'}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3">
                      {diagnosis?.confidenceLevel ?? '-'}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3">
                      {diagnosis?.missingInformation.length ?? 0}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3">
                      {record.processingStatus}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3">
                      {record.reviewStatus}
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3">
                      {record.ticketMarkdown ? '已生成' : '未生成'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRecord?.diagnosis &&
        selectedRecord.reviewedDiagnosis && (
          <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <CompactDiagnosisCard record={selectedRecord} />

            <div className="space-y-5">
              <HumanReviewForm
                original={selectedRecord.diagnosis}
                value={selectedRecord.reviewedDiagnosis}
                reviewStatus={selectedRecord.reviewStatus}
                onChange={next =>
                  onUpdateRecord(selectedRecord.id, record => ({
                    ...record,
                    reviewedDiagnosis: next,
                    reviewStatus: 'reviewing',
                    modifiedFields: getModifiedFields(
                      selectedRecord.diagnosis!,
                      next
                    ),
                    ticketMarkdown: '',
                    ticketType: null,
                    processingStatus: 'diagnosed'
                  }))
                }
                onReset={() =>
                  onUpdateRecord(selectedRecord.id, record => ({
                    ...record,
                    reviewedDiagnosis: selectedRecord.diagnosis,
                    reviewStatus: 'reviewing',
                    modifiedFields: [],
                    ticketMarkdown: '',
                    ticketType: null,
                    processingStatus: 'diagnosed'
                  }))
                }
                onConfirm={() =>
                  onUpdateRecord(selectedRecord.id, record => ({
                    ...record,
                    reviewStatus: 'confirmed',
                    modifiedFields: getModifiedFields(
                      selectedRecord.diagnosis!,
                      selectedRecord.reviewedDiagnosis!
                    ),
                    processingStatus: 'confirmed'
                  }))
                }
              />

              {selectedRecord.reviewStatus === 'confirmed' && (
                <TicketGenerator
                  key={`${selectedRecord.id}-${selectedRecord.modifiedFields.join('|')}`}
                  diagnosis={selectedRecord.reviewedDiagnosis}
                  feedbackInput={buildFeedbackInput(selectedRecord)}
                  modifiedFields={selectedRecord.modifiedFields}
                  confirmedAt={
                    selectedRecord.processedAt ||
                    new Date().toISOString()
                  }
                  onGenerated={(ticket: GeneratedTicket) =>
                    onUpdateRecord(selectedRecord.id, record => ({
                      ...record,
                      ticketType: ticket.ticketType,
                      ticketMarkdown: ticket.markdownContent
                    }))
                  }
                />
              )}
            </div>
          </div>
        )}
    </section>
  )
}

function CompactDiagnosisCard({
  record
}: {
  record: FeedbackRecord
}) {
  const diagnosis = record.reviewedDiagnosis ?? record.diagnosis

  if (!diagnosis) {
    return null
  }

  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50/40 p-5">
      <p className="text-sm font-medium text-blue-600">
        当前选中反馈
      </p>
      <h3 className="mt-1 text-lg font-semibold">
        {diagnosis.summary}
      </h3>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <SmallMetric label="产品模块" value={diagnosis.productModule} />
        <SmallMetric label="问题类型" value={diagnosis.issueType} />
        <SmallMetric
          label="严重程度"
          value={diagnosis.severitySuggestion}
        />
        <SmallMetric
          label="优先级"
          value={diagnosis.prioritySuggestion}
        />
        <SmallMetric label="置信度" value={diagnosis.confidenceLevel} />
        <SmallMetric label="Provider" value={record.provider || 'mock'} />
      </div>

      <details className="mt-4 rounded-xl border border-slate-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold">
          查看AI分析依据
        </summary>
        <div className="space-y-3 border-t border-slate-200 p-4 text-sm leading-6 text-slate-600">
          <p>
            <span className="font-medium text-slate-800">
              用户场景：
            </span>
            {diagnosis.userScenario}
          </p>
          <p>
            <span className="font-medium text-slate-800">
              实际结果：
            </span>
            {diagnosis.actualResult}
          </p>
          <p>
            <span className="font-medium text-slate-800">
              预期结果：
            </span>
            {diagnosis.expectedResult}
          </p>
          <p>
            <span className="font-medium text-slate-800">
              不确定性：
            </span>
            {diagnosis.uncertainty}
          </p>
        </div>
      </details>
    </section>
  )
}

function BatchOverview({
  overview
}: {
  overview: ReturnType<typeof buildBatchOverview>
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {Object.entries(overview).map(([label, value]) => (
        <div
          key={label}
          className="rounded-xl border border-slate-200 bg-white p-4"
        >
          <p className="text-xs text-slate-500">{label}</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">
            {value}
          </p>
        </div>
      ))}
    </div>
  )
}

function SmallMetric({
  label,
  value
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <label className="text-sm">
      <span className="mb-1 flex items-center gap-1 text-xs font-medium text-slate-500">
        <Filter className="h-3.5 w-3.5" />
        {label}
      </span>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
      >
        <option value="">全部</option>
        {options.map(option => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

function buildFeedbackInput(record: FeedbackRecord): FeedbackInput {
  return {
    feedbackText: record.rawFeedback,
    ...record.optionalContext
  }
}

function uniqueValues(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}

function buildBatchOverview(records: FeedbackRecord[]) {
  const diagnoses = records
    .map(record => record.reviewedDiagnosis ?? record.diagnosis)
    .filter(Boolean)

  return {
    总反馈数: records.length,
    成功数: records.filter(record => record.diagnosis).length,
    失败数: records.filter(
      record => record.processingStatus === 'failed'
    ).length,
    Bug数量: diagnoses.filter(
      diagnosis => diagnosis?.issueType === 'Bug'
    ).length,
    数据问题数量: diagnoses.filter(
      diagnosis =>
        diagnosis?.issueType === '地图或业务数据问题'
    ).length,
    产品需求数量: diagnoses.filter(
      diagnosis => diagnosis?.issueType === '产品需求'
    ).length,
    使用咨询数量: diagnoses.filter(
      diagnosis =>
        diagnosis?.issueType === '使用咨询或操作问题'
    ).length,
    信息不足数量: diagnoses.filter(
      diagnosis =>
        diagnosis?.issueType === '信息不足，暂时无法判断'
    ).length,
    待人工判断数量: diagnoses.filter(
      diagnosis =>
        diagnosis?.severitySuggestion === '待人工判断' ||
        diagnosis?.prioritySuggestion === '待人工判断'
    ).length,
    已确认数量: records.filter(
      record => record.reviewStatus === 'confirmed'
    ).length,
    已生成问题单数量: records.filter(
      record => record.ticketMarkdown
    ).length
  }
}
