/**
 * Records API
 *  GET  /api/records            -> list (optional ?q=&classification=&limit=)
 *  POST /api/records            -> finalize + store a record (computes hashes)
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { computeRecordHash, hashImageFromDataUrl } from '@/lib/integrity'
import { normaliseAnalysis, type AiAnalysisResult } from '@/lib/ai-schema'
import type { DrugProfileDTO, TestRecordDTO } from '@/lib/types'

function nextRecordNo(existing: number): string {
  const n = (existing + 1).toString().padStart(4, '0')
  return `TEST-2026-${n}`
}

function rowToDto(r: {
  id: string
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
  recordHash: string
  signature: string | null
  createdAt: Date
  drugProfile?: {
    id: string
    target: string
    aliases: string
    testMethod: string
    expectedColor: string
    expectedHex: string
    interpretation: string
    source: string
  } | null
}): TestRecordDTO {
  return {
    id: r.id,
    recordNo: r.recordNo,
    drugProfileId: r.drugProfileId,
    drugProfile: r.drugProfile
      ? ({
          id: r.drugProfile.id,
          target: r.drugProfile.target,
          aliases: JSON.parse(r.drugProfile.aliases) as string[],
          testMethod: r.drugProfile.testMethod,
          expectedColor: r.drugProfile.expectedColor,
          expectedHex: r.drugProfile.expectedHex,
          interpretation: r.drugProfile.interpretation,
          source: r.drugProfile.source,
        } satisfies DrugProfileDTO)
      : undefined,
    operatorId: r.operatorId,
    imageDataUrl: r.imageDataUrl,
    imageHash: r.imageHash,
    latitude: r.latitude,
    longitude: r.longitude,
    locationLabel: r.locationLabel,
    analysis: normaliseAnalysis(JSON.parse(r.analysisJson)),
    classification: r.classification as TestRecordDTO['classification'],
    confidence: r.confidence,
    reason: r.reason,
    recordHash: r.recordHash,
    signature: r.signature,
    createdAt: r.createdAt.toISOString(),
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim().toLowerCase() ?? ''
    const classification = searchParams.get('classification')?.trim() || null
    const limit = Math.min(Number(searchParams.get('limit') ?? '100'), 200)

    const rows = await db.testRecord.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { drugProfile: true },
    })

    let dtos: TestRecordDTO[] = rows.map(rowToDto)

    if (q) {
      dtos = dtos.filter((d) => {
        const hay = `${d.recordNo} ${d.drugProfile?.target ?? ''} ${d.drugProfile?.id ?? ''} ${d.operatorId} ${d.locationLabel ?? ''}`.toLowerCase()
        return hay.includes(q)
      })
    }
    if (classification && classification !== 'All') {
      dtos = dtos.filter((d) => d.classification === classification)
    }
    return NextResponse.json({ records: dtos, total: dtos.length })
  } catch (e) {
    // DB not ready — return empty list so the History UI doesn't crash.
    return NextResponse.json({ records: [], total: 0 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { imageDataUrl, drugProfileId, analysis, operatorId, location } = body as {
      imageDataUrl?: string
      drugProfileId?: string
      analysis?: AiAnalysisResult
      operatorId?: string
      location?: { latitude?: number; longitude?: number; label?: string } | null
    }

    if (!imageDataUrl || !drugProfileId || !analysis) {
      return NextResponse.json({ error: 'imageDataUrl, drugProfileId and analysis are required' }, { status: 400 })
    }
    const profile = await db.drugProfile.findUnique({ where: { id: drugProfileId } })
    if (!profile) return NextResponse.json({ error: 'Unknown drug profile' }, { status: 404 })

    const op = operatorId?.trim() || 'OFFICER-01'
    const imageHash = hashImageFromDataUrl(imageDataUrl)
    const analysisJson = JSON.stringify(analysis)

    const lat = typeof location?.latitude === 'number' ? location.latitude : null
    const lng = typeof location?.longitude === 'number' ? location.longitude : null
    const locationLabel = location?.label?.trim() || null

    const count = await db.testRecord.count()
    const recordNo = nextRecordNo(count)

    await db.testRecord.create({
      data: {
        recordNo,
        drugProfileId,
        operatorId: op,
        imageDataUrl,
        imageHash,
        latitude: lat,
        longitude: lng,
        locationLabel,
        analysisJson,
        classification: analysis.classification,
        confidence: analysis.confidence,
        reason: analysis.reason,
        recordHash: 'PENDING', // computed below from stored values
        signature: null, // prototype: no RSA signing yet
      },
    })

    // Re-fetch the stored row so the hash is computed from the EXACT values
    // that verification will read back later (avoids timestamp precision
    // mismatches between INSERT and SELECT on Postgres).
    const stored = await db.testRecord.findUnique({ where: { recordNo } })
    if (!stored) throw new Error('Failed to read back created record')

    const recordHash = computeRecordHash({
      recordNo: stored.recordNo,
      drugProfileId: stored.drugProfileId,
      operatorId: stored.operatorId,
      imageDataUrl: stored.imageDataUrl,
      imageHash: stored.imageHash,
      latitude: stored.latitude,
      longitude: stored.longitude,
      locationLabel: stored.locationLabel,
      analysisJson: stored.analysisJson,
      classification: stored.classification,
      confidence: stored.confidence,
      reason: stored.reason,
      createdAt: stored.createdAt.toISOString(),
    })

    const updated = await db.testRecord.update({
      where: { id: stored.id },
      data: { recordHash },
      include: { drugProfile: true },
    })

    return NextResponse.json({ record: rowToDto(updated) })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
