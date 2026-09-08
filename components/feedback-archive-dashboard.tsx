'use client'

import {
  Archive,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  FileImage,
  Filter,
  ImagePlus,
  Lightbulb,
  Search,
  ShieldCheck,
  UsersRound
} from 'lucide-react'
import { useMemo, useState } from 'react'
import type {
  ArchiveFeedbackType,
  FeedbackArchiveRecord
} from '@/lib/feedback-archive'

type ArchiveDashboardProps = {
  onCapture: () => void
  records: FeedbackArchiveRecord[]
}

const chartColors: Record<ArchiveFeedbackType, string> = {
  功能建议: 'bg-blue-500',
  数据问题: 'bg-cyan-500',
  体验问题: 'bg-amber-400',
  Bug: 'bg-rose-500'
}

const chartData = {
  '7d': [
    { label: '9/2', values: [3, 1, 2, 1] },
    { label: '9/3', values: [4, 2, 1, 1] },
    { label: '9/4', values: [2, 2, 3, 1] },
    { label: '9/5', values: [5, 1, 2, 2] },
    { label: '9/6', values: [3, 3, 2, 1] },
    { label: '9/7', values: [6, 2, 3, 2] },
    { label: '今天', values: [4, 2, 1, 1] }
  ],
  '30d': [
    { label: '8/10', values: [9, 5, 6, 3] },
    { label: '8/15', values: [12, 6, 7, 4] },
    { label: '8/20', values: [10, 7, 8, 3] },
    { label: '8/25', values: [14, 5, 9, 5] },
    { label: '8/30', values: [16, 8, 7, 4] },
    { label: '9/4', values: [18, 7, 10, 6] }
  ]
} as const

const feedbackTypes = Object.keys(chartColors) as ArchiveFeedbackType[]

