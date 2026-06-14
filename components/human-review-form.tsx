'use client'

import {
  IssueTypeSchema,
  ProductModuleSchema,
  type DiagnosisResult
} from '@/lib/diagnosis'
import {
  displayPrioritySuggestion,
  displayIssueType,
  priorityTone,
  reviewStatusLabel,
  reviewStatusTone
} from '@/lib/display-labels'
import {
  getModifiedFields,
  type ReviewableField,
  type ReviewStatus
} from '@/lib/review'
import {
  CheckCircle2,
  PencilLine,
  RotateCcw,
  Save,
  ShieldCheck,
  X
} from 'lucide-react'
import { useState } from 'react'
import StatusBadge from './status-badge'

type HumanReviewFormProps = {
  original: DiagnosisResult
  value: DiagnosisResult
  reviewStatus: ReviewStatus
  onChange: (value: DiagnosisResult) => void
  onConfirm: () => void
  onReset: () => void
}

type ReviewFieldConfig = {
  field:
    | 'summary'
    | 'productModule'
    | 'issueType'
    | 'prioritySuggestion'
    | 'recommendedNextAction'
  label: string
  type: 'text' | 'select'
  options?: readonly string[]
  compact?: boolean
}

const reviewFields: ReviewFieldConfig[] = [
  { field: 'summary', label: '问题摘要', type: 'text', compact: true },
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
    options: IssueTypeSchema.options.filter(
      option => option !== '信息不足，暂时无法判断'
    ),
    compact: true
  },
  {
    field: 'prioritySuggestion',
    label: '处理优先级',
    type: 'select',
    options: ['P0', 'P1', 'P2', 'P3'],
    compact: true
  },
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
  function updateField<K extends keyof DiagnosisResult>(
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
          <StatusBadge
            label={reviewStatusLabel(reviewStatus)}
            tone={reviewStatusTone(reviewStatus)}
          />

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
            displayValue={
              config.field === 'issueType'
                ? displayIssueType(String(value[config.field]))
                : String(value[config.field])
            }
            modified={isModified(config.field)}
            onSave={next =>
              updateField(
                config.field,
                next as DiagnosisResult[typeof config.field]
              )
            }
          />
        ))}
        <ProblemDescriptionCard
          actualResult={value.actualResult}
          expectedResult={value.expectedResult}
          actualModified={isModified('actualResult')}
          expectedModified={isModified('expectedResult')}
          onSave={(actualResult, expectedResult) =>
            onChange({
              ...value,
              actualResult,
              expectedResult
            })
          }
        />
        <MissingInformationCard
          items={value.missingInformation}
        />
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

function ProblemDescriptionCard({
  actualResult,
  expectedResult,
  actualModified,
  expectedModified,
  onSave
}: {
  actualResult: string
  expectedResult: string
  actualModified: boolean
  expectedModified: boolean
  onSave: (actualResult: string, expectedResult: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [actualDraft, setActualDraft] = useState(actualResult)
  const [expectedDraft, setExpectedDraft] = useState(expectedResult)
  const modified = actualModified || expectedModified

  function startEdit() {
    setActualDraft(actualResult)
    setExpectedDraft(expectedResult)
    setEditing(true)
  }

  function cancelEdit() {
    setActualDraft(actualResult)
    setExpectedDraft(expectedResult)
    setEditing(false)
  }

  function saveEdit() {
    onSave(actualDraft, expectedDraft)
    setEditing(false)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold text-slate-500">
              问题描述
            </p>
            {modified && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                已人工修改
              </span>
            )}
          </div>

          {!editing && (
            <div className="mt-2 space-y-1 text-sm leading-6 text-slate-800">
              <p className="line-clamp-2">
                <span className="font-medium">实际情况：</span>
                {actualResult || '待补充'}
              </p>
              <p className="line-clamp-2">
                <span className="font-medium">期望效果：</span>
                {expectedResult || '待补充'}
              </p>
            </div>
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
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">
              实际情况
            </span>
            <textarea
              value={actualDraft}
              rows={4}
              onChange={event => setActualDraft(event.target.value)}
              className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">
              期望效果
            </span>
            <textarea
              value={expectedDraft}
              rows={4}
              onChange={event => setExpectedDraft(event.target.value)}
              className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm leading-6 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          </label>

          <CardActions onCancel={cancelEdit} onSave={saveEdit} />
        </div>
      )}
    </div>
  )
}

function MissingInformationCard({
  items
}: {
  items: DiagnosisResult['missingInformation']
}) {
  return (
    <details className="rounded-xl border border-slate-200 bg-white p-4">
      <summary className="cursor-pointer list-none">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-500">
              待补充信息
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-800">
              待补充 {items.length} 项
            </p>
          </div>
          <span className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700">
            查看
          </span>
        </div>
      </summary>

      <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">
            暂无待补充信息。
          </p>
        ) : (
          items.map((item, index) => (
            <div
              key={`${item.field}-${index}`}
              className="rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600"
            >
              <p className="font-medium text-slate-800">
                {item.field}
              </p>
              <p>状态：{item.status}</p>
              <p>原因：{item.reason}</p>
            </div>
          ))
        )}
      </div>
    </details>
  )
}

function ReviewFieldCard({
  config,
  value,
  displayValue,
  modified,
  onSave
}: {
  config: ReviewFieldConfig
  value: string
  displayValue: string
  modified: boolean
  onSave: (value: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  function startEdit() {
    setDraft(
      config.field === 'issueType' &&
        value === '信息不足，暂时无法判断'
        ? '使用咨询或操作问题'
        : value
    )
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
            config.field === 'prioritySuggestion' ? (
              <div className="mt-2">
                <StatusBadge
                  label={
                    displayPrioritySuggestion(displayValue) ||
                    '待补充'
                  }
                  tone={priorityTone(displayValue)}
                />
              </div>
            ) : (
              <p
                className={`mt-2 text-sm leading-6 text-slate-800 ${
                  config.compact ? 'line-clamp-2' : 'line-clamp-3'
                }`}
              >
                {displayValue || '待补充'}
              </p>
            )
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
                  {config.field === 'issueType'
                    ? displayIssueType(option)
                    : config.field === 'prioritySuggestion' &&
                        option === 'P0'
                      ? 'P0（仅人工用于最高紧急情况）'
                    : option}
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
            <CardActions onCancel={cancelEdit} onSave={saveEdit} />
          </div>
        </div>
      )}
    </div>
  )
}

function CardActions({
  onCancel,
  onSave
}: {
  onCancel: () => void
  onSave: () => void
}) {
  return (
    <div className="flex justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        <X className="h-3.5 w-3.5" />
        取消
      </button>

      <button
        type="button"
        onClick={onSave}
        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
      >
        <Save className="h-3.5 w-3.5" />
        保存
      </button>
    </div>
  )
}
