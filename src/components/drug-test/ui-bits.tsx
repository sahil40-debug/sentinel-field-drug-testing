'use client'

import { useApp } from '@/lib/store'
import type { Classification } from '@/lib/types'
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

export function ResultBadge({ c, className = '' }: { c: Classification; className?: string }) {
  const map: Record<Classification, { cls: string; icon: typeof CheckCircle2 }> = {
    Positive: { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
    Negative: { cls: 'bg-rose-100 text-rose-700 border-rose-200', icon: XCircle },
    Inconclusive: { cls: 'bg-amber-100 text-amber-700 border-amber-200', icon: AlertCircle },
  }
  const { cls, icon: Icon } = map[c]
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold ${cls} ${className}`}>
      <Icon className="h-3.5 w-3.5" />
      {c}
    </span>
  )
}

export function ColorSwatch({ hex, label, sub }: { hex: string; label?: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="inline-block h-7 w-7 rounded-md border border-black/10 shadow-sm"
        style={{ backgroundColor: hex }}
        aria-hidden
      />
      <div className="leading-tight">
        {label && <div className="text-sm font-medium">{label}</div>}
        {sub && <div className="text-xs text-muted-foreground font-mono uppercase">{sub}</div>}
      </div>
    </div>
  )
}

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <div
      className="rounded-lg bg-primary text-primary-foreground grid place-items-center font-bold"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      aria-hidden
    >
      D
    </div>
  )
}

export function PresumptiveNotice() {
  const { setView } = useApp()
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      <strong>Presumptive field result only.</strong> This is not a laboratory confirmation. All
      results must be confirmed by an accredited laboratory before use in any proceeding.{' '}
      <button className="underline" onClick={() => setView('verification')}>
        Verify a record →
      </button>
    </div>
  )
}
