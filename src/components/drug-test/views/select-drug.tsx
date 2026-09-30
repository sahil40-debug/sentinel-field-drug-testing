'use client'

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/store'
import type { DrugProfileDTO } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ColorSwatch, PresumptiveNotice, SectionHeading } from '../ui-bits'
import { Search, ArrowRight, FlaskRound, Check } from 'lucide-react'

export function SelectDrugStep() {
  const { setSelectedDrug, setView, selectedDrug } = useApp()
  const [profiles, setProfiles] = useState<DrugProfileDTO[] | null>(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    fetch('/api/drugs')
      .then((r) => r.json())
      .then((d) => setProfiles(Array.isArray(d?.profiles) ? d.profiles : []))
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <SectionHeading
          eyebrow="Step 1 of 3"
          title="Select a test"
          sub="Choose the substance the field test is intended to identify. The expected reaction colour depends on this selection."
        />
      </div>

      <Card className="card-soft">
        <CardContent className="p-5 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search by substance, alias, or reagent — e.g. cocaine, MDMA, Marquis…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-11 h-12 rounded-xl text-base"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
            <span>{profiles ? `${filtered.length} of ${profiles.length} substances` : 'Loading substances…'}</span>
          </div>

          {profiles === null ? (
            <div className="grid sm:grid-cols-2 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <Search className="h-8 w-8 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No matching substances found.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Try another substance, test name, or alias.</p>
            </div>
          ) : (
            <ul className="grid sm:grid-cols-2 gap-3 max-h-[32rem] overflow-y-auto scroll-soft pr-1">
              {filtered.map((p) => {
                const active = selectedDrug?.id === p.id
                return (
                  <li key={p.id}>
                    <button
                      onClick={() => setSelectedDrug(p)}
                      className={`group w-full text-left rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${
                        active ? 'border-primary ring-2 ring-primary/30 bg-primary/5' : 'border-border/70 bg-card hover:bg-accent/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{p.target}</div>
                          <div className="text-xs text-muted-foreground truncate mt-0.5">{p.testMethod}</div>
                        </div>
                        {active ? (
                          <span className="shrink-0 grid place-items-center h-6 w-6 rounded-full bg-primary text-primary-foreground">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        ) : (
                          <span className="shrink-0 h-9 w-9 rounded-xl border border-border/60" style={{ backgroundColor: p.expectedHex }} />
                        )}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <ColorSwatch hex={p.expectedHex} label={p.expectedColor} />
                        <div className="flex flex-wrap gap-1 justify-end">
                          {p.aliases.slice(0, 2).map((a) => (
                            <Badge key={a} variant="secondary" className="text-[10px] rounded-full">
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
        <Card className="card-soft border-primary/30 ring-1 ring-primary/10">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <FlaskRound className="h-4 w-4 text-primary" />
              <span className="display-eyebrow m-0">Selected test</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Substance</div>
                <div className="font-serif-display text-lg font-semibold mt-0.5">{selectedDrug.target}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Reagent / Test</div>
                <div className="font-medium mt-0.5">{selectedDrug.testMethod}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Expected reaction</div>
                <div className="mt-1.5">
                  <ColorSwatch hex={selectedDrug.expectedHex} label={selectedDrug.expectedColor} sub={selectedDrug.expectedHex} />
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Interpretation</div>
                <div className="text-sm mt-0.5 text-muted-foreground">{selectedDrug.interpretation}</div>
              </div>
            </div>
            <PresumptiveNotice />
            <div className="flex justify-end">
              <Button onClick={() => setView('new-test')} className="btn-pill gap-1.5 h-11 px-6">
                Continue to capture <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
