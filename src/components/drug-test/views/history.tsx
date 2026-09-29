'use client'

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/store'
import type { Classification, TestRecordDTO } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ResultBadge } from '../ui-bits'
import { Search, ChevronRight, History as HistoryIcon } from 'lucide-react'

export function HistoryView() {
  const { setActiveRecord, setView } = useApp()
  const [records, setRecords] = useState<TestRecordDTO[] | null>(null)
  const [q, setQ] = useState('')
  const [classification, setClassification] = useState<'All' | Classification>('All')

  useEffect(() => {
    let alive = true
    fetch('/api/records')
      .then((r) => r.json())
      .then((d) => alive && setRecords(d.records))
      .catch(() => setRecords([]))
    return () => {
      alive = false
    }
  }, [])

  const filtered = useMemo(() => {
    if (!records) return []
    const query = q.trim().toLowerCase()
    return records.filter((r) => {
      if (classification !== 'All' && r.classification !== classification) return false
      if (!query) return true
      return `${r.recordNo} ${r.drugProfile?.target ?? ''} ${r.drugProfile?.id ?? ''} ${r.operatorId}`
        .toLowerCase()
        .includes(query)
    })
  }, [records, q, classification])

  const open = (r: TestRecordDTO) => {
    setActiveRecord(r)
    setView('record-detail')
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Test History</h1>
        <p className="text-sm text-muted-foreground">Search and review finalized test records.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-[1fr_220px] gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search record no, substance, operator…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={classification} onValueChange={(v) => setClassification(v as 'All' | Classification)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All results</SelectItem>
              <SelectItem value="Positive">Positive</SelectItem>
              <SelectItem value="Negative">Negative</SelectItem>
              <SelectItem value="Inconclusive">Inconclusive</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {records === null ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <HistoryIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
              {records.length === 0 ? 'No test records found. Completed tests will appear here.' : 'No matching tests found. Try another search.'}
            </div>
          ) : (
            <ul className="divide-y">
              {filtered.map((r) => (
                <li key={r.id}>
                  <button onClick={() => open(r)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 text-left">
                    <span className="font-mono text-sm w-32 shrink-0">{r.recordNo}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{r.drugProfile?.target ?? r.drugProfileId}</div>
                      <div className="text-xs text-muted-foreground truncate">{r.drugProfile?.testMethod}</div>
                    </div>
                    <ResultBadge c={r.classification} />
                    <span className="text-xs text-muted-foreground hidden sm:inline w-36 text-right">
                      {new Date(r.createdAt).toLocaleString()}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
