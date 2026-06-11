'use client'

import HumanReviewForm from '@/components/human-review-form'
import TicketGenerator from '@/components/ticket-generator'
import {
  createReviewedDiagnosis,
  getModifiedFields,
  type ReviewStatus
} from '@/lib/review'

import type {
  DiagnosisResult,
  FeedbackInput
} from '@/lib/diagnosis'
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  LoaderCircle,
  MapPinned,
  RefreshCw,
  ShieldCheck,
  Sparkles
} from 'lucide-react'
import { useState } from 'react'

const productTypes = [
  '地图App',
  '导航与出行',
  '航旅信息',
  '智能交通',
  'GIS或地图数据平台',
  '其他',
  '未知'
]

const exampleFeedback =
  '开车去机场时，导航一直让我走一条已经封闭的路，重新规划后还是走这里。'

type DiagnoseApiResponse =
  | {
    success: true
    data: DiagnosisResult
    meta?: {
      provider?: string
      model?: string
      promptVersion?: string
    }
  }
  | {
    success: false
    error: {
      code: string
      message: string
    }
  }

export default function GeoFeedbackPage() {
  const [feedbackText, setFeedbackText] = useState('')
  const [productName, setProductName] = useState('')
  const [productType, setProductType] = useState('')
  const [deviceInfo, setDeviceInfo] = useState('')
  const [appVersion, setAppVersion] = useState('')
  const [occurredAt, setOccurredAt] = useState('')
  const [location, setLocation] = useState('')
  const [additionalContext, setAdditionalContext] = useState('')

  const [diagnosis, setDiagnosis] =
    useState<DiagnosisResult | null>(null)
  const [reviewedDiagnosis, setReviewedDiagnosis] =
    useState<DiagnosisResult | null>(null)

  const [reviewStatus, setReviewStatus] =
    useState<ReviewStatus>('not_reviewed')
  const [confirmedReview, setConfirmedReview] =
    useState<{
      modifiedFields: string[]
      confirmedAt: string
    } | null>(null)
  const [provider, setProvider] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const canDiagnose =
    feedbackText.trim().length > 0 && !loading

  const currentFeedbackInput: FeedbackInput = {
    feedbackText,
    productName,
    productType,
    deviceInfo,
    appVersion,
    occurredAt,
    location,
    additionalContext
  }

  const markDiagnosisOutdated = () => {
    if (diagnosis) {
      setDiagnosis(null)
      setReviewedDiagnosis(null)
      setReviewStatus('not_reviewed')
      setConfirmedReview(null)
      setProvider('')
    }

    setErrorMessage('')
  }

  const handleUseExample = () => {
    setFeedbackText(exampleFeedback)
    setProductType('导航与出行')
    setDiagnosis(null)
    setReviewedDiagnosis(null)
    setReviewStatus('not_reviewed')
    setConfirmedReview(null)
    setProvider('')
    setErrorMessage('')
  }
const handleDiagnose = async () => {
  if (!canDiagnose) return

  const input: FeedbackInput = {
    feedbackText,
    productName,
    productType,
    deviceInfo,
    appVersion,
    occurredAt,
    location,
    additionalContext
  }

  setLoading(true)
  setErrorMessage('')
  setDiagnosis(null)
  setReviewedDiagnosis(null)
  setReviewStatus('not_reviewed')
  setConfirmedReview(null)
  setProvider('')

  try {
    const response = await fetch('/api/diagnose', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    })

    const result =
      (await response.json()) as DiagnoseApiResponse

    if (!response.ok || !result.success) {
      const message = result.success
        ? '诊断请求失败，请稍后重试'
        : result.error.message

      throw new Error(message)
    }

    setDiagnosis(result.data)

    setReviewedDiagnosis(
      createReviewedDiagnosis(result.data)
    )

    setReviewStatus('reviewing')
    setProvider(result.meta?.provider ?? '')
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : '诊断请求失败，请稍后重试'

    setErrorMessage(message)
  } finally {
    setLoading(false)
  }
}

