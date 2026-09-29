/**
 * GET /api/stats — dashboard counters.
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const total = await db.testRecord.count()
    const positive = await db.testRecord.count({ where: { classification: 'Positive' } })
    const negative = await db.testRecord.count({ where: { classification: 'Negative' } })
    const inconclusive = await db.testRecord.count({ where: { classification: 'Inconclusive' } })
    const recent = await db.testRecord.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { drugProfile: true },
    })
    const recentList = recent.map((r) => ({
      id: r.id,
      recordNo: r.recordNo,
      target: r.drugProfile?.target ?? '—',
      classification: r.classification,
      createdAt: r.createdAt.toISOString(),
    }))
    return NextResponse.json({ total, positive, negative, inconclusive, recent: recentList })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
