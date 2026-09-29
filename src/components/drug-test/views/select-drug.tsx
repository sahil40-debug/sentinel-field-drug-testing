'use client'

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/store'
import type { DrugProfileDTO } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ColorSwatch, PresumptiveNotice } from '../ui-bits'
import { Search, ArrowRight, FlaskRound, Check } from 'lucide-react'

export function SelectDrugStep() {
  const { setSelectedDrug, setView, selectedDrug } = useApp()
  const [profiles, setProfiles] = useState<DrugProfileDTO[] | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    fetch('/api/drugs')
      .then((r) => r.json())
      .then((d) => setProfiles(d.profiles))
      .catch(() => setProfiles([]))
  }, [])

  const filtered = useMemo(() => {
    if (!profiles) return []
    const query = q.trim().toLowerCase()
    if (!query) return profiles
    return profiles.filter((p) =>
      (p.target + ' ' + p.aliases.join(' ') + ' ' + p.testMethod + ' ' + p.id).toLowerCase().includes(query),
    )
  }, [profiles, q])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New Field Test</h1>
        <p className="text-sm text-muted-foreground">
          Step 1 — select the substance / test being performed. The expected reaction colour
          depends on the selected test.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Search test or substance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="e.g. cocaine, heroin, Marquis, MDMA…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>

          {profiles === null ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No matching tests found. Try another substance, test name, or alias.
            </div>
          ) : (
            <ul className="grid sm:grid-cols-2 gap-2 max-h-[28rem] overflow-y-auto pr-1">
              {filtered.map((p) => {
                const active = selectedDrug?.id === p.id
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => setSelectedDrug(p)}
                      className={`w-full text-left rounded-lg border p-3 transition hover:bg-muted/50 ${
                        active ? 'border-primary ring-1 ring-primary bg-primary/5' : 'border-border'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{p.target}</div>
                          <div className="text-xs text-muted-foreground truncate">{p.testMethod}</div>
                        </div>
                        {active && <Check className="h-4 w-4 text-primary shrink-0" />}
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <ColorSwatch hex={p.expectedHex} label={p.expectedColor} />
                        <div className="flex flex-wrap gap-1 justify-end">
                          {p.aliases.slice(0, 2).map((a) => (
                            <Badge key={a} variant="secondary" className="text-[10px]">
                              {a}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {selectedDrug && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FlaskRound className="h-4 w-4" /> Selected Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Substance</div>
                <div className="font-medium">{selectedDrug.target}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Test / Reagent</div>
                <div className="font-medium">{selectedDrug.testMethod}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Expected reaction</div>
                <div className="font-medium flex items-center gap-2">
                  <ColorSwatch hex={selectedDrug.expectedHex} />
                  <span>{selectedDrug.expectedColor}</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Reference hex</div>
                <div className="font-mono text-sm">{selectedDrug.expectedHex}</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{selectedDrug.interpretation}</p>
            <PresumptiveNotice />
            <div className="flex justify-end">
              <Button onClick={() => setView('new-test')} className="gap-1.5" disabled={!selectedDrug}>
                Continue to Capture <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
