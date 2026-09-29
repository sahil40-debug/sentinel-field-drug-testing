'use client'

import { useState } from 'react'
import { useApp } from '@/lib/store'
import type { VerificationResult } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { shortHash } from '@/lib/integrity'
import { CheckCircle2, XCircle, Loader2, ShieldCheck, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'

export function VerificationView() {
  const { verification, setVerification, activeRecord } = useApp()
  const [recordNo, setRecordNo] = useState(activeRecord?.recordNo ?? verification?.recordNo ?? '')
  const [loading, setLoading] = useState(false)

  const verify = async (no?: string) => {
    const target = (no ?? recordNo).trim()
    if (!target) return
    setLoading(true)
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordNo: target }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Verification failed')
      setVerification(d.verification)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Verification failed')
      setVerification(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Verify Record</h1>
        <p className="text-sm text-muted-foreground">
          Recompute the image hash and record hash from stored fields and compare against the stored integrity values.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Record lookup</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Input
            placeholder="Record no e.g. TEST-2026-0001"
            value={recordNo}
            onChange={(e) => setRecordNo(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && verify()}
            className="max-w-xs"
          />
          <Button onClick={() => verify()} disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Verify
          </Button>
        </CardContent>
      </Card>

      {verification && <VerificationResultCard v={verification} />}
    </div>
  )
}

function VerificationResultCard({ v }: { v: VerificationResult }) {
  const ok = v.verified
  return (
    <Card className={ok ? 'border-emerald-300 bg-emerald-50/40' : 'border-rose-300 bg-rose-50/40'}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          {ok ? <ShieldCheck className="h-5 w-5 text-emerald-600" /> : <ShieldAlert className="h-5 w-5 text-rose-600" />}
          Verification Result
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm">
          <span className="text-muted-foreground">Record: </span>
          <span className="font-mono font-medium">{v.recordNo}</span>
        </div>
        <ul className="space-y-2 text-sm">
          <HashCompare label="Image hash" stored={v.imageHashStored} computed={v.imageHashRecomputed} match={v.imageHashMatch} />
          <HashCompare label="Record hash" stored={v.recordHashStored} computed={v.recordHashRecomputed} match={v.recordHashMatch} />
          <li className="flex items-center gap-2">
            {v.signatureValid ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <XCircle className="h-4 w-4 text-rose-600" />}
            <span className="text-muted-foreground w-28">Digital signature</span>
            <span className="font-medium">{v.signatureValid ? 'VALID (none in prototype)' : 'INVALID'}</span>
          </li>
        </ul>
        <div className={`rounded-md border px-4 py-3 text-center ${ok ? 'border-emerald-300 bg-emerald-100 text-emerald-800' : 'border-rose-300 bg-rose-100 text-rose-800'}`}>
          <div className="text-xs uppercase tracking-wide">Integrity status</div>
          <div className="text-xl font-bold mt-0.5">{ok ? '✓ VERIFIED' : '✕ VERIFICATION FAILED'}</div>
          {!ok && (
            <p className="text-xs mt-1">The stored record does not match its integrity information.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function HashCompare({ label, stored, computed, match }: { label: string; stored: string; computed: string; match: boolean }) {
  return (
    <li className="flex items-start gap-2">
      {match ? <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5" /> : <XCircle className="h-4 w-4 text-rose-600 mt-0.5" />}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground w-28">{label}</span>
          <span className={`text-xs font-semibold ${match ? 'text-emerald-600' : 'text-rose-600'}`}>{match ? '✓ MATCH' : '✕ MISMATCH'}</span>
        </div>
        <div className="font-mono text-[11px] text-muted-foreground mt-0.5">
          stored: {shortHash(stored)}
        </div>
        <div className="font-mono text-[11px] text-muted-foreground">
          recomputed: {shortHash(computed)}
        </div>
      </div>
    </li>
  )
}
