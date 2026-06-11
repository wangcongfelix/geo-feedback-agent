'use client'

import { useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  MapPinned,
  ShieldCheck,
  Sparkles
} from 'lucide-react'

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

export default function GeoFeedbackPage() {
  const [feedbackText, setFeedbackText] = useState('')
  const [productName, setProductName] = useState('')
  const [productType, setProductType] = useState('')
  const [deviceInfo, setDeviceInfo] = useState('')
  const [appVersion, setAppVersion] = useState('')
  const [occurredAt, setOccurredAt] = useState('')
  const [location, setLocation] = useState('')
  const [additionalContext, setAdditionalContext] = useState('')
  const [showPrototypeResult, setShowPrototypeResult] = useState(false)

  const canDiagnose = feedbackText.trim().length > 0

  const handlePrototypeDiagnose = () => {
    if (!canDiagnose) return
    setShowPrototypeResult(true)
  }

  const handleUseExample = () => {
    setFeedbackText(exampleFeedback)
    setProductType('导航与出行')
    setShowPrototypeResult(false)
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
              <h1 className="text-lg font-semibold">GeoFeedback Agent</h1>
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
            <h2 className="text-xl font-semibold">输入用户反馈</h2>
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
                  setShowPrototypeResult(false)
                }}
                rows={7}
                placeholder="例如：开车去机场时，导航一直让我走一条已经封闭的路，重新规划后还是走这里。"
                className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />

              {feedbackText.length > 0 && feedbackText.trim().length < 10 && (
                <div className="mt-2 flex items-start gap-2 text-xs text-amber-700">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  当前反馈信息较少，后续AI可能只能判断为“信息不足”。
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
                  onChange={event => setProductName(event.target.value)}
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
                  onChange={event => setProductType(event.target.value)}
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
                  onChange={setDeviceInfo}
                />

                <EnvironmentInput
                  id="appVersion"
                  label="产品版本"
                  value={appVersion}
                  placeholder="例如：12.3.0"
                  onChange={setAppVersion}
                />

                <EnvironmentInput
                  id="occurredAt"
                  label="发生时间"
                  value={occurredAt}
                  placeholder="例如：2026-06-10 08:30"
                  onChange={setOccurredAt}
                />

                <EnvironmentInput
                  id="location"
                  label="发生地点"
                  value={location}
                  placeholder="例如：机场高速某路段"
                  onChange={setLocation}
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
                      setAdditionalContext(event.target.value)
                    }
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
              onClick={handlePrototypeDiagnose}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Sparkles className="h-4 w-4" />
              开始诊断
            </button>

            <p className="text-center text-xs text-slate-400">
              当前阶段为静态页面原型，尚未调用真实模型。
            </p>
          </div>
        </section>

        <section className="min-h-[680px] rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {!showPrototypeResult ? (
            <EmptyDiagnosisState />
          ) : (
            <PrototypeDiagnosisState feedbackText={feedbackText} />
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

      <h2 className="mt-5 text-xl font-semibold">等待诊断</h2>

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
            <span className="text-sm text-slate-600">{item}</span>
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

function PrototypeDiagnosisState({
  feedbackText
}: {
  feedbackText: string
}) {
  return (
    <div>
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-5 w-5 text-blue-600" />

          <div>
            <h2 className="font-semibold text-blue-900">
              静态交互原型已运行
            </h2>
            <p className="mt-1 text-sm leading-6 text-blue-700">
              页面已经接收到反馈内容，但当前尚未调用模型。下一阶段将接入结构化诊断Schema和Prompt V1。
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-slate-200 p-5">
        <p className="text-sm font-medium text-slate-500">本次输入内容</p>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-800">
          {feedbackText}
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {[
          ['用户场景', '等待AI识别'],
          ['产品模块', '等待AI分类'],
          ['问题类型', '等待AI判断'],
          ['缺失信息', '等待AI检查']
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-slate-200 bg-slate-50 p-4"
          >
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {label}
            </p>
            <p className="mt-2 text-sm font-medium text-slate-700">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}