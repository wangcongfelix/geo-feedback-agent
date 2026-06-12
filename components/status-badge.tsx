import type { StatusTone } from '@/lib/display-labels'
import { LoaderCircle } from 'lucide-react'

type StatusBadgeProps = {
  label: string
  tone: StatusTone
  loading?: boolean
}

const toneClasses: Record<StatusTone, string> = {
  gray: 'border-slate-200 bg-slate-50 text-slate-700 ring-slate-100',
  orange:
    'border-amber-200 bg-amber-50 text-amber-800 ring-amber-100',
  blue: 'border-blue-200 bg-blue-50 text-blue-700 ring-blue-100',
  green:
    'border-emerald-200 bg-emerald-50 text-emerald-700 ring-emerald-100',
  red: 'border-red-200 bg-red-50 text-red-700 ring-red-100'
}

const dotClasses: Record<StatusTone, string> = {
  gray: 'bg-slate-400',
  orange: 'bg-amber-500',
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  red: 'bg-red-500'
}

export default function StatusBadge({
  label,
  tone,
  loading = false
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ring-1 ${toneClasses[tone]}`}
    >
      {loading ? (
        <LoaderCircle className="h-3 w-3 animate-spin" />
      ) : (
        <span
          className={`h-1.5 w-1.5 rounded-full ${dotClasses[tone]}`}
        />
      )}
      {label}
    </span>
  )
}
