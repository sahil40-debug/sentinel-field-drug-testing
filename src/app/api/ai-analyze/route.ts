/**
 * POST /api/ai-analyze
 *
 * Body: { imageDataUrl: string, drugProfileId: string }
 *
 * Calls the VLM (z-ai-web-dev-sdk vision) with the captured image + the
 * selected drug-profile context and returns a strict AiAnalysisResult JSON.
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { analyseTestImage } from '@/lib/ai-client'
import { hashImageFromDataUrl } from '@/lib/integrity'
import type { AiAnalysisResult, DrugProfileDTO } from '@/lib/types'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { imageDataUrl, drugProfileId } = body as { imageDataUrl?: string; drugProfileId?: string }

    if (!imageDataUrl || !drugProfileId) {
      return NextResponse.json({ error: 'imageDataUrl and drugProfileId are required' }, { status: 400 })
    }
    if (!imageDataUrl.startsWith('data:image/')) {
      return NextResponse.json({ error: 'imageDataUrl must be a data:image/... URL' }, { status: 400 })
    }

    const profile = await db.drugProfile.findUnique({ where: { id: drugProfileId } })
    if (!profile) return NextResponse.json({ error: 'Unknown drug profile' }, { status: 404 })

    const drug: DrugProfileDTO = {
      id: profile.id,
      target: profile.target,
      aliases: JSON.parse(profile.aliases) as string[],
      testMethod: profile.testMethod,
      expectedColor: profile.expectedColor,
      expectedHex: profile.expectedHex,
      interpretation: profile.interpretation,
      source: profile.source,
    }

    const outcome = await analyseTestImage({
      imageDataUrl,
      context: {
        target: drug.target,
        aliases: drug.aliases,
        testMethod: drug.testMethod,
        expectedColor: drug.expectedColor,
        expectedHex: drug.expectedHex,
        interpretation: drug.interpretation,
        source: drug.source,
      },
    })

    if (!outcome.ok) {
      return NextResponse.json(
        { error: outcome.error, raw: outcome.raw },
        { status: 502 },
      )
    }

    const result: AiAnalysisResult = outcome.result
    const imageHash = hashImageFromDataUrl(imageDataUrl)

    return NextResponse.json({
      result,
      imageHash,
      drug,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
