/**
 * GET  /api/records/[id]      -> single record (by id or recordNo)
 * DELETE /api/records/[id]    -> delete (dev only)
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import type { AiAnalysisResult, DrugProfileDTO, TestRecordDTO } from '@/lib/types'

function rowToDto(
  r: Awaited<ReturnType<typeof db.testRecord.findUnique>> & object,
): TestRecordDTO {
  const dp = (r as { drugProfile?: { id: string; target: string; aliases: string; testMethod: string; expectedColor: string; expectedHex: string; interpretation: string; source: string } }).drugProfile
  return {
    id: r.id,
    recordNo: r.recordNo,
    drugProfileId: r.drugProfileId,
    drugProfile: dp
      ? ({
          id: dp.id,
          target: dp.target,
          aliases: JSON.parse(dp.aliases) as string[],
          testMethod: dp.testMethod,
          expectedColor: dp.expectedColor,
          expectedHex: dp.expectedHex,
          interpretation: dp.interpretation,
          source: dp.source,
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
  }
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    const row = await db.testRecord.findUnique({
      where: { id },
      include: { drugProfile: true },
    })
    if (!row) {
      const byNo = await db.testRecord.findUnique({
        where: { recordNo: id },
        include: { drugProfile: true },
      })
      if (!byNo) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      return NextResponse.json({ record: rowToDto(byNo) })
    }
    return NextResponse.json({ record: rowToDto(row) })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params
    await db.testRecord.deleteMany({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
