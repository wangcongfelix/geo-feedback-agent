'use client'

import {
  IssueTypeSchema,
  PrioritySchema,
  ProductModuleSchema,
  SeveritySchema,
  type DiagnosisResult
} from '@/lib/diagnosis'
import {
  getModifiedFields,
  type ReviewableField,
  type ReviewStatus
} from '@/lib/review'
import {
  AlertTriangle,
  CheckCircle2,
  PencilLine,
  RotateCcw,
  Save,
  ShieldCheck,
  X
} from 'lucide-react'
import { useState } from 'react'

type HumanReviewFormProps = {
  original: DiagnosisResult
  value: DiagnosisResult
  reviewStatus: ReviewStatus
  onChange: (value: DiagnosisResult) => void
  onConfirm: () => void
  onReset: () => void
}

type ReviewFieldConfig = {
  field: ReviewableField
  label: string
  type: 'text' | 'select'
  options?: readonly string[]
  compact?: boolean
}

const reviewFields: ReviewFieldConfig[] = [
  { field: 'summary', label: '问题标题', type: 'text', compact: true },
  { field: 'userScenario', label: '用户场景', type: 'text' },
  {
    field: 'productModule',
    label: '产品模块',
    type: 'select',
    options: ProductModuleSchema.options,
    compact: true
  },
  {
    field: 'issueType',
    label: '问题类型',
    type: 'select',
    options: IssueTypeSchema.options,
    compact: true
  },
  {
    field: 'alternativeIssueType',
    label: '备选问题类型',
    type: 'text',
    compact: true
  },
  { field: 'actualResult', label: '实际结果', type: 'text' },
  { field: 'expectedResult', label: '预期结果', type: 'text' },
  {
    field: 'severitySuggestion',
    label: '严重程度',
    type: 'select',
    options: SeveritySchema.options,
    compact: true
  },
  {
    field: 'prioritySuggestion',
    label: '优先级',
    type: 'select',
    options: PrioritySchema.options,
    compact: true
  },
  { field: 'uncertainty', label: '不确定性', type: 'text' },
  {
    field: 'recommendedNextAction',
    label: '下一步建议',
    type: 'text'
  }
]

export default function HumanReviewForm({
  original,
  value,
  reviewStatus,
  onChange,
  onConfirm,
  onReset
}: HumanReviewFormProps) {
  const modifiedFields = getModifiedFields(original, value)
  const hasPendingJudgment =
    value.severitySuggestion === '待人工判断' ||
    value.prioritySuggestion === '待人工判断'

  function updateField<K extends ReviewableField>(
    field: K,
    nextValue: DiagnosisResult[K]
  ) {
    onChange({
      ...value,
      [field]: nextValue
    })
  }

  function isModified(field: ReviewableField) {
    return modifiedFields.includes(field)
  }

  return (
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-5">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div>
          <div className="flex items-center gap-2">
            <PencilLine className="h-5 w-5 text-emerald-700" />

            <h2 className="text-xl font-semibold text-slate-900">
              产品经理审核
            </h2>
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            字段已由AI预填。可以直接确认，也可以只展开需要修正的卡片。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 xl:justify-end">
          <ReviewStatusBadge status={reviewStatus} />

          <button
            type="button"
            disabled={reviewStatus === 'confirmed'}
            onClick={onConfirm}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
          >
            <CheckCircle2 className="h-4 w-4" />
            {reviewStatus === 'confirmed'
              ? '已确认'
              : '接受全部AI建议并确认'}
          </button>
        </div>
      </div>

      {hasPendingJudgment && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

            <p className="text-sm leading-6 text-amber-800">
              当前信息不足，可保留待人工判断后继续生成问题单。
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3">
        <p className="text-sm text-slate-600">
          当前人工修改了
          <span className="mx-1 font-semibold text-emerald-700">
            {modifiedFields.length}
          </span>
          个字段
        </p>

        {modifiedFields.length > 0 && (
          <p className="text-xs text-slate-500">
            {modifiedFields.join('、')}
          </p>
        )}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {reviewFields.map(config => (
          <ReviewFieldCard
            key={config.field}
            config={config}
            value={String(value[config.field])}
            modified={isModified(config.field)}
            onSave={next =>
              updateField(
                config.field,
                next as DiagnosisResult[typeof config.field]
              )
            }
          />
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

          <p className="text-sm leading-6 text-amber-800">
            确认只代表产品经理已经审核当前诊断结果，不代表问题已经完成技术排查或进入研发排期。
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onReset}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <RotateCcw className="h-4 w-4" />
          恢复AI原始结果
        </button>

        <button
          type="button"
          disabled={reviewStatus === 'confirmed'}
          onClick={onConfirm}
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
        >
          <CheckCircle2 className="h-4 w-4" />

          {reviewStatus === 'confirmed'
            ? '已完成审核确认'
            : '确认审核结果'}
        </button>
      </div>
    </section>
  )
}

function ReviewFieldCard({
  config,
  value,
  modified,
  onSave
}: {
  config: ReviewFieldConfig
  value: string
  modified: boolean
  onSave: (value: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  function startEdit() {
    setDraft(value)
    setEditing(true)
  }

  function cancelEdit() {
    setDraft(value)
    setEditing(false)
  }

  function saveEdit() {
    onSave(draft)
    setEditing(false)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold text-slate-500">
              {config.label}
            </p>

            {modified && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                已人工修改
              </span>
            )}
          </div>

          {!editing && (
            <p
              className={`mt-2 text-sm leading-6 text-slate-800 ${
                config.compact ? 'line-clamp-2' : 'line-clamp-3'
              }`}
            >
              {value || '待补充'}
            </p>
          )}
        </div>

        {!editing && (
          <button
            type="button"
            onClick={startEdit}
            className="shrink-0 rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            编辑
          </button>
        )}
      </div>

      {editing && (
        <div className="mt-3 space-y-3">
          {config.type === 'select' ? (
            <select
              value={draft}
              onChange={event => setDraft(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            >
              {config.options?.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <textarea
              value={draft}
              rows={config.compact ? 3 : 5}
              onChange={event => setDraft(event.target.value)}
              className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={cancelEdit}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <X className="h-3.5 w-3.5" />
              取消
            </button>

            <button
              type="button"
              onClick={saveEdit}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Save className="h-3.5 w-3.5" />
              保存
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ReviewStatusBadge({
  status
}: {
  status: ReviewStatus
}) {
  const statusConfig = {
    not_reviewed: {
      text: '未审核',
      className:
        'border-slate-200 bg-slate-100 text-slate-600'
    },
    reviewing: {
      text: '审核中',
      className:
        'border-amber-200 bg-amber-50 text-amber-700'
    },
    confirmed: {
      text: '已确认',
      className:
        'border-emerald-200 bg-emerald-100 text-emerald-700'
    }
  }

  const current = statusConfig[status]

  return (
    <span
      className={`w-fit rounded-full border px-3 py-1 text-xs font-medium ${current.className}`}
    >
      {current.text}
    </span>
  )
}