return (
  <main className="min-h-screen bg-slate-50 text-slate-900">
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
            <MapPinned className="h-5 w-5" />
          </div>

          <div>
            <h1 className="text-lg font-semibold">
              GeoFeedback Agent
            </h1>
            <p className="text-sm text-slate-500">
              地图产品用户反馈诊断助手
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
            Prompt V1
          </span>

          <span className="hidden items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 sm:flex">
            <ShieldCheck className="h-3.5 w-3.5" />
            AI建议需人工确认
          </span>
        </div>
      </div>
    </header>

    <div className="mx-auto grid max-w-[1440px] gap-6 p-6 lg:grid-cols-[minmax(360px,0.85fr)_minmax(0,1.35fr)]">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">
            输入用户反馈
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            粘贴一条地图、出行、航旅或GIS产品反馈。只有反馈原文为必填项。
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="feedbackText"
                className="text-sm font-medium text-slate-700"
              >
                用户反馈原文
                <span className="ml-1 text-red-500">*</span>
              </label>

              <span className="text-xs text-slate-400">
                {feedbackText.length} 字
              </span>
            </div>

            <textarea
              id="feedbackText"
              value={feedbackText}
              onChange={event => {
                setFeedbackText(event.target.value)
                markDiagnosisOutdated()
              }}
              rows={7}
              placeholder="例如：开车去机场时，导航一直让我走一条已经封闭的路，重新规划后还是走这里。"
              className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />

            {feedbackText.length > 0 &&
              feedbackText.trim().length < 10 && (
                <div className="mt-2 flex items-start gap-2 text-xs text-amber-700">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  当前反馈信息较少，AI可能只能判断为“信息不足”。
                </div>
              )}

            <button
              type="button"
              onClick={handleUseExample}
              className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              使用演示案例
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="productName"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                产品名称
                <span className="ml-1 font-normal text-slate-400">
                  可选
                </span>
              </label>

              <input
                id="productName"
                value={productName}
                onChange={event => {
                  setProductName(event.target.value)
                  markDiagnosisOutdated()
                }}
                placeholder="例如：某地图App"
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="productType"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                产品类型
                <span className="ml-1 font-normal text-slate-400">
                  可选
                </span>
              </label>

              <select
                id="productType"
                value={productType}
                onChange={event => {
                  setProductType(event.target.value)
                  markDiagnosisOutdated()
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">请选择产品类型</option>

                {productTypes.map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <details className="rounded-xl border border-slate-200 bg-slate-50">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700">
              补充使用环境（可选）
            </summary>

            <div className="grid gap-4 border-t border-slate-200 p-4 sm:grid-cols-2">
              <EnvironmentInput
                id="deviceInfo"
                label="设备与操作系统"
                value={deviceInfo}
                placeholder="例如：iPhone 15 / iOS 18"
                onChange={value => {
                  setDeviceInfo(value)
                  markDiagnosisOutdated()
                }}
              />

              <EnvironmentInput
                id="appVersion"
                label="产品版本"
                value={appVersion}
                placeholder="例如：12.3.0"
                onChange={value => {
                  setAppVersion(value)
                  markDiagnosisOutdated()
                }}
              />

              <EnvironmentInput
                id="occurredAt"
                label="发生时间"
                value={occurredAt}
                placeholder="例如：2026-06-10 08:30"
                onChange={value => {
                  setOccurredAt(value)
                  markDiagnosisOutdated()
                }}
              />

              <EnvironmentInput
                id="location"
                label="发生地点"
                value={location}
                placeholder="例如：机场高速某路段"
                onChange={value => {
                  setLocation(value)
                  markDiagnosisOutdated()
                }}
              />

              <div className="sm:col-span-2">
                <label
                  htmlFor="additionalContext"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  其他补充信息
                </label>

                <textarea
                  id="additionalContext"
                  value={additionalContext}
                  onChange={event => {
                    setAdditionalContext(event.target.value)
                    markDiagnosisOutdated()
                  }}
                  rows={3}
                  placeholder="例如：是否可以稳定复现、网络状态、定位权限等"
                  className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>
            </div>
          </details>

          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-5 w-5 text-slate-400" />

              <div>
                <p className="text-sm font-medium text-slate-700">
                  问题截图
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  MVP先完成文本诊断。截图上传与多模态理解将在后续阶段接入。
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled
              className="mt-4 w-full cursor-not-allowed rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-400"
            >
              截图上传暂未开放
            </button>
          </div>

          <button
            type="button"
            disabled={!canDiagnose}
            onClick={handleDiagnose}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {loading ? (
              <>
                <LoaderCircle className="h-4 w-4 animate-spin" />
                正在诊断…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                开始诊断
              </>
            )}
          </button>

          <p className="text-center text-xs text-slate-400">
            当前使用 Mock 模式验证流程，尚未调用真实模型。
          </p>
        </div>
      </section>

      <section className="min-h-[680px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? (
          <LoadingDiagnosisState />
        ) : errorMessage ? (
          <ErrorDiagnosisState
            message={errorMessage}
            onRetry={handleDiagnose}
          />
        ) : diagnosis && reviewedDiagnosis ? (
          <div className="space-y-8">
            <DiagnosisResultState
              diagnosis={diagnosis}
              provider={provider}
            />

            <HumanReviewForm
              original={diagnosis}
              value={reviewedDiagnosis}
              reviewStatus={reviewStatus}
              onChange={nextValue => {
                setReviewedDiagnosis(nextValue)
                setReviewStatus('reviewing')
                setConfirmedReview(null)
              }}
              onReset={() => {
                setReviewedDiagnosis(
                  createReviewedDiagnosis(diagnosis)
                )
                setReviewStatus('reviewing')
                setConfirmedReview(null)
              }}
              onConfirm={() => {
                setConfirmedReview({
                  modifiedFields: getModifiedFields(
                    diagnosis,
                    reviewedDiagnosis
                  ),
                  confirmedAt: new Date().toISOString()
                })
                setReviewStatus('confirmed')
              }}
            />

            {reviewStatus === 'confirmed' &&
              confirmedReview && (
                <TicketGenerator
                  key={confirmedReview.confirmedAt}
                  diagnosis={reviewedDiagnosis}
                  feedbackInput={currentFeedbackInput}
                  modifiedFields={
                    confirmedReview.modifiedFields
                  }
                  confirmedAt={confirmedReview.confirmedAt}
                />
              )}
          </div>
        ) : (
          <EmptyDiagnosisState />
        )}
      </section>
    </div>
  </main>
)
}

