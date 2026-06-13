'use client'

import FeedbackBatchTable from '@/components/feedback-batch-table'
import HumanReviewForm from '@/components/human-review-form'
import StatusBadge from '@/components/status-badge'
import TicketGenerator from '@/components/ticket-generator'
import type {
  DiagnosisResult,
  FeedbackInput
} from '@/lib/diagnosis'
import {
  displayIssueType,
  priorityTone
} from '@/lib/display-labels'
import type { FeedbackRecord } from '@/lib/feedback-record'
import {
  createReviewedDiagnosis,
  getModifiedFields,
  type ReviewStatus
} from '@/lib/review'
import {
  AlertCircle,
  CheckCircle2,
  ImageIcon,
  Layers3,
  LoaderCircle,
  MapPinned,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type WorkMode = 'single' | 'batch'

type DiagnoseApiResponse =
  | {
      success: true
      data: DiagnosisResult
      meta?: {
        provider?: string
        model?: string
        promptVersion?: string
        guardrailApplied?: boolean
      }
    }
  | {
      success: false
      error: {
        code: string
        message: string
      }
    }

type ScreenshotAttachment = {
  name: string
  size: number
  previewUrl: string
}

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

const screenshotTypes = [
  'image/png',
  'image/jpeg',
  'image/webp'
]
const screenshotMaxSizeBytes = 5 * 1024 * 1024
const batchDelayMs = 1000

export default function GeoFeedbackPage() {
  const [mode, setMode] = useState<WorkMode>('single')
  const [feedbackText, setFeedbackText] = useState('')
  const [batchText, setBatchText] = useState('')
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
  const [model, setModel] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [screenshotAttachment, setScreenshotAttachment] =
    useState<ScreenshotAttachment | null>(null)
  const [screenshotError, setScreenshotError] = useState('')

  const [batchRecords, setBatchRecords] = useState<
    FeedbackRecord[]
  >([])
  const [selectedRecordId, setSelectedRecordId] = useState('')
  const [selectedRecordIds, setSelectedRecordIds] = useState<
    string[]
  >([])
  const [batchProcessing, setBatchProcessing] = useState(false)
  const [batchProgress, setBatchProgress] = useState({
    current: 0,
    total: 0
  })
  const [batchMessage, setBatchMessage] = useState('')
  const cancelBatchRef = useRef(false)

  const optionalContext = {
    productName,
    productType,
    deviceInfo,
    appVersion,
    occurredAt,
    location,
    additionalContext
  }
  const currentFeedbackInput: FeedbackInput = {
    feedbackText,
    ...optionalContext
  }
  const attachmentNames = screenshotAttachment
    ? [screenshotAttachment.name]
    : []
  const batchLines = parseBatchLines(batchText)
  const canDiagnose =
    feedbackText.trim().length > 0 && !loading
  const canStartBatch =
    batchLines.length > 0 && !batchProcessing

  useEffect(() => {
    return () => {
      if (screenshotAttachment) {
        URL.revokeObjectURL(screenshotAttachment.previewUrl)
      }
    }
  }, [screenshotAttachment])

  function markDiagnosisOutdated() {
    if (diagnosis) {
      setDiagnosis(null)
      setReviewedDiagnosis(null)
      setReviewStatus('not_reviewed')
      setConfirmedReview(null)
      setProvider('')
      setModel('')
    }

    setErrorMessage('')
  }

  function handleUseExample() {
    setFeedbackText(exampleFeedback)
    setProductType('导航与出行')
    setDiagnosis(null)
    setReviewedDiagnosis(null)
    setReviewStatus('not_reviewed')
    setConfirmedReview(null)
    setProvider('')
    setModel('')
    setErrorMessage('')
  }

  async function diagnoseFeedback(input: FeedbackInput) {
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

    return result
  }

  async function handleDiagnose() {
    if (!canDiagnose) return

    setLoading(true)
    setErrorMessage('')
    setDiagnosis(null)
    setReviewedDiagnosis(null)
    setReviewStatus('not_reviewed')
    setConfirmedReview(null)
    setProvider('')
    setModel('')

    try {
      const result = await diagnoseFeedback(currentFeedbackInput)

      setDiagnosis(result.data)
      setReviewedDiagnosis(createReviewedDiagnosis(result.data))
      setReviewStatus('reviewing')
      setProvider(result.meta?.provider ?? '')
      setModel(result.meta?.model ?? '')
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : '诊断请求失败，请稍后重试'
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleStartBatch() {
    if (!canStartBatch) return

    const lines = batchLines.slice(0, 20)
    const createdAt = new Date().toISOString()
    const initialRecords = lines.map((line, index) =>
      createPendingRecord({
        index,
        rawFeedback: line,
        optionalContext,
        createdAt
      })
    )

    cancelBatchRef.current = false
    setBatchRecords(initialRecords)
    setSelectedRecordId(initialRecords[0]?.id ?? '')
    setSelectedRecordIds([])
    setBatchProcessing(true)
    setBatchProgress({
      current: 0,
      total: initialRecords.length
    })
    setBatchMessage('')

    for (let index = 0; index < initialRecords.length; index += 1) {
      if (cancelBatchRef.current) {
        setBatchMessage('已取消尚未开始的批量诊断。')
        break
      }

      if (index > 0) {
        await wait(batchDelayMs)
      }

      const record = initialRecords[index]
      const input: FeedbackInput = {
        feedbackText: record.rawFeedback,
        ...record.optionalContext
      }

      setBatchProgress({
        current: index + 1,
        total: initialRecords.length
      })
      updateBatchRecord(record.id, current => ({
        ...current,
        processingStatus: 'processing',
        errorMessage: ''
      }))

      try {
        const result = await diagnoseFeedback(input)
        const reviewed = createReviewedDiagnosis(result.data)

        updateBatchRecord(record.id, current => ({
          ...current,
          diagnosis: result.data,
          reviewedDiagnosis: reviewed,
          reviewStatus: 'reviewing',
          modifiedFields: [],
          processingStatus: 'diagnosed',
          processedAt: new Date().toISOString(),
          provider: result.meta?.provider ?? '',
          model: result.meta?.model ?? ''
        }))
      } catch (error) {
        updateBatchRecord(record.id, current => ({
          ...current,
          processingStatus: 'failed',
          errorMessage:
            error instanceof Error
              ? error.message
              : '诊断失败',
          processedAt: new Date().toISOString()
        }))
      }
    }

    setBatchProcessing(false)
  }

  function handleCancelBatch() {
    cancelBatchRef.current = true
  }

  function updateBatchRecord(
    id: string,
    updater: (record: FeedbackRecord) => FeedbackRecord
  ) {
    setBatchRecords(records =>
      records.map(record =>
        record.id === id ? updater(record) : record
      )
    )
  }

  function handleToggleSelectedRecord(id: string) {
    setSelectedRecordIds(ids =>
      ids.includes(id)
        ? ids.filter(item => item !== id)
        : [...ids, id]
    )
  }

  function handleBatchAccept(ids: string[]) {
    const confirmedAt = new Date().toISOString()

    setBatchRecords(records =>
      records.map(record => {
        if (
          !ids.includes(record.id) ||
          !record.diagnosis ||
          !record.reviewedDiagnosis
        ) {
          return record
        }

        return {
          ...record,
          reviewStatus: 'confirmed',
          processingStatus: 'confirmed',
          modifiedFields: getModifiedFields(
            record.diagnosis,
            record.reviewedDiagnosis
          ),
          processedAt: confirmedAt
        }
      })
    )
  }

  function handleScreenshotChange(file: File | undefined) {
    setScreenshotError('')

    if (!file) return

    if (!screenshotTypes.includes(file.type)) {
      setScreenshotError(
        '仅支持 PNG、JPG/JPEG 或 WebP 格式的截图。'
      )
      return
    }

    if (file.size > screenshotMaxSizeBytes) {
      setScreenshotError('截图文件不能超过 5MB。')
      return
    }

    if (screenshotAttachment) {
      URL.revokeObjectURL(screenshotAttachment.previewUrl)
    }

    setScreenshotAttachment({
      name: file.name,
      size: file.size,
      previewUrl: URL.createObjectURL(file)
    })
  }

  function handleRemoveScreenshot() {
    if (screenshotAttachment) {
      URL.revokeObjectURL(screenshotAttachment.previewUrl)
    }

    setScreenshotAttachment(null)
    setScreenshotError('')
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <MapPinned className="h-5 w-5" />
            </div>

            <div>
              <h1 className="text-lg font-semibold">
                GeoFeedback Agent
              </h1>
              <p className="text-sm text-slate-500">
                产品经理反馈整理工作台
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
              Prompt V1
            </span>
            <span className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              AI建议需人工确认
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] p-6">
        <ModeSwitch mode={mode} onChange={setMode} />

        {mode === 'single' ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(360px,0.85fr)_minmax(0,1.35fr)]">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <SingleInputPanel
                feedbackText={feedbackText}
                onFeedbackTextChange={value => {
                  setFeedbackText(value)
                  markDiagnosisOutdated()
                }}
                onUseExample={handleUseExample}
                productName={productName}
                productType={productType}
                deviceInfo={deviceInfo}
                appVersion={appVersion}
                occurredAt={occurredAt}
                location={location}
                additionalContext={additionalContext}
                onProductNameChange={value => {
                  setProductName(value)
                  markDiagnosisOutdated()
                }}
                onProductTypeChange={value => {
                  setProductType(value)
                  markDiagnosisOutdated()
                }}
                onDeviceInfoChange={value => {
                  setDeviceInfo(value)
                  markDiagnosisOutdated()
                }}
                onAppVersionChange={value => {
                  setAppVersion(value)
                  markDiagnosisOutdated()
                }}
                onOccurredAtChange={value => {
                  setOccurredAt(value)
                  markDiagnosisOutdated()
                }}
                onLocationChange={value => {
                  setLocation(value)
                  markDiagnosisOutdated()
                }}
                onAdditionalContextChange={value => {
                  setAdditionalContext(value)
                  markDiagnosisOutdated()
                }}
                screenshotAttachment={screenshotAttachment}
                screenshotError={screenshotError}
                onScreenshotChange={handleScreenshotChange}
                onRemoveScreenshot={handleRemoveScreenshot}
                canDiagnose={canDiagnose}
                loading={loading}
                onDiagnose={handleDiagnose}
              />
            </section>

            <section className="min-h-[680px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <WorkflowSteps
                diagnosisReady={Boolean(diagnosis)}
                reviewConfirmed={reviewStatus === 'confirmed'}
                ticketReady={Boolean(
                  reviewStatus === 'confirmed' && confirmedReview
                )}
              />

              <div className="mt-6">
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
                      model={model}
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
                          key={`${confirmedReview.confirmedAt}-${attachmentNames.join('|')}`}
                          diagnosis={reviewedDiagnosis}
                          feedbackInput={currentFeedbackInput}
                          modifiedFields={
                            confirmedReview.modifiedFields
                          }
                          confirmedAt={confirmedReview.confirmedAt}
                          attachmentNames={attachmentNames}
                        />
                      )}
                  </div>
                ) : (
                  <EmptyDiagnosisState />
                )}
              </div>
            </section>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <BatchInputPanel
                batchText={batchText}
                onBatchTextChange={setBatchText}
                validCount={batchLines.length}
                productName={productName}
                productType={productType}
                deviceInfo={deviceInfo}
                appVersion={appVersion}
                occurredAt={occurredAt}
                location={location}
                additionalContext={additionalContext}
                onProductNameChange={setProductName}
                onProductTypeChange={setProductType}
                onDeviceInfoChange={setDeviceInfo}
                onAppVersionChange={setAppVersion}
                onOccurredAtChange={setOccurredAt}
                onLocationChange={setLocation}
                onAdditionalContextChange={setAdditionalContext}
                canStart={canStartBatch}
                processing={batchProcessing}
                progress={batchProgress}
                message={batchMessage}
                onStart={handleStartBatch}
                onCancel={handleCancelBatch}
              />
            </section>

            {batchRecords.length > 0 && (
              <FeedbackBatchTable
                records={batchRecords}
                selectedRecordId={selectedRecordId}
                selectedIds={selectedRecordIds}
                onSelectRecord={setSelectedRecordId}
                onToggleSelected={handleToggleSelectedRecord}
                onToggleAllSelected={setSelectedRecordIds}
                onUpdateRecord={updateBatchRecord}
                onBatchAccept={handleBatchAccept}
              />
            )}
          </div>
        )}
      </div>
    </main>
  )
}

