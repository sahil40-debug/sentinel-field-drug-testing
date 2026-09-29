'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ResultBadge } from '../ui-bits'
import { FlaskRound, Plus, CheckCircle2, XCircle, AlertCircle, ArrowRight } from 'lucide-react'

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
  const { setView, setActiveRecord } = useApp()
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
    { label: 'Total Tests', value: stats?.total, icon: FlaskRound, color: 'text-foreground' },
    { label: 'Positive', value: stats?.positive, icon: CheckCircle2, color: 'text-emerald-600' },
    { label: 'Negative', value: stats?.negative, icon: XCircle, color: 'text-rose-600' },
    { label: 'Inconclusive', value: stats?.inconclusive, icon: AlertCircle, color: 'text-amber-600' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Operational overview of field drug tests.</p>
        </div>
        <Button onClick={() => setView('new-test')} className="gap-1.5">
          <Plus className="h-4 w-4" /> New Field Test
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon
          return (
            <Card key={c.label}>
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold tabular-nums">
                      {loading ? <Skeleton className="h-8 w-10" /> : c.value ?? 0}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{c.label}</div>
                  </div>
                  <Icon className={`h-8 w-8 ${c.color} opacity-80`} />
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Tests</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setView('history')} className="gap-1">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : stats?.recent.length ? (
            <ul className="divide-y">
              {stats.recent.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={async () => {
                      const res = await fetch(`/api/records/${r.id}`)
                      const d = await res.json()
                      setActiveRecord(d.record)
                      setView('record-detail')
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 text-left"
                  >
                    <span className="font-mono text-sm w-32 shrink-0">{r.recordNo}</span>
                    <span className="flex-1 truncate text-sm">{r.target}</span>
                    <ResultBadge c={r.classification} />
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {new Date(r.createdAt).toLocaleString()}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No test records yet. Start a new field test.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
