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
  CheckCircle2,
  PencilLine,
  RotateCcw,
  ShieldCheck
} from 'lucide-react'

type HumanReviewFormProps = {
  original: DiagnosisResult
  value: DiagnosisResult
  reviewStatus: ReviewStatus
  onChange: (value: DiagnosisResult) => void
  onConfirm: () => void
  onReset: () => void
}

export default function HumanReviewForm({
  original,
  value,
  reviewStatus,
  onChange,
  onConfirm,
  onReset
}: HumanReviewFormProps) {
  const modifiedFields = getModifiedFields(original, value)

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
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="flex items-center gap-2">
            <PencilLine className="h-5 w-5 text-emerald-700" />

            <h2 className="text-xl font-semibold text-slate-900">
              产品经理审核
            </h2>
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            以下字段可以人工修改。最终结果以产品经理确认内容为准。
          </p>
        </div>

        <ReviewStatusBadge status={reviewStatus} />
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

      <div className="mt-6 space-y-5">
        <EditableTextArea
          label="问题标题"
          value={value.summary}
          modified={isModified('summary')}
          rows={2}
          onChange={next =>
            updateField('summary', next)
          }
        />

        <EditableTextArea
          label="用户使用场景"
          value={value.userScenario}
          modified={isModified('userScenario')}
          rows={3}
          onChange={next =>
            updateField('userScenario', next)
          }
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <EditableSelect
            label="产品模块"
            value={value.productModule}
            options={ProductModuleSchema.options}
            modified={isModified('productModule')}
            onChange={next =>
              updateField(
                'productModule',
                next as DiagnosisResult['productModule']
              )
            }
          />

          <EditableSelect
            label="问题类型"
            value={value.issueType}
            options={IssueTypeSchema.options}
            modified={isModified('issueType')}
            onChange={next =>
              updateField(
                'issueType',
                next as DiagnosisResult['issueType']
              )
            }
          />
        </div>

        <EditableTextArea
          label="备选问题类型"
          value={value.alternativeIssueType}
          modified={isModified('alternativeIssueType')}
          rows={2}
          onChange={next =>
            updateField('alternativeIssueType', next)
          }
        />

        <div className="grid gap-4 lg:grid-cols-2">
          <EditableTextArea
            label="实际结果"
            value={value.actualResult}
            modified={isModified('actualResult')}
            rows={4}
            onChange={next =>
              updateField('actualResult', next)
            }
          />

          <EditableTextArea
            label="预期结果"
            value={value.expectedResult}
            modified={isModified('expectedResult')}
            rows={4}
            onChange={next =>
              updateField('expectedResult', next)
            }
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <EditableSelect
            label="严重程度"
            value={value.severitySuggestion}
            options={SeveritySchema.options}
            modified={isModified('severitySuggestion')}
            onChange={next =>
              updateField(
                'severitySuggestion',
                next as DiagnosisResult['severitySuggestion']
              )
            }
          />

          <EditableSelect
            label="优先级"
            value={value.prioritySuggestion}
            options={PrioritySchema.options}
            modified={isModified('prioritySuggestion')}
            onChange={next =>
              updateField(
                'prioritySuggestion',
                next as DiagnosisResult['prioritySuggestion']
              )
            }
          />
        </div>

        <EditableTextArea
          label="不确定性说明"
          value={value.uncertainty}
          modified={isModified('uncertainty')}
          rows={3}
          onChange={next =>
            updateField('uncertainty', next)
          }
        />

        <EditableTextArea
          label="建议下一步"
          value={value.recommendedNextAction}
          modified={isModified('recommendedNextAction')}
          rows={3}
          onChange={next =>
            updateField('recommendedNextAction', next)
          }
        />
      </div>

      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

          <p className="text-sm leading-6 text-amber-800">
            确认操作只代表产品经理已经审核当前诊断结果，
            不代表问题已经完成技术排查或进入研发排期。
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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

type EditableTextAreaProps = {
  label: string
  value: string
  modified: boolean
  rows: number
  onChange: (value: string) => void
}

function EditableTextArea({
  label,
  value,
  modified,
  rows,
  onChange
}: EditableTextAreaProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-slate-700">
          {label}
        </label>

        {modified && (
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
            已人工修改
          </span>
        )}
      </div>

      <textarea
        value={value}
        rows={rows}
        onChange={event => onChange(event.target.value)}
        className="w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
      />
    </div>
  )
}

type EditableSelectProps = {
  label: string
  value: string
  options: readonly string[]
  modified: boolean
  onChange: (value: string) => void
}

function EditableSelect({
  label,
  value,
  options,
  modified,
  onChange
}: EditableSelectProps) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-slate-700">
          {label}
        </label>

        {modified && (
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
            已人工修改
          </span>
        )}
      </div>

      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
      >
        {options.map(option => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  )
}