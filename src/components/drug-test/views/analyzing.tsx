'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, Loader2, Circle, FlaskRound } from 'lucide-react'
import { SectionHeading } from '../ui-bits'

const STEPS = [
  'Image received',
  'Image quality checked',
  'Reference card detection',
  'Reaction area detection',
  'Colour comparison',
  'Classifying result',
]

/**
 * Animated progress stepper. The steps auto-advance slowly to give the user
 * something to look at, but never mark the LAST step as done (because only the
 * actual API response can confirm completion). Once all but the last step are
 * done, a "waiting for the model" state shows until the parent unmounts us.
 */
export function AnalyzingState() {
  // step = number of steps completed (0..STEPS.length-1). The final step is
  // always "in progress" until the component is unmounted by the parent.
  const [step, setStep] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setStep((s) => Math.min(s + 1, STEPS.length - 1))
    }, 1100)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="max-w-2xl mx-auto space-y-8 py-6">
      <div className="text-center space-y-3">
        <div className="inline-grid place-items-center h-14 w-14 rounded-2xl bg-primary text-primary-foreground shadow-[0_10px_30px_-8px_oklch(0.3_0.08_290/0.5)]">
          <FlaskRound className="h-7 w-7" />
        </div>
        <SectionHeading
          eyebrow="In progress"
          title="Analyzing test"
          sub="The vision model is comparing the reaction colour against the expected reference for the selected test."
        />
      </div>

      <Card className="card-soft">
        <CardContent className="p-6">
          <ol className="space-y-1">
            {STEPS.map((label, i) => {
              const done = i < step
              const active = i === step
              const pending = i > step
              return (
                <li key={label} className="flex items-start gap-3 py-2.5 relative">
                  {i < STEPS.length - 1 && (
                    <span className="absolute left-[15px] top-10 h-[calc(100%-1rem)] w-px bg-border/60" aria-hidden />
                  )}
                  <span
                    className={`grid place-items-center h-8 w-8 rounded-full shrink-0 mt-0.5 transition-colors ${
                      done
                        ? 'bg-emerald-100 text-emerald-700'
                        : active
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground/50'
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : active ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Circle className="h-3 w-3" />
                    )}
                  </span>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div
                      className={`text-sm transition-colors ${
                        done || active ? 'font-medium text-foreground' : 'text-muted-foreground/50'
                      }`}
                    >
                      {label}
                    </div>
                    {active && i === STEPS.length - 1 && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Waiting for the model to return its verdict…
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
          {step >= STEPS.length - 1 && (
            <p className="text-center text-xs text-muted-foreground/70 pt-4">
              The vision model is still comparing colours — this can take up to 30 seconds.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
