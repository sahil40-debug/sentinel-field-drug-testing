/**
 * Integrity / hashing utilities.
 *
 * - imageHash:   SHA-256 of the raw image bytes (hex).
 * - recordHash:  SHA-256 over a CANONICAL serialisation of the record (hex).
 *
 * The canonical form is JSON with sorted keys and excludes the recordHash field
 * itself, so a stored record can be re-verified by recomputing the hash from
 * the stored fields and comparing to the stored recordHash.
 */
import { createHash } from 'node:crypto'

/** SHA-256 hex digest of a Buffer/string. */
export function sha256Hex(input: Buffer | string): string {
  return createHash('sha256').update(input).digest('hex')
}

/** Hash of the raw image bytes given a base64 data URL. */
export function hashImageFromDataUrl(dataUrl: string): string {
  const b64 = dataUrl.split(',')[1] ?? ''
  return sha256Hex(Buffer.from(b64, 'base64'))
}

/**
 * Canonical record payload used to compute the record hash.
 * `recordHash` and `signature` are intentionally excluded so that
 * the hash can be recomputed from the stored fields for verification.
 */
export interface RecordHashPayload {
  recordNo: string
  drugProfileId: string
  operatorId: string
  imageDataUrl: string
  imageHash: string
  latitude: number | null
  longitude: number | null
  locationLabel: string | null
  analysisJson: string
  classification: string
  confidence: number
  reason: string
  createdAt: string // ISO
}

function canonicalise(obj: RecordHashPayload): string {
  const keys: (keyof RecordHashPayload)[] = [
    'recordNo',
    'drugProfileId',
    'operatorId',
    'imageDataUrl',
    'imageHash',
    'latitude',
    'longitude',
    'locationLabel',
    'analysisJson',
    'classification',
    'confidence',
    'reason',
    'createdAt',
  ]
  const ordered: Record<string, unknown> = {}
  for (const k of keys) ordered[k] = obj[k]
  return JSON.stringify(ordered)
}

export function computeRecordHash(payload: RecordHashPayload): string {
  return sha256Hex(canonicalise(payload))
}

export function shortHash(h: string): string {
  if (!h) return '—'
  return `${h.slice(0, 8)}…${h.slice(-6)}`
}
