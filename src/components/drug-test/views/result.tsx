'use client'

import { useState } from 'react'
import { useApp } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { shortHash } from '@/lib/integrity'
import { formatLocation, mapsLink } from '@/lib/geo'
import type { TestRecordDTO } from '@/lib/types'
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion'
import { ColorSwatch, ResultBadge, PresumptiveNotice, SectionHeading } from '../ui-bits'
import {
  Save, Plus, AlertCircle, CheckCircle2, XCircle, Loader2,
  ShieldCheck, MapPin, ExternalLink, ArrowLeft,
} from 'lucide-react'
import { toast } from 'sonner'

export function ResultStep() {
  const {
    analysis, capturedImage, selectedDrug, operatorId, setView, setActiveRecord,
    setSelectedDrug, setCapturedImage, setAnalysis, setVerification, location, setLocation, resetFlow,
  } = useApp()
  const [saving, setSaving] = useState(false)
  const [savedRecord, setSavedRecord] = useState<TestRecordDTO | null>(null)

  if (!analysis || !selectedDrug) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">No analysis result available.</p>
        <Button onClick={() => { resetFlow(); setView('new-test') }} className="gap-1.5 btn-pill">
          <Plus className="h-4 w-4" /> Start a new test
        </Button>
      </div>
    )
  }

  const { result, imageHash } = analysis
  const big =
    result.classification === 'Positive'
      ? { icon: CheckCircle2, color: 'text-emerald-600', ring: 'border-emerald-300 bg-emerald-50/60' }
      : result.classification === 'Negative'
        ? { icon: XCircle, color: 'text-rose-600', ring: 'border-rose-300 bg-rose-50/60' }
        : { icon: AlertCircle, color: 'text-amber-600', ring: 'border-amber-300 bg-amber-50/60' }
  const BigIcon = big.icon

  const save = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl: capturedImage,
          drugProfileId: selectedDrug.id,
          analysis: result,
          operatorId,
          location: location
            ? { latitude: location.latitude, longitude: location.longitude, label: location.label }
            : null,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Save failed')
      setSavedRecord(d.record)
      setActiveRecord(d.record)
      toast.success(`Record ${d.record.recordNo} finalized & integrity hash generated.`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const verifyNow = async () => {
    if (!savedRecord) return
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordNo: savedRecord.recordNo }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Verification failed')
      setVerification(d.verification)
      setView('verification')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Verification failed')
    }
  }

  const startNew = () => {
    resetFlow()
    setSavedRecord(null)
    setView('new-test')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <SectionHeading eyebrow="Step 3 of 3" title="Test result" sub={`${selectedDrug.target} · ${selectedDrug.testMethod}`} />
        {savedRecord ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={verifyNow} className="btn-pill gap-1.5 h-11">
              <ShieldCheck className="h-4 w-4" /> Verify
            </Button>
            <Button onClick={startNew} className="btn-pill gap-1.5 h-11">
              <Plus className="h-4 w-4" /> New test
            </Button>
          </div>
        ) : (
          <Button variant="ghost" onClick={() => setView('new-test')} className="btn-pill gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        )}
      </div>

      {/* Result hero card */}
      <Card className={`card-soft border-2 ${big.ring}`}>
        <CardContent className="p-8 flex flex-col items-center text-center gap-3">
          <BigIcon className={`h-16 w-16 ${big.color}`} strokeWidth={1.5} />
          <div className={`text-5xl font-extrabold tracking-tight ${big.color} font-serif-display`}>
            {result.classification.toUpperCase()}
          </div>
          <div className="text-sm text-muted-foreground">
            Confidence <span className="font-semibold text-foreground">{Math.round(result.confidence * 100)}%</span>
          </div>
          <p className="max-w-prose text-sm leading-relaxed">{result.reason}</p>
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <Badge variant="outline" className="rounded-full">Colour match: {result.colour_match}</Badge>
            <Badge variant="outline" className="rounded-full">Image: {result.image_quality}</Badge>
            <Badge variant="outline" className="rounded-full">Ref card: {result.reference_card_detected ? 'detected' : 'not detected'}</Badge>
            <Badge variant="outline" className="rounded-full">Reaction area: {result.reaction_area_detected ? 'detected' : 'not detected'}</Badge>
          </div>
          <div className="pt-2"><PresumptiveNotice /></div>
        </CardContent>
      </Card>

      {/* Save CTA / saved confirmation */}
      {!savedRecord ? (
        <Card className="card-soft">
          <CardContent className="p-5 flex flex-wrap items-center gap-3 justify-between">
            <div>
              <div className="font-medium">Finalize this test record?</div>
              <p className="text-xs text-muted-foreground">Once finalized, the record and its integrity hash are stored. GPS location {location ? 'will be included' : 'will not be included (not captured)'}.</p>
            </div>
            <Button onClick={save} disabled={saving} className="btn-pill gap-1.5 h-11 px-6">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save test record
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="card-soft border-emerald-200 bg-emerald-50/40">
          <CardContent className="p-5 flex items-center gap-4 flex-wrap">
            <ShieldCheck className="h-6 w-6 text-emerald-600 shrink-0" />
            <div className="text-sm min-w-0">
              <div className="font-medium">Record finalized: {savedRecord.recordNo}</div>
              <div className="text-xs text-muted-foreground font-mono">
                record hash {shortHash(savedRecord.recordHash)} · image hash {shortHash(savedRecord.imageHash)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Evidence grid */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="card-soft">
          <CardContent className="p-5">
            <div className="display-eyebrow mb-3">Captured image</div>
            <div className="overflow-hidden rounded-2xl border bg-black grid place-items-center aspect-video">
              <img src={capturedImage ?? ''} alt="Field test" className="h-full w-full object-contain" />
            </div>
            {location && (
              <div className="mt-3 rounded-xl bg-muted/40 px-3 py-2 flex items-start gap-2 text-xs">
                <MapPin className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-muted-foreground">GPS</div>
                  <div className="font-medium break-words">{formatLocation(location)}</div>
                  <a href={mapsLink(location) ?? '#'} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5 mt-1">
                    View on map <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="card-soft">
          <CardContent className="p-5 space-y-4">
            <div className="display-eyebrow">Colour evidence</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1.5">Expected reaction</div>
                <ColorSwatch hex={result.expected_colour.hex} label={result.expected_colour.name} sub={result.expected_colour.hex} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1.5">Observed reaction</div>
                <ColorSwatch hex={result.observed_colour.hex} label={result.observed_colour.name} sub={`rgb(${result.observed_colour.rgb.join(', ')})`} />
              </div>
            </div>
            <div className="rounded-xl bg-muted/40 p-3 text-xs space-y-1">
              <div>Target substance: <span className="font-medium">{selectedDrug.target}</span></div>
              <div>Reagent: <span className="font-medium">{selectedDrug.testMethod}</span></div>
              <div>Source: <span className="text-muted-foreground">{selectedDrug.source}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-soft">
        <CardContent className="p-5">
          <div className="display-eyebrow mb-3">Analysis basis</div>
          <Accordion type="multiple">
            <AccordionItem value="basis">
              <AccordionTrigger>How the result was produced</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-1">
                <p>The vision model received the captured image plus the selected test definition (target substance, reagent, expected reaction colour, representative reference hex) and was asked to compare the reaction-area colour to the expected colour and return a structured JSON result.</p>
                <p className="text-xs">This is a presumptive field-testing result. The meaning of Positive/Negative is defined by the selected test type and its corresponding test-kit interpretation.</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="notes">
              <AccordionTrigger>Notes &amp; limitations ({result.notes.length})</AccordionTrigger>
              <AccordionContent>
                {result.notes.length ? (
                  <ul className="list-disc pl-5 text-sm space-y-1">{result.notes.map((c, i) => <li key={i}>{c}</li>)}</ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No additional notes from the model.</p>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  )
}
