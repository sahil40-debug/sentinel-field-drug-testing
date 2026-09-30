/**
 * GET /api/drugs — list all drug profiles (optionally ?q=search).
 * Also auto-seeds the DB on first call if empty.
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { DRUG_PROFILES } from '@/lib/drug-profiles'
import type { DrugProfileDTO } from '@/lib/types'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const q = searchParams.get('q')?.trim().toLowerCase() ?? ''

    // Auto-seed if empty
    const count = await db.drugProfile.count()
    if (count === 0) {
      await db.drugProfile.createMany({
        data: DRUG_PROFILES.map((p) => ({
          id: p.id,
          target: p.target,
          aliases: JSON.stringify(p.aliases),
          testMethod: p.testMethod,
          expectedColor: p.expectedColor,
          expectedHex: p.expectedHex,
          interpretation: p.interpretation,
          source: p.source,
        })),
      })
    }

    const rows = await db.drugProfile.findMany({ orderBy: { target: 'asc' } })
    let dtos: DrugProfileDTO[] = rows.map((r) => ({
      id: r.id,
      target: r.target,
      aliases: JSON.parse(r.aliases) as string[],
      testMethod: r.testMethod,
      expectedColor: r.expectedColor,
      expectedHex: r.expectedHex,
      interpretation: r.interpretation,
      source: r.source,
    }))

    if (q) {
      dtos = dtos.filter((d) => {
        const hay = (d.target + ' ' + d.aliases.join(' ') + ' ' + d.testMethod + ' ' + d.id).toLowerCase()
        return hay.includes(q)
      })
    }
    return NextResponse.json({ profiles: dtos })
  } catch (e) {
    // DB not ready — return the static drug profiles list so the UI still works.
    return NextResponse.json({ profiles: DRUG_PROFILES })
  }
}
