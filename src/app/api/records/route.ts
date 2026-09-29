/**
 * Records API
 *  GET  /api/records            -> list (optional ?q=&classification=&limit=)
 *  POST /api/records            -> finalize + store a record (computes hashes)
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { computeRecordHash, hashImageFromDataUrl } from '@/lib/integrity'
import type { AiAnalysisResult, DrugProfileDTO, TestRecordDTO } from '@/lib/types'

function nextRecordNo(existing: number): string {
  const n = (existing + 1).toString().padStart(4, '0')
  return `TEST-2026-${n}`
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

    let dtos: TestRecordDTO[] = rows.map((r) => ({
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
      analysis: JSON.parse(r.analysisJson) as AiAnalysisResult,
      classification: r.classification as TestRecordDTO['classification'],
      confidence: r.confidence,
      reason: r.reason,
      recordHash: r.recordHash,
      signature: r.signature,
      createdAt: r.createdAt.toISOString(),
    }))

    if (q) {
      dtos = dtos.filter((d) => {
        const hay = `${d.recordNo} ${d.drugProfile?.target ?? ''} ${d.drugProfile?.id ?? ''} ${d.operatorId}`.toLowerCase()
        return hay.includes(q)
      })
    }
    if (classification && classification !== 'All') {
      dtos = dtos.filter((d) => d.classification === classification)
    }
    return NextResponse.json({ records: dtos, total: dtos.length })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { imageDataUrl, drugProfileId, analysis, operatorId } = body as {
      imageDataUrl?: string
      drugProfileId?: string
      analysis?: AiAnalysisResult
      operatorId?: string
    }

    if (!imageDataUrl || !drugProfileId || !analysis) {
      return NextResponse.json({ error: 'imageDataUrl, drugProfileId and analysis are required' }, { status: 400 })
    }
    const profile = await db.drugProfile.findUnique({ where: { id: drugProfileId } })
    if (!profile) return NextResponse.json({ error: 'Unknown drug profile' }, { status: 404 })

    const op = operatorId?.trim() || 'OFFICER-01'
    const imageHash = hashImageFromDataUrl(imageDataUrl)
    const analysisJson = JSON.stringify(analysis)

    const count = await db.testRecord.count()
    const recordNo = nextRecordNo(count)

    const created = await db.testRecord.create({
      data: {
        recordNo,
        drugProfileId,
        operatorId: op,
        imageDataUrl,
        imageHash,
        analysisJson,
        classification: analysis.classification,
        confidence: analysis.confidence,
        reason: analysis.reason,
        recordHash: 'PENDING', // computed below from stored values
        signature: null, // prototype: no RSA signing yet
      },
    })

    // Recompute the hash from the ACTUAL stored createdAt so the value used for
    // the hash is byte-identical to what verification will read back later.
    const recordHash = computeRecordHash({
      recordNo: created.recordNo,
      drugProfileId,
      operatorId: op,
      imageDataUrl,
      imageHash,
      analysisJson,
      classification: analysis.classification,
      confidence: analysis.confidence,
      reason: analysis.reason,
      createdAt: created.createdAt.toISOString(),
    })

    const updated = await db.testRecord.update({
      where: { id: created.id },
      data: { recordHash },
    })

    const dto: TestRecordDTO = {
      id: updated.id,
      recordNo: updated.recordNo,
      drugProfileId: updated.drugProfileId,
      operatorId: updated.operatorId,
      imageDataUrl: updated.imageDataUrl,
      imageHash: updated.imageHash,
      analysis: JSON.parse(updated.analysisJson) as AiAnalysisResult,
      classification: updated.classification as TestRecordDTO['classification'],
      confidence: updated.confidence,
      reason: updated.reason,
      recordHash: updated.recordHash,
      signature: updated.signature,
      createdAt: updated.createdAt.toISOString(),
    }
    return NextResponse.json({ record: dto })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
