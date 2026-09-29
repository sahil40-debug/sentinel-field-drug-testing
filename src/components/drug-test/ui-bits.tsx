'use client'

import { useApp } from '@/lib/store'
import type { Classification } from '@/lib/types'
import { CheckCircle2, XCircle, AlertCircle, FlaskConical } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ResultBadge({ c, className = '' }: { c: Classification; className?: string }) {
  const map: Record<Classification, { cls: string; icon: typeof CheckCircle2 }> = {
    Positive: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200/70', icon: CheckCircle2 },
    Negative: { cls: 'bg-rose-50 text-rose-700 border-rose-200/70', icon: XCircle },
    Inconclusive: { cls: 'bg-amber-50 text-amber-700 border-amber-200/70', icon: AlertCircle },
  }
  const { cls, icon: Icon } = map[c]
  return (
    <span className={cn('pill border', cls, className)}>
      <Icon className="h-3.5 w-3.5" />
      {c}
    </span>
  )
}

export function ColorSwatch({ hex, label, sub }: { hex: string; label?: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="inline-block h-9 w-9 rounded-xl border border-black/5 shadow-[inset_0_0_0_1px_oklch(1_0_0/0.4)]"
        style={{ backgroundColor: hex }}
        aria-hidden
      />
      <div className="leading-tight">
        {label && <div className="text-sm font-medium">{label}</div>}
        {sub && <div className="text-xs text-muted-foreground font-mono uppercase tracking-wide">{sub}</div>}
      </div>
    </div>
  )
}

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <div
      className="rounded-2xl bg-primary text-primary-foreground grid place-items-center shadow-[0_6px_20px_-6px_oklch(0.3_0.08_290/0.5)]"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <FlaskConical className="h-1/2 w-1/2" strokeWidth={2.2} />
    </div>
  )
}

export function PresumptiveNotice() {
  const { setView } = useApp()
  return (
    <div className="rounded-2xl border border-amber-200/70 bg-amber-50/80 px-4 py-3 text-xs text-amber-800 backdrop-blur-sm">
      <strong className="font-semibold">Presumptive field result only.</strong> This is not a laboratory
      confirmation. All results must be confirmed by an accredited laboratory before use in any proceeding.{' '}
      <button className="underline font-medium hover:text-amber-900" onClick={() => setView('verification')}>
        Verify a record →
      </button>
    </div>
  )
}

export function SectionHeading({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub?: string }) {
  return (
    <div className="space-y-1">
      {eyebrow && <div className="display-eyebrow">{eyebrow}</div>}
      <h1 className="display-heading text-3xl sm:text-4xl">{title}</h1>
      {sub && <p className="text-sm text-muted-foreground max-w-prose">{sub}</p>}
    </div>
  )
}
