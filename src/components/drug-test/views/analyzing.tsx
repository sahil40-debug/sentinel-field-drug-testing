'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, Loader2, Circle } from 'lucide-react'

const STEPS = [
  'Image received',
  'Image quality checked',
  'Reference card detection',
  'Reaction area detection',
  'Colour comparison',
  'Classifying result',
]

export function AnalyzingState() {
  const [step, setStep] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 900)
    return () => clearInterval(t)
  }, [])
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="font-medium">Analyzing test…</span>
        </div>
        <ul className="space-y-2">
          {STEPS.map((label, i) => {
            const done = i < step
            const active = i === step
            return (
              <li key={label} className="flex items-center gap-2 text-sm">
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : active ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/40" />
                )}
                <span className={done ? '' : active ? 'font-medium' : 'text-muted-foreground'}>{label}</span>
              </li>
            )
          })}
        </ul>
        <p className="text-xs text-muted-foreground">
          The vision model is comparing the reaction colour against the expected reference for the selected test.
        </p>
      </CardContent>
    </Card>
  )
}
