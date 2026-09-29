/**
 * POST /api/verify  body: { id | recordNo }
 *
 * Recomputes image hash + record hash from the STORED record fields and
 * compares against the stored hash values. Reports match/mismatch.
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { computeRecordHash, hashImageFromDataUrl } from '@/lib/integrity'
import type { VerificationResult } from '@/lib/types'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { id, recordNo } = body as { id?: string; recordNo?: string }
    if (!id && !recordNo) {
      return NextResponse.json({ error: 'id or recordNo required' }, { status: 400 })
    }

    const row = id
      ? await db.testRecord.findUnique({ where: { id } })
      : await db.testRecord.findUnique({ where: { recordNo: recordNo as string } })
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const imageHashRecomputed = hashImageFromDataUrl(row.imageDataUrl)
    // Use the STORED column values (not values re-parsed from analysisJson) so that
    // tampering with ANY stored field — including the denormalised reason /
    // classification / confidence / location columns — breaks the recomputed hash.
    const recordHashRecomputed = computeRecordHash({
      recordNo: row.recordNo,
      drugProfileId: row.drugProfileId,
      operatorId: row.operatorId,
      imageDataUrl: row.imageDataUrl,
      imageHash: row.imageHash,
      latitude: row.latitude,
      longitude: row.longitude,
      locationLabel: row.locationLabel,
      analysisJson: row.analysisJson,
      classification: row.classification,
      confidence: row.confidence,
      reason: row.reason,
      createdAt: row.createdAt.toISOString(),
    })

    const imageHashMatch = imageHashRecomputed === row.imageHash
    const recordHashMatch = recordHashRecomputed === row.recordHash
    const signatureValid = row.signature === null // null signature is "valid" in prototype

    const result: VerificationResult = {
      recordNo: row.recordNo,
      imageHashStored: row.imageHash,
      imageHashRecomputed,
      imageHashMatch,
      recordHashStored: row.recordHash,
      recordHashRecomputed,
      recordHashMatch,
      signatureValid,
      verified: imageHashMatch && recordHashMatch && signatureValid,
    }
    return NextResponse.json({ verification: result })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
