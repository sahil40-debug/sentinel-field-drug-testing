'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ResultBadge, SectionHeading } from '../ui-bits'
import { FlaskRound, Plus, CheckCircle2, XCircle, AlertCircle, ArrowRight, ChevronRight } from 'lucide-react'

interface Stats {
  total: number
  positive: number
  negative: number
  inconclusive: number
  recent: {
    id: string
    recordNo: string
    target: string
    classification: 'Positive' | 'Negative' | 'Inconclusive'
    createdAt: string
  }[]
}

export function DashboardView() {
  const { setView, setActiveRecord, analysis, resetFlow } = useApp()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetch('/api/stats')
      .then((r) => r.json())
      .then((d) => alive && setStats(d))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const cards = [
    { label: 'Total Tests', value: stats?.total, icon: FlaskRound, tint: 'text-foreground' },
    { label: 'Positive', value: stats?.positive, icon: CheckCircle2, tint: 'text-emerald-600' },
    { label: 'Negative', value: stats?.negative, icon: XCircle, tint: 'text-rose-600' },
    { label: 'Inconclusive', value: stats?.inconclusive, icon: AlertCircle, tint: 'text-amber-600' },
  ]

  const startNew = () => {
    if (analysis) resetFlow()
    setView('new-test')
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          eyebrow="Overview"
          title="Dashboard"
          sub="Operational summary of your field drug-testing activity."
        />
        <Button onClick={startNew} className="btn-pill gap-1.5 h-11 px-5">
          <Plus className="h-4 w-4" /> New Field Test
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => {
          const Icon = c.icon
          return (
            <Card key={c.label} className="card-soft overflow-hidden">
              <CardContent className="pt-6 pb-5 relative">
                <Icon className={`absolute right-4 top-4 h-8 w-8 ${c.tint} opacity-15`} />
                <div className="font-serif-display text-5xl font-semibold tabular-nums tracking-tight">
                  {loading ? <Skeleton className="h-12 w-12 rounded-lg" /> : c.value ?? 0}
                </div>
                <div className="text-xs text-muted-foreground mt-2 tracking-wide uppercase">{c.label}</div>
                <span className="sr-only">{c.label}: {c.value ?? 0}</span>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="card-soft">
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div>
            <div className="display-eyebrow">Activity</div>
            <h2 className="display-heading text-xl">Recent Tests</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setView('history')} className="gap-1 btn-pill">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
        <CardContent className="p-0">
          {loading ? (
            <div className="px-6 pb-6 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : stats?.recent.length ? (
            <ul className="divide-y divide-border/50">
              {stats.recent.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={async () => {
                      const res = await fetch(`/api/records/${r.id}`)
                      const d = await res.json()
                      setActiveRecord(d.record)
                      setView('record-detail')
                    }}
                    className="group w-full flex items-center gap-4 px-6 py-4 hover:bg-accent/40 transition text-left"
                  >
                    <span className="font-mono text-sm w-28 shrink-0 text-muted-foreground">{r.recordNo}</span>
                    <span className="flex-1 truncate text-sm font-medium">{r.target}</span>
                    <ResultBadge c={r.classification} />
                    <span className="text-xs text-muted-foreground hidden sm:inline w-40 text-right">
                      {new Date(r.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-6 pb-10 pt-2 text-center">
              <FlaskRound className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No test records yet.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Start your first field test to see it here.</p>
              <Button onClick={startNew} className="btn-pill mt-4 gap-1.5">
                <Plus className="h-4 w-4" /> New Field Test
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
