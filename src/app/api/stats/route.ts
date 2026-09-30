/**
 * GET /api/stats — dashboard counters.
 * Returns zeros if the database isn't reachable yet (e.g. before Postgres is
 * connected on Vercel) so the dashboard loads gracefully instead of crashing.
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
    // DB not ready — return empty stats so the UI doesn't crash.
    return NextResponse.json({ total: 0, positive: 0, negative: 0, inconclusive: 0, recent: [] })
  }
}