function ModeSwitch({
  mode,
  onChange
}: {
  mode: WorkMode
  onChange: (mode: WorkMode) => void
}) {
  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
      {[
        { value: 'single' as const, label: '单条反馈' },
        { value: 'batch' as const, label: '批量反馈' }
      ].map(item => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            mode === item.value
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

function SingleInputPanel({
  feedbackText,
  onFeedbackTextChange,
  onUseExample,
  productName,
  productType,
  deviceInfo,
  appVersion,
  occurredAt,
  location,
  additionalContext,
  onProductNameChange,
  onProductTypeChange,
  onDeviceInfoChange,
  onAppVersionChange,
  onOccurredAtChange,
  onLocationChange,
  onAdditionalContextChange,
  screenshotAttachment,
  screenshotError,
  onScreenshotChange,
  onRemoveScreenshot,
  canDiagnose,
  loading,
  onDiagnose
}: {
  feedbackText: string
  onFeedbackTextChange: (value: string) => void
  onUseExample: () => void
  productName: string
  productType: string
  deviceInfo: string
  appVersion: string
  occurredAt: string
  location: string
  additionalContext: string
  onProductNameChange: (value: string) => void
  onProductTypeChange: (value: string) => void
  onDeviceInfoChange: (value: string) => void
  onAppVersionChange: (value: string) => void
  onOccurredAtChange: (value: string) => void
  onLocationChange: (value: string) => void
  onAdditionalContextChange: (value: string) => void
  screenshotAttachment: ScreenshotAttachment | null
  screenshotError: string
  onScreenshotChange: (file: File | undefined) => void
  onRemoveScreenshot: () => void
  canDiagnose: boolean
  loading: boolean
  onDiagnose: () => void
}) {
  return (
    <div className="space-y-5">
      <PanelHeader
        title="输入用户反馈"
        description="粘贴一条地图、出行、航旅或GIS产品反馈。只有反馈原文为必填项。"
      />

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
          onChange={event =>
            onFeedbackTextChange(event.target.value)
          }
          rows={7}
          placeholder="例如：开车去机场时，导航一直让我走一条已经封闭的路，重新规划后还是走这里。"
          className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />

        {feedbackText.length > 0 &&
          feedbackText.trim().length < 10 && (
            <div className="mt-2 flex items-start gap-2 text-xs text-amber-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              当前反馈信息较少，AI可能需要更多上下文才能稳定判断。
            </div>
          )}

        <button
          type="button"
          onClick={onUseExample}
          className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          使用演示案例
        </button>
      </div>

      <OptionalContextFields
        productName={productName}
        productType={productType}
        deviceInfo={deviceInfo}
        appVersion={appVersion}
        occurredAt={occurredAt}
        location={location}
        additionalContext={additionalContext}
        onProductNameChange={onProductNameChange}
        onProductTypeChange={onProductTypeChange}
        onDeviceInfoChange={onDeviceInfoChange}
        onAppVersionChange={onAppVersionChange}
        onOccurredAtChange={onOccurredAtChange}
        onLocationChange={onLocationChange}
        onAdditionalContextChange={onAdditionalContextChange}
      />

      <ScreenshotPicker
        screenshotAttachment={screenshotAttachment}
        screenshotError={screenshotError}
        onScreenshotChange={onScreenshotChange}
        onRemoveScreenshot={onRemoveScreenshot}
      />

      <button
        type="button"
        disabled={!canDiagnose}
        onClick={onDiagnose}
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
    </div>
  )
}

function BatchInputPanel({
  batchText,
  onBatchTextChange,
  validCount,
  productName,
  productType,
  deviceInfo,
  appVersion,
  occurredAt,
  location,
  additionalContext,
  onProductNameChange,
  onProductTypeChange,
  onDeviceInfoChange,
  onAppVersionChange,
  onOccurredAtChange,
  onLocationChange,
  onAdditionalContextChange,
  canStart,
  processing,
  progress,
  message,
  onStart,
  onCancel
}: {
  batchText: string
  onBatchTextChange: (value: string) => void
  validCount: number
  productName: string
  productType: string
  deviceInfo: string
  appVersion: string
  occurredAt: string
  location: string
  additionalContext: string
  onProductNameChange: (value: string) => void
  onProductTypeChange: (value: string) => void
  onDeviceInfoChange: (value: string) => void
  onAppVersionChange: (value: string) => void
  onOccurredAtChange: (value: string) => void
  onLocationChange: (value: string) => void
  onAdditionalContextChange: (value: string) => void
  canStart: boolean
  processing: boolean
  progress: { current: number; total: number }
  message: string
  onStart: () => void
  onCancel: () => void
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(360px,0.7fr)_minmax(0,1fr)]">
      <div className="space-y-5">
        <PanelHeader
          title="批量反馈"
          description="每行作为一条反馈，忽略空行，最多处理20条。批量模式第一版不支持每条上传截图。"
        />

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="batchFeedback"
              className="text-sm font-medium text-slate-700"
            >
              多行反馈
            </label>
            <span className="text-xs text-slate-500">
              有效 {Math.min(validCount, 20)} / 20 条
            </span>
          </div>
          <textarea
            id="batchFeedback"
            value={batchText}
            onChange={event =>
              onBatchTextChange(event.target.value)
            }
            rows={10}
            placeholder={'每行一条反馈，例如：\n搜索不到新开的商场\n收藏夹同步失败\n离线地图一直加载'}
            className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
          {validCount > 20 && (
            <p className="mt-2 text-sm text-amber-700">
              已超过20条，本次只会处理前20条。
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={!canStart}
            onClick={onStart}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {processing ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Layers3 className="h-4 w-4" />
            )}
            开始批量诊断
          </button>

          {processing && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              取消尚未完成
            </button>
          )}
        </div>

        {processing && (
          <p className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            正在处理 {progress.current} / {progress.total}
          </p>
        )}

        {message && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {message}
          </p>
        )}
      </div>

      <OptionalContextFields
        productName={productName}
        productType={productType}
        deviceInfo={deviceInfo}
        appVersion={appVersion}
        occurredAt={occurredAt}
        location={location}
        additionalContext={additionalContext}
        onProductNameChange={onProductNameChange}
        onProductTypeChange={onProductTypeChange}
        onDeviceInfoChange={onDeviceInfoChange}
        onAppVersionChange={onAppVersionChange}
        onOccurredAtChange={onOccurredAtChange}
        onLocationChange={onLocationChange}
        onAdditionalContextChange={onAdditionalContextChange}
      />
    </div>
  )
}

function OptionalContextFields({
  productName,
  productType,
  deviceInfo,
  appVersion,
  occurredAt,
  location,
  additionalContext,
  onProductNameChange,
  onProductTypeChange,
  onDeviceInfoChange,
  onAppVersionChange,
  onOccurredAtChange,
  onLocationChange,
  onAdditionalContextChange
}: {
  productName: string
  productType: string
  deviceInfo: string
  appVersion: string
  occurredAt: string
  location: string
  additionalContext: string
  onProductNameChange: (value: string) => void
  onProductTypeChange: (value: string) => void
  onDeviceInfoChange: (value: string) => void
  onAppVersionChange: (value: string) => void
  onOccurredAtChange: (value: string) => void
  onLocationChange: (value: string) => void
  onAdditionalContextChange: (value: string) => void
}) {
  return (
    <details
      open
      className="rounded-xl border border-slate-200 bg-slate-50"
    >
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-700">
        补充使用环境（可选）
      </summary>

      <div className="grid gap-4 border-t border-slate-200 p-4 sm:grid-cols-2">
        <EnvironmentInput
          id="productName"
          label="产品名称"
          value={productName}
          placeholder="例如：某地图App"
          onChange={onProductNameChange}
        />
        <label>
          <span className="mb-2 block text-sm font-medium text-slate-700">
            产品类型
          </span>
          <select
            value={productType}
            onChange={event =>
              onProductTypeChange(event.target.value)
            }
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="">请选择产品类型</option>
            {productTypes.map(type => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <EnvironmentInput
          id="deviceInfo"
          label="设备与操作系统"
          value={deviceInfo}
          placeholder="例如：iPhone 15 / iOS 18"
          onChange={onDeviceInfoChange}
        />
        <EnvironmentInput
          id="appVersion"
          label="产品版本"
          value={appVersion}
          placeholder="例如：12.3.0"
          onChange={onAppVersionChange}
        />
        <EnvironmentInput
          id="occurredAt"
          label="发生时间"
          value={occurredAt}
          placeholder="例如：2026-06-10 08:30"
          onChange={onOccurredAtChange}
        />
        <EnvironmentInput
          id="location"
          label="发生地点"
          value={location}
          placeholder="例如：机场高速某路段"
          onChange={onLocationChange}
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
            onChange={event =>
              onAdditionalContextChange(event.target.value)
            }
            rows={3}
            placeholder="例如：是否可稳定复现、网络状态、定位权限等"
            className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>
      </div>
    </details>
  )
}

function ScreenshotPicker({
  screenshotAttachment,
  screenshotError,
  onScreenshotChange,
  onRemoveScreenshot
}: {
  screenshotAttachment: ScreenshotAttachment | null
  screenshotError: string
  onScreenshotChange: (file: File | undefined) => void
  onRemoveScreenshot: () => void
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
      <div className="flex items-start gap-3">
        <ImageIcon className="mt-0.5 h-5 w-5 text-slate-500" />
        <div>
          <p className="text-sm font-medium text-slate-700">
            问题截图
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            截图将作为问题证据附件保留，当前版本暂不进行AI图片分析。
          </p>
        </div>
      </div>

      {screenshotAttachment ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- Blob preview stays local and is not a remote optimized asset. */}
          <img
            src={screenshotAttachment.previewUrl}
            alt="问题截图预览"
            className="max-h-48 w-full rounded-lg object-contain"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-700">
                {screenshotAttachment.name}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {formatFileSize(screenshotAttachment.size)}
              </p>
            </div>
            <button
              type="button"
              onClick={onRemoveScreenshot}
              className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              删除
            </button>
          </div>
        </div>
      ) : (
        <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          <Upload className="h-4 w-4" />
          选择截图
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={event => {
              onScreenshotChange(event.target.files?.[0])
              event.target.value = ''
            }}
          />
        </label>
      )}

      {screenshotError && (
        <p className="mt-3 text-sm text-red-600">
          {screenshotError}
        </p>
      )}
    </div>
  )
}

function PanelHeader({
  title,
  description
}: {
  title: string
  description: string
}) {
  return (
    <div>
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        {description}
      </p>
    </div>
  )
}

function EnvironmentInput({
  id,
  label,
  value,
  placeholder,
  onChange
}: {
  id: string
  label: string
  value: string
  placeholder: string
  onChange: (value: string) => void
}) {
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

function WorkflowSteps({
  diagnosisReady,
  reviewConfirmed,
  ticketReady
}: {
  diagnosisReady: boolean
  reviewConfirmed: boolean
  ticketReady: boolean
}) {
  const steps = [
    { label: 'AI诊断', done: diagnosisReady },
    { label: '产品经理确认', done: reviewConfirmed },
    { label: '生成问题单', done: ticketReady }
  ]

  return (
    <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-3">
      {steps.map((step, index) => (
        <div
          key={step.label}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
            step.done
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-white text-slate-500'
          }`}
        >
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
              step.done
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {index + 1}
          </span>
          {step.label}
        </div>
      ))}
    </div>
  )
}

function EmptyDiagnosisState() {
  return (
    <div className="flex h-full min-h-[620px] flex-col items-center justify-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        <Sparkles className="h-7 w-7" />
      </div>
      <h2 className="mt-5 text-xl font-semibold">
        等待诊断
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        AI将从用户场景、产品模块、问题类型、待补充信息和处理优先级等维度提供初步判断。
      </p>
      <div className="mt-8 flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
        <ShieldCheck className="h-4 w-4" />
        所有判断都需要产品经理人工确认
      </div>
    </div>
  )
}

function LoadingDiagnosisState() {
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
      {[1, 2, 3, 4].map(item => (
        <div
          key={item}
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
  provider,
  model
}: {
  diagnosis: DiagnosisResult
  provider: string
  model: string
}) {
  return (
    <div className="space-y-5 rounded-2xl border border-blue-200 bg-blue-50/40 p-5">
      <div>
        <p className="text-sm font-medium text-blue-600">
          AI初步诊断
        </p>
        <h2 className="mt-1 text-2xl font-semibold">
          {diagnosis.summary}
        </h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewItem label="产品模块" value={diagnosis.productModule} />
        <OverviewItem
          label="问题类型"
          value={displayIssueType(diagnosis.issueType)}
        />
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium text-slate-400">
            处理优先级
          </p>
          <div className="mt-2">
            <StatusBadge
              label={diagnosis.prioritySuggestion}
              tone={priorityTone(diagnosis.prioritySuggestion)}
            />
          </div>
        </div>
        <OverviewItem label="置信度" value={diagnosis.confidenceLevel} />
        <OverviewItem label="Provider" value={provider || 'mock'} />
        <OverviewItem label="Model" value={model || 'mock'} />
        <OverviewItem label="Prompt版本" value={diagnosis.promptVersion} />
      </div>

      <details className="rounded-xl border border-slate-200 bg-white">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-700">
          查看AI分析依据
        </summary>
        <div className="space-y-5 border-t border-slate-200 p-4">
          <InfoCard title="用户使用场景">
            <p>{diagnosis.userScenario}</p>
          </InfoCard>
          <div className="grid gap-4 lg:grid-cols-2">
            <InfoCard title="实际情况">
              <p>{diagnosis.actualResult}</p>
            </InfoCard>
            <InfoCard title="期望效果">
              <p>{diagnosis.expectedResult}</p>
            </InfoCard>
          </div>
          <StringListCard
            title="用户明确事实"
            items={diagnosis.userFacts}
            emptyText="当前没有提取到明确事实"
          />
          <StringListCard
            title="AI推测"
            items={diagnosis.aiInferences}
            emptyText="当前没有需要展示的推测"
            warning
          />
          <StringListCard
            title="用户原话证据"
            items={diagnosis.evidenceQuotes}
            emptyText="当前没有可引用的用户原话"
          />
          <InfoCard title="备选问题类型">
            <p>{diagnosis.alternativeIssueType}</p>
          </InfoCard>
          <InfoCard title="待补充信息">
            <p>共 {diagnosis.missingInformation.length} 项</p>
            <ul className="mt-2 space-y-2">
              {diagnosis.missingInformation.map((item, index) => (
                <li key={`${item.field}-${index}`}>
                  {item.field}：{item.status}，{item.reason}
                </li>
              ))}
            </ul>
          </InfoCard>
          <InfoCard title="不确定性">
            <p>{diagnosis.uncertainty}</p>
          </InfoCard>
          <InfoCard title="建议下一步">
            <p>{diagnosis.recommendedNextAction}</p>
          </InfoCard>
        </div>
      </details>
      <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-600">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        AI已完成初步整理，产品经理可直接接受建议或修改少量字段后确认。
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
      className={`rounded-xl border p-5 ${
        warning
          ? 'border-amber-200 bg-amber-50'
          : 'border-slate-200 bg-white'
      }`}
    >
      <h3 className={`font-semibold ${warning ? 'text-amber-900' : ''}`}>
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

function createPendingRecord({
  index,
  rawFeedback,
  optionalContext,
  createdAt
}: {
  index: number
  rawFeedback: string
  optionalContext: Omit<FeedbackInput, 'feedbackText'>
  createdAt: string
}): FeedbackRecord {
  return {
    id: `GF-${String(index + 1).padStart(3, '0')}`,
    rawFeedback,
    optionalContext,
    diagnosis: null,
    reviewedDiagnosis: null,
    reviewStatus: 'not_reviewed',
    modifiedFields: [],
    ticketType: null,
    ticketMarkdown: '',
    processingStatus: 'pending',
    errorMessage: '',
    createdAt,
    processedAt: '',
    provider: '',
    model: ''
  }
}

function parseBatchLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
}

function formatFileSize(size: number): string {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(2)} MB`
  }
  return `${Math.max(1, Math.round(size / 1024))} KB`
}

function wait(milliseconds: number) {
  return new Promise(resolve => {
    setTimeout(resolve, milliseconds)
  })
}
