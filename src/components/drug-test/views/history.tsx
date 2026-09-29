'use client'

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/store'
import type { Classification, TestRecordDTO } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ResultBadge, SectionHeading } from '../ui-bits'
import { Search, ChevronRight, History as HistoryIcon, MapPin } from 'lucide-react'

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
      return `${r.recordNo} ${r.drugProfile?.target ?? ''} ${r.drugProfile?.id ?? ''} ${r.operatorId} ${r.locationLabel ?? ''}`
        .toLowerCase()
        .includes(query)
    })
  }, [records, q, classification])

  const open = (r: TestRecordDTO) => {
    setActiveRecord(r)
    setView('record-detail')
  }

  return (
    <div className="space-y-6">
      <SectionHeading eyebrow="Archive" title="Test history" sub="Search and review finalized, tamper-evident test records." />

      <Card className="card-soft">
        <CardContent className="p-4 grid sm:grid-cols-[1fr_220px] gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search record no, substance, operator, location…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-10 h-11 rounded-xl"
            />
          </div>
          <Select value={classification} onValueChange={(v) => setClassification(v as 'All' | Classification)}>
            <SelectTrigger className="h-11 rounded-xl">
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

      <Card className="card-soft">
        <CardContent className="p-0">
          {records === null ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <HistoryIcon className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">
                {records.length === 0 ? 'No test records found.' : 'No matching tests found.'}
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {records.length === 0 ? 'Completed tests will appear here.' : 'Try another search.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {filtered.map((r) => (
                <li key={r.id}>
                  <button onClick={() => open(r)} className="group w-full flex items-center gap-4 px-5 py-4 hover:bg-accent/30 transition text-left">
                    <span className="font-mono text-xs w-28 shrink-0 text-muted-foreground">{r.recordNo}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{r.drugProfile?.target ?? r.drugProfileId}</div>
                      <div className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                        {r.drugProfile?.testMethod}
                        {r.locationLabel && (
                          <span className="inline-flex items-center gap-0.5">
                            <MapPin className="h-3 w-3" /> GPS
                          </span>
                        )}
                      </div>
                    </div>
                    <ResultBadge c={r.classification} />
                    <span className="text-xs text-muted-foreground hidden sm:inline w-36 text-right">
                      {new Date(r.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition" />
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
