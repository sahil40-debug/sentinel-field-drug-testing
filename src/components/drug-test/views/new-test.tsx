'use client'

import { useApp } from '@/lib/store'
import { SelectDrugStep } from './select-drug'
import { CaptureStep } from './capture'
import { AnalyzingState } from './analyzing'
import { ResultStep } from './result'

type Step = 'select' | 'capture' | 'analyzing' | 'result'

export function NewTestView() {
  const { selectedDrug, capturedImage, analysing, analysis } = useApp()

  let step: Step = 'select'
  if (analysis) step = 'result'
  else if (analysing) step = 'analyzing'
  else if (capturedImage || selectedDrug) step = 'capture'
  else step = 'select'

  if (step === 'select') return <SelectDrugStep />
  if (step === 'analyzing') return <AnalyzingState />
  if (step === 'result') return <ResultStep />
  return <CaptureStep />
}
