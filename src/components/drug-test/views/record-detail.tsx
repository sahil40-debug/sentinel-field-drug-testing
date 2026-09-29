'use client'

import { useState } from 'react'
import { useApp } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { shortHash } from '@/lib/integrity'
import { formatLocation, mapsLink } from '@/lib/geo'
import { ColorSwatch, ResultBadge, PresumptiveNotice } from '../ui-bits'
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion'
import { ArrowLeft, ShieldCheck, Loader2, CheckCircle2, MapPin, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

export function RecordDetailView() {
  const { activeRecord, setView, setVerification } = useApp()
  const [verifying, setVerifying] = useState(false)

  if (!activeRecord) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">No record selected.</p>
        <Button variant="outline" onClick={() => setView('history')} className="gap-1.5 btn-pill">
          <ArrowLeft className="h-4 w-4" /> Back to history
        </Button>
      </div>
    )
  }

  const r = activeRecord
  const a = r.analysis
  const loc = r.latitude != null && r.longitude != null ? { latitude: r.latitude, longitude: r.longitude, label: r.locationLabel ?? undefined } : null

  const verifyNow = async () => {
    setVerifying(true)
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordNo: r.recordNo }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Verification failed')
      setVerification(d.verification)
      setView('verification')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Verification failed')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="space-y-1">
          <div className="display-eyebrow">Record</div>
          <h1 className="display-heading text-3xl sm:text-4xl">Test record</h1>
          <p className="text-sm text-muted-foreground font-mono">{r.recordNo}</p>
        </div>
        <Button variant="outline" onClick={() => setView('history')} className="btn-pill gap-1.5">
          <ArrowLeft className="h-4 w-4" /> History
        </Button>
      </div>

      <Card className="card-soft">
        <CardContent className="p-5 grid sm:grid-cols-2 gap-5 text-sm">
          <Field label="Substance" value={r.drugProfile?.target ?? r.drugProfileId} />
          <Field label="Test / Reagent" value={r.drugProfile?.testMethod ?? '—'} />
          <Field label="Result" value={<ResultBadge c={r.classification} />} />
          <Field label="Confidence" value={`${Math.round(r.confidence * 100)}%`} />
          <Field label="Operator" value={r.operatorId} />
          <Field label="Timestamp" value={new Date(r.createdAt).toLocaleString()} />
          {loc && (
            <div className="sm:col-span-2">
              <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><MapPin className="h-3 w-3" /> GPS location</div>
              <div className="rounded-xl bg-muted/40 px-3 py-2.5 text-sm">
                <div className="font-medium break-words">{formatLocation(loc)}</div>
                <a href={mapsLink(loc) ?? '#'} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5 text-xs mt-1">
                  View on map <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}
          <div className="sm:col-span-2">
            <div className="text-xs text-muted-foreground mb-1">Reason</div>
            <p className="text-sm leading-relaxed">{r.reason}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="card-soft">
          <CardContent className="p-5">
            <div className="display-eyebrow mb-3">Captured image</div>
            <div className="overflow-hidden rounded-2xl border bg-black grid place-items-center aspect-video">
              <img src={r.imageDataUrl} alt="Field test evidence" className="h-full w-full object-contain" />
            </div>
          </CardContent>
        </Card>

        <Card className="card-soft">
          <CardContent className="p-5 space-y-4">
            <div className="display-eyebrow">Colour evidence</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1.5">Expected reaction</div>
                <ColorSwatch hex={a.expected_colour.hex} label={a.expected_colour.name} sub={a.expected_colour.hex} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1.5">Observed reaction</div>
                <ColorSwatch hex={a.observed_colour.hex} label={a.observed_colour.name} sub={`rgb(${a.observed_colour.rgb.join(', ')})`} />
              </div>
            </div>
            <div className="rounded-xl bg-muted/40 p-3 text-xs space-y-1">
              <div>Colour match: <span className="font-medium">{a.colour_match}</span></div>
              <div>Image quality: <span className="font-medium">{a.image_quality}</span></div>
              <div>Reference card: <span className="font-medium">{a.reference_card_detected ? 'detected' : 'not detected'}</span></div>
              <div>Reaction area: <span className="font-medium">{a.reaction_area_detected ? 'detected' : 'not detected'}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-soft">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <div className="display-eyebrow">Integrity</div>
            <h3 className="display-heading text-lg mt-0.5">Tamper-evident hash</h3>
          </div>
          <Button size="sm" onClick={verifyNow} disabled={verifying} className="btn-pill gap-1.5">
            {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Verify record
          </Button>
        </div>
        <CardContent className="px-5 pb-5 space-y-2.5 text-sm">
          <HashRow label="Image hash" value={r.imageHash} />
          <HashRow label="Record hash" value={r.recordHash} />
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground w-28">Signature</span>
            {r.signature ? <span className="font-mono text-xs">{shortHash(r.signature)}</span> : <span className="text-xs text-muted-foreground">none (prototype)</span>}
          </div>
        </CardContent>
      </Card>

      <Card className="card-soft">
        <CardContent className="p-5">
          <div className="display-eyebrow mb-3">Reason &amp; notes</div>
          <Accordion type="multiple">
            <AccordionItem value="reason">
              <AccordionTrigger>Model reasoning</AccordionTrigger>
              <AccordionContent className="text-sm">{a.reason}</AccordionContent>
            </AccordionItem>
            <AccordionItem value="notes">
              <AccordionTrigger>Notes &amp; limitations ({a.notes.length})</AccordionTrigger>
              <AccordionContent>
                {a.notes.length ? (
                  <ul className="list-disc pl-5 text-sm space-y-1">{a.notes.map((c, i) => <li key={i}>{c}</li>)}</ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No additional notes.</p>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <PresumptiveNotice />
    </div>
  )
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium mt-0.5">{value}</div>
    </div>
  )
}

function HashRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground w-28">{label}</span>
      <span className="font-mono text-xs flex-1 truncate">{value}</span>
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
    </div>
  )
}