type EnvironmentInputProps = {
  id: string
  label: string
  value: string
  placeholder: string
  onChange: (value: string) => void
}

function EnvironmentInput({
  id,
  label,
  value,
  placeholder,
  onChange
}: EnvironmentInputProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>

      <input
        id={id}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      />
    </div>
  )
}

function EmptyDiagnosisState() {
  const items = [
    '用户使用场景',
    '产品模块',
    '问题类型',
    '缺失信息',
    '问题单草稿'
  ]

  return (
    <div className="flex h-full min-h-[620px] flex-col items-center justify-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        <Sparkles className="h-7 w-7" />
      </div>

      <h2 className="mt-5 text-xl font-semibold">
        等待诊断
      </h2>

      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        AI将从用户场景、产品模块、问题类型、缺失信息和优先级等维度提供初步判断。
      </p>

      <div className="mt-8 grid w-full max-w-xl gap-3 sm:grid-cols-2">
        {items.map(item => (
          <div
            key={item}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-left"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="text-sm text-slate-600">
              {item}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
        <ShieldCheck className="h-4 w-4" />
        所有判断都需要产品经理人工确认
      </div>
    </div>
  )
}

function LoadingDiagnosisState() {
  const steps = [
    '正在理解用户场景',
    '正在识别产品模块',
    '正在判断问题类型',
    '正在检查缺失信息',
    '正在生成诊断建议'
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
        <LoaderCircle className="h-5 w-5 animate-spin text-blue-600" />

        <div>
          <p className="font-medium text-blue-900">
            正在诊断用户反馈
          </p>
          <p className="mt-1 text-sm text-blue-700">
            请稍候，不要重复点击诊断按钮。
          </p>
        </div>
      </div>

      {steps.map(step => (
        <div
          key={step}
          className="h-16 animate-pulse rounded-xl bg-slate-100"
        />
      ))}
    </div>
  )
}

function ErrorDiagnosisState({
  message,
  onRetry
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="flex min-h-[620px] flex-col items-center justify-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
        <AlertCircle className="h-7 w-7" />
      </div>

      <h2 className="mt-5 text-xl font-semibold">
        诊断失败
      </h2>

      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        {message}
      </p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-6 flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
      >
        <RefreshCw className="h-4 w-4" />
        重新诊断
      </button>
    </div>
  )
}

function DiagnosisResultState({
  diagnosis,
  provider
}: {
  diagnosis: DiagnosisResult
  provider: string
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="text-sm font-medium text-blue-600">
            AI初步诊断
          </p>

          <h2 className="mt-1 text-2xl font-semibold">
            {diagnosis.summary}
          </h2>
        </div>

        {provider && (
          <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
            Provider：{provider}
          </span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewItem
          label="产品模块"
          value={diagnosis.productModule}
        />
        <OverviewItem
          label="问题类型"
          value={diagnosis.issueType}
        />
        <OverviewItem
          label="严重程度"
          value={diagnosis.severitySuggestion}
        />
        <OverviewItem
          label="优先级"
          value={diagnosis.prioritySuggestion}
        />
      </div>

      <InfoCard title="用户使用场景">
        <p>{diagnosis.userScenario}</p>
      </InfoCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <InfoCard title="实际结果">
          <p>{diagnosis.actualResult}</p>
        </InfoCard>

        <InfoCard title="预期结果">
          <p>{diagnosis.expectedResult}</p>
        </InfoCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <StringListCard
          title="用户明确提供的事实"
          items={diagnosis.userFacts}
          emptyText="当前没有提取到明确事实"
        />

        <StringListCard
          title="AI推测"
          items={diagnosis.aiInferences}
          emptyText="当前没有需要展示的推测"
          warning
        />
      </div>

      <StringListCard
        title="用户原话证据"
        items={diagnosis.evidenceQuotes}
        emptyText="当前没有可引用的用户原话"
      />

      <InfoCard title="备选问题类型">
        <p>{diagnosis.alternativeIssueType}</p>
      </InfoCard>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">
            缺失信息检查
          </h3>

          <span className="text-xs text-slate-400">
            共 {diagnosis.missingInformation.length} 项
          </span>
        </div>

        <div className="space-y-3">
          {diagnosis.missingInformation.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              当前没有识别到需要补充的信息。
            </div>
          ) : (
            diagnosis.missingInformation.map(
              (item, index) => (
                <div
                  key={`${item.field}-${index}`}
                  className="rounded-xl border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-slate-800">
                      {item.field}
                    </p>

                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                      {item.status}
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {item.reason}
                  </p>

                  {item.value && (
                    <p className="mt-2 text-sm text-slate-700">
                      当前值：{item.value}
                    </p>
                  )}
                </div>
              )
            )
          )}
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h3 className="font-semibold text-amber-900">
          不确定性说明
        </h3>

        <p className="mt-2 text-sm leading-6 text-amber-800">
          {diagnosis.uncertainty}
        </p>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
        <h3 className="font-semibold text-blue-900">
          建议下一步
        </h3>

        <p className="mt-2 text-sm leading-6 text-blue-800">
          {diagnosis.recommendedNextAction}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5 text-xs text-slate-500">
        <span>
          判断置信度：{diagnosis.confidenceLevel}
        </span>

        <span>
          Prompt版本：{diagnosis.promptVersion}
        </span>
      </div>

      <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-600">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        当前内容是AI初步建议，请以产品经理人工审核后的确认结果生成问题单。
      </div>
    </div>
  )
}

function OverviewItem({
  label,
  value
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  )
}

function InfoCard({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-slate-200 p-5">
      <h3 className="font-semibold">{title}</h3>

      <div className="mt-3 text-sm leading-7 text-slate-600">
        {children}
      </div>
    </div>
  )
}

function StringListCard({
  title,
  items,
  emptyText,
  warning = false
}: {
  title: string
  items: string[]
  emptyText: string
  warning?: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${warning
        ? 'border-amber-200 bg-amber-50'
        : 'border-slate-200 bg-white'
        }`}
    >
      <h3
        className={`font-semibold ${warning ? 'text-amber-900' : ''
          }`}
      >
        {title}
      </h3>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          {emptyText}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item, index) => (
            <li
              key={`${item}-${index}`}
              className="flex items-start gap-2 text-sm leading-6 text-slate-600"
            >
              <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
