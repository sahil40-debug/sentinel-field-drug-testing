/**
 * Shared client/server types for the drug-testing app.
 * No 'server-only' imports here so this can be imported anywhere.
 */
import type { z } from 'zod'
import type { AiAnalysisResultSchema } from './ai-schema'

export type AiAnalysisResult = z.infer<typeof AiAnalysisResultSchema>
export type Classification = AiAnalysisResult['classification']

export interface DrugProfileDTO {
  id: string
  target: string
  aliases: string[]
  testMethod: string
  expectedColor: string
  expectedHex: string
  interpretation: string
  source: string
}

export interface TestRecordDTO {
  id: string
  recordNo: string
  drugProfileId: string
  drugProfile?: DrugProfileDTO
  operatorId: string
  imageDataUrl: string
  imageHash: string
  analysis: AiAnalysisResult
  classification: Classification
  confidence: number
  reason: string
  recordHash: string
  signature: string | null
  createdAt: string
}

export interface VerificationResult {
  recordNo: string
  imageHashStored: string
  imageHashRecomputed: string
  imageHashMatch: boolean
  recordHashStored: string
  recordHashRecomputed: string
  recordHashMatch: boolean
  signatureValid: boolean
  verified: boolean
}
