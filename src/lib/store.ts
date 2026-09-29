/**
 * Client app store (zustand).
 *
 * Holds the auth state, the active view, and the in-progress new-test flow
 * (selected drug, captured image, analysis result, GPS location) so the
 * single-page app can move between views without a router.
 */
import { create } from 'zustand'
import { normaliseAnalysis, type AiAnalysisResult, type Classification } from './ai-schema'
import type { DrugProfileDTO, TestRecordDTO, VerificationResult } from './types'

export interface GeoLocation {
  latitude: number
  longitude: number
  label?: string
}

export type View =
  | 'login'
  | 'dashboard'
  | 'new-test'
  | 'history'
  | 'record-detail'
  | 'verification'

interface AppState {
  // auth (lightweight, prototype)
  authed: boolean
  operatorId: string
  login: (operatorId: string) => void
  logout: () => void

  // navigation
  view: View
  setView: (v: View) => void

  // new-test flow
  selectedDrug: DrugProfileDTO | null
  setSelectedDrug: (d: DrugProfileDTO | null) => void
  capturedImage: string | null // data URL
  setCapturedImage: (img: string | null) => void
  location: GeoLocation | null
  setLocation: (l: GeoLocation | null) => void
  analysis: { result: AiAnalysisResult; imageHash: string; drug: DrugProfileDTO } | null
  setAnalysis: (a: AppState['analysis']) => void
  analysing: boolean
  setAnalysing: (b: boolean) => void
  /** Fully reset the in-progress new-test flow (selected drug, image, location, result). */
  resetFlow: () => void

  // selected record (for detail view)
  activeRecord: TestRecordDTO | null
  setActiveRecord: (r: TestRecordDTO | null) => void

  // verification
  verification: VerificationResult | null
  setVerification: (v: VerificationResult | null) => void

  // badge counters
  classifyColor: (c: Classification) => string
}

export const useApp = create<AppState>((set) => ({
  authed: false,
  operatorId: '',
  login: (operatorId) => set({ authed: true, operatorId: operatorId || 'OFFICER-01', view: 'dashboard' }),
  logout: () =>
    set({
      authed: false,
      operatorId: '',
      view: 'login',
      selectedDrug: null,
      capturedImage: null,
      location: null,
      analysis: null,
      activeRecord: null,
      verification: null,
    }),

  view: 'login',
  setView: (view) => set({ view }),

  selectedDrug: null,
  setSelectedDrug: (selectedDrug) => set({ selectedDrug }),
  capturedImage: null,
  setCapturedImage: (capturedImage) => set({ capturedImage }),
  location: null,
  setLocation: (location) => set({ location }),
  analysis: null,
  setAnalysis: (analysis) => set({ analysis }),
  analysing: false,
  setAnalysing: (analysing) => set({ analysing }),
  resetFlow: () =>
    set({
      selectedDrug: null,
      capturedImage: null,
      location: null,
      analysis: null,
      activeRecord: null,
      verification: null,
      analysing: false,
    }),

  activeRecord: null,
  setActiveRecord: (activeRecord) => set({ activeRecord }),

  verification: null,
  setVerification: (verification) => set({ verification }),

  classifyColor: (c) =>
    c === 'Positive' ? 'text-emerald-600' : c === 'Negative' ? 'text-rose-600' : 'text-amber-600',
}))

/** Helper to safely parse a stored analysis JSON (handles legacy `caveats`). */
export { normaliseAnalysis }