export default function FeedbackArchiveDashboard({
  onCapture,
  records
}: ArchiveDashboardProps) {
  const [range, setRange] = useState<'7d' | '30d'>('7d')
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'全部' | ArchiveFeedbackType>('全部')

  const filteredRecords = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return records.filter(record => {
      const matchesType =
        typeFilter === '全部' || record.type === typeFilter
      const matchesQuery =
        !normalizedQuery ||
        [
          record.suggestion,
          record.userNote,
          record.userId,
          record.source,
          record.module,
          record.id
        ].some(value => value?.toLowerCase().includes(normalizedQuery))

      return matchesType && matchesQuery
    })
  }, [query, records, typeFilter])

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 text-white shadow-sm">
        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-8">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-cyan-300">
              <Archive className="h-4 w-4" />
              微信反馈档案
            </div>
            <h2 className="max-w-3xl text-2xl font-semibold tracking-tight sm:text-3xl">
              从一张截图，到一条可追溯的产品证据
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
              提取用户建议，同时保留头像标识、来源群聊、截图凭证与发生时间，避免反馈脱离原始语境。
            </p>
          </div>

          <button
            type="button"
            onClick={onCapture}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            <ImagePlus className="h-4 w-4" />
            录入微信截图
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Archive} label="累计归档" value={String(records.length)} helper="截图凭证与建议绑定保存" tone="blue" />
        <MetricCard icon={Lightbulb} label="有效建议" value={String(records.filter(record => record.suggestion.trim()).length)} helper="完成文字提取的反馈" tone="cyan" />
        <MetricCard icon={UsersRound} label="反馈用户" value={String(new Set(records.map(record => record.avatarDataUrl || record.userId || record.userNote || record.id)).size)} helper="通过头像标识去重" tone="violet" />
        <MetricCard icon={CalendarDays} label="待人工复核" value={String(records.filter(record => record.status === '待复核').length)} helper="识别后自动进入档案" tone="amber" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.65fr)]">
        <FeedbackTrendChart range={range} onRangeChange={setRange} />
        <ArchiveIntegrityCard />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 lg:flex-row lg:items-center lg:justify-between lg:p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">反馈档案</h2>
            <p className="mt-1 text-sm text-slate-500">
              建议文本与用户身份、时间和原始截图绑定保存。
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative block min-w-[260px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <span className="sr-only">搜索反馈档案</span>
              <input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder="搜索建议、人工备注或来源"
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />
            </label>

            <label className="relative block">
              <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <span className="sr-only">筛选反馈类型</span>
              <select
                value={typeFilter}
                onChange={event =>
                  setTypeFilter(event.target.value as '全部' | ArchiveFeedbackType)
                }
                className="min-h-11 rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-9 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option>全部</option>
                {feedbackTypes.map(type => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredRecords.map(record => (
            <ArchiveRow key={record.id} record={record} />
          ))}

          {filteredRecords.length === 0 && (
            <div className="px-6 py-16 text-center">
              <Search className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-700">没有找到匹配的反馈档案</p>
              <p className="mt-1 text-sm text-slate-500">请调整关键词或反馈类型。</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
  tone
}: {
  icon: typeof Archive
  label: string
  value: string
  helper: string
  tone: 'blue' | 'cyan' | 'violet' | 'amber'
}) {
  const tones = {
    blue: 'bg-blue-50 text-blue-700',
    cyan: 'bg-cyan-50 text-cyan-700',
    violet: 'bg-violet-50 text-violet-700',
    amber: 'bg-amber-50 text-amber-700'
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
        </div>
        <div className={`rounded-xl p-2.5 ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{helper}</p>
    </div>
  )
}

function FeedbackTrendChart({
  range,
  onRangeChange
}: {
  range: '7d' | '30d'
  onRangeChange: (range: '7d' | '30d') => void
}) {
  const data = chartData[range]
  const maxTotal = Math.max(
    ...data.map(item => item.values.reduce((sum, value) => sum + value, 0))
  )

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">反馈趋势与类型</h2>
          <p className="mt-1 text-sm text-slate-500">按归档时间观察不同问题类型的变化。</p>
        </div>

        <div className="inline-flex self-start rounded-lg bg-slate-100 p-1">
          {[
            { value: '7d' as const, label: '近 7 日' },
            { value: '30d' as const, label: '近 30 日' }
          ].map(item => (
            <button
              key={item.value}
              type="button"
              onClick={() => onRangeChange(item.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                range === item.value
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2">
        {feedbackTypes.map(type => (
          <div key={type} className="flex items-center gap-2 text-xs text-slate-600">
            <span className={`h-2.5 w-2.5 rounded-sm ${chartColors[type]}`} />
            {type}
          </div>
        ))}
      </div>

      <div className="mt-6 grid h-56 grid-cols-[auto_minmax(0,1fr)] gap-3">
        <div className="flex flex-col justify-between pb-7 text-right text-xs text-slate-400">
          <span>{maxTotal}</span>
          <span>{Math.round(maxTotal / 2)}</span>
          <span>0</span>
        </div>
        <div className="relative grid grid-cols-6 gap-3 border-b border-slate-200 sm:gap-5" style={{ gridTemplateColumns: `repeat(${data.length}, minmax(0, 1fr))` }}>
          <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-slate-200" />
          <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-slate-200" />

          {data.map(item => {
            const total = item.values.reduce((sum, value) => sum + value, 0)
            const height = Math.max((total / maxTotal) * 100, 4)

            return (
              <div key={item.label} className="relative flex min-w-0 flex-col justify-end pb-7">
                <div
                  className="relative z-10 flex w-full flex-col-reverse overflow-hidden rounded-t-md"
                  style={{ height: `${height}%` }}
                  title={`${item.label}：共 ${total} 条反馈`}
                >
                  {feedbackTypes.map((type, index) => (
                    <span
                      key={type}
                      className={`${chartColors[type]} min-h-[3px] w-full`}
                      style={{ flex: item.values[index] }}
                    />
                  ))}
                </div>
                <span className="absolute inset-x-0 bottom-1 truncate text-center text-[11px] text-slate-500">
                  {item.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function ArchiveIntegrityCard() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-emerald-600" />
        <h2 className="text-lg font-semibold text-slate-900">档案完整度</h2>
      </div>
      <p className="mt-1 text-sm text-slate-500">每条反馈的证据链保留情况。</p>

      <div className="mt-6 flex items-end gap-3">
        <span className="text-4xl font-semibold tracking-tight text-slate-950">96%</span>
        <span className="pb-1 text-sm font-medium text-emerald-600">+4.2%</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full w-[96%] rounded-full bg-emerald-500" />
      </div>

      <div className="mt-6 space-y-4">
        {[
          ['原始截图', '128 / 128'],
          ['头像标识', '124 / 128'],
          ['提取建议文本', '128 / 128'],
          ['反馈时间', '121 / 128']
        ].map(([label, value], index) => (
          <div key={label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-slate-600">
              <CheckCircle2 className={`h-4 w-4 ${index === 1 || index === 3 ? 'text-amber-500' : 'text-emerald-500'}`} />
              {label}
            </span>
            <span className="font-medium text-slate-900">{value}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function ArchiveRow({ record }: { record: FeedbackArchiveRecord }) {
  return (
    <article className="grid gap-4 px-5 py-5 transition hover:bg-slate-50/80 sm:px-6 lg:grid-cols-[minmax(220px,0.55fr)_minmax(0,1.45fr)_auto] lg:items-center">
      <div className="flex min-w-0 items-center gap-3">
        {record.avatarDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Avatar is cropped from a local screenshot.
          <img
            src={record.avatarDataUrl}
            alt={record.userNote ? `${record.userNote}的头像` : '截图中的用户头像'}
            className="h-12 w-12 shrink-0 rounded-full border-2 border-white object-cover shadow-sm ring-1 ring-slate-200"
          />
        ) : (
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white shadow-sm ${record.avatarTone}`}>
            {record.initials}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">
            {record.userNote?.trim() || '头像标识'}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {record.avatarDataUrl ? '头像来自原始截图' : record.source}
          </p>
        </div>
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <TypeBadge type={record.type} />
          <span className="text-xs text-slate-500">{record.module}</span>
          <span className="text-xs text-slate-300">·</span>
          <span className="text-xs text-slate-500">{record.capturedAt}</span>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-800">{record.suggestion}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <FileImage className="h-3.5 w-3.5" />
            {record.imageName}
          </span>
          <span>{record.id}</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 lg:justify-end">
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
          record.status === '已确认'
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-amber-50 text-amber-700'
        }`}>
          {record.status}
        </span>
        <button
          type="button"
          aria-label={`查看 ${record.id}`}
          className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:border-slate-300 hover:bg-white hover:text-slate-900"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </article>
  )
}

function TypeBadge({ type }: { type: ArchiveFeedbackType }) {
  const tones: Record<ArchiveFeedbackType, string> = {
    功能建议: 'bg-blue-50 text-blue-700',
    数据问题: 'bg-cyan-50 text-cyan-700',
    体验问题: 'bg-amber-50 text-amber-700',
    Bug: 'bg-rose-50 text-rose-700'
  }

  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${tones[type]}`}>{type}</span>
}
