'use client'

import { useState } from 'react'
import { useApp } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { shortHash } from '@/lib/integrity'
import type { TestRecordDTO } from '@/lib/types'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { ColorSwatch, ResultBadge, PresumptiveNotice } from '../ui-bits'
import {
  Save,
  Plus,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'

export function ResultStep() {
  const { analysis, capturedImage, selectedDrug, operatorId, setView, setActiveRecord, setSelectedDrug, setCapturedImage, setAnalysis, setVerification } = useApp()
  const [saving, setSaving] = useState(false)
  const [savedRecord, setSavedRecord] = useState<TestRecordDTO | null>(null)

  if (!analysis || !selectedDrug) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">No analysis result available.</p>
        <Button onClick={() => setView('new-test')} className="gap-1.5">
          <Plus className="h-4 w-4" /> Start a new test
        </Button>
      </div>
    )
  }

  const { result, imageHash } = analysis
  const big =
    result.classification === 'Positive'
      ? { icon: CheckCircle2, color: 'text-emerald-600', ring: 'border-emerald-300 bg-emerald-50' }
      : result.classification === 'Negative'
        ? { icon: XCircle, color: 'text-rose-600', ring: 'border-rose-300 bg-rose-50' }
        : { icon: AlertCircle, color: 'text-amber-600', ring: 'border-amber-300 bg-amber-50' }
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

  const startNew = () => {
    setSelectedDrug(null)
    setCapturedImage(null)
    setAnalysis(null)
    setSavedRecord(null)
    setView('new-test')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Test Result</h1>
          <p className="text-sm text-muted-foreground">
            {selectedDrug.target} · {selectedDrug.testMethod}
          </p>
        </div>
        {savedRecord ? (
          <Button onClick={startNew} className="gap-1.5">
            <Plus className="h-4 w-4" /> New test
          </Button>
        ) : (
          <Button onClick={save} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save test record
          </Button>
        )}
      </div>

      <Card className={`${big.ring} border-2`}>
        <CardContent className="p-6 flex flex-col items-center text-center gap-3">
          <BigIcon className={`h-14 w-14 ${big.color}`} />
          <div className={`text-4xl font-extrabold tracking-tight ${big.color}`}>{result.classification.toUpperCase()}</div>
          <div className="text-sm text-muted-foreground">
            Confidence <span className="font-semibold text-foreground">{Math.round(result.confidence * 100)}%</span>
          </div>
          <p className="max-w-prose text-sm">{result.reason}</p>
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <Badge variant="outline">Colour match: {result.colour_match}</Badge>
            <Badge variant="outline">Image: {result.image_quality}</Badge>
            <Badge variant="outline">Ref card: {result.reference_card_detected ? 'detected' : 'not detected'}</Badge>
          </div>
          <PresumptiveNotice />
        </CardContent>
      </Card>

      {savedRecord && (
        <Card className="border-emerald-200 bg-emerald-50/40">
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
            <div className="text-sm">
              <div className="font-medium">Record finalized: {savedRecord.recordNo}</div>
              <div className="text-xs text-muted-foreground font-mono">
                record hash {shortHash(savedRecord.recordHash)} · image hash {shortHash(savedRecord.imageHash)}
              </div>
            </div>
            <Button variant="outline" size="sm" className="ml-auto" onClick={async () => {
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
            }}>
              Verify
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Captured image</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-lg border bg-black grid place-items-center aspect-video">
              <img src={capturedImage ?? ''} alt="Field test" className="h-full w-full object-contain" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Colour evidence</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Expected reaction</div>
                <ColorSwatch hex={result.expected_colour.hex} label={result.expected_colour.name} sub={result.expected_colour.hex} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Observed reaction</div>
                <ColorSwatch hex={result.observed_colour.hex} label={result.observed_colour.name} sub={`rgb(${result.observed_colour.rgb.join(', ')})`} />
              </div>
            </div>
            <div className="rounded-md bg-muted/40 p-3 text-xs space-y-1">
              <div>Target substance: <span className="font-medium">{selectedDrug.target}</span></div>
              <div>Reagent: <span className="font-medium">{selectedDrug.testMethod}</span></div>
              <div>Source: <span className="text-muted-foreground">{selectedDrug.source}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Analysis basis</CardTitle></CardHeader>
        <CardContent>
          <Accordion type="multiple">
            <AccordionItem value="basis">
              <AccordionTrigger>How the result was produced</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground space-y-1">
                <p>The vision model received the captured image plus the selected test definition (target substance, reagent, expected reaction colour, representative reference hex) and was asked to compare the reaction-area colour to the expected colour and return a structured JSON result.</p>
                <p className="text-xs">This is a presumptive field-testing result. The meaning of Positive/Negative is defined by the selected test type and its corresponding test-kit interpretation.</p>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="caveats">
              <AccordionTrigger>Caveats ({result.caveats.length})</AccordionTrigger>
              <AccordionContent>
                {result.caveats.length ? (
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {result.caveats.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No caveats reported by the model.</p>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  )
}
