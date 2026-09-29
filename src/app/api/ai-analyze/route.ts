/**
 * POST /api/ai-analyze
 *
 * Body: { imageDataUrl: string, drugProfileId: string, manualReferenceHex?: string|null, manualReactionHex?: string|null }
 *
 * Calls the VLM (z-ai-web-dev-sdk vision) with the captured image + the
 * selected drug-profile context and returns a strict AiAnalysisResult JSON.
 * Optional manual colour overrides are passed when the photo didn't capture
 * the reference card / reaction colour clearly.
 */
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { analyseTestImage } from '@/lib/ai-client'
import { hashImageFromDataUrl } from '@/lib/integrity'
import type { AiAnalysisResult, DrugProfileDTO } from '@/lib/types'

function normaliseHex(h: unknown): string | null {
  if (typeof h !== 'string') return null
  const m = h.trim().match(/^#?([0-9a-fA-F]{6})$/)
  return m ? `#${m[1].toLowerCase()}` : null
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { imageDataUrl, drugProfileId, manualReferenceHex, manualReactionHex } = body as {
      imageDataUrl?: string
      drugProfileId?: string
      manualReferenceHex?: string | null
      manualReactionHex?: string | null
    }

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

    const refHex = normaliseHex(manualReferenceHex)
    const rxnHex = normaliseHex(manualReactionHex)

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
        manualReferenceHex: refHex,
        manualReactionHex: rxnHex,
      },
    })

    if (!outcome.ok) {
      return NextResponse.json(
        { error: outcome.error, raw: outcome.raw },
        { status: 502 },
      )
    }

    const result: AiAnalysisResult = outcome.result
    // If the model didn't set manual_override_used but an override WAS supplied, set it.
    if (!result.manual_override_used && (refHex || rxnHex)) {
      result.manual_override_used = true
    }
    // If a manual reaction override was supplied, use it for the observed_colour so the
    // stored record reflects what the officer saw on the ground (not what the camera caught).
    if (rxnHex) {
      const rgb = hexToRgb(rxnHex)
      result.observed_colour = { name: 'Manual override', hex: rxnHex, rgb }
    }
    // If a manual reference override was supplied, reflect it in expected_colour (the reference
    // the officer calibrated against).
    if (refHex) {
      result.expected_colour = { name: 'Manual reference', hex: refHex }
    }
    const imageHash = hashImageFromDataUrl(imageDataUrl)

    return NextResponse.json({
      result,
      imageHash,
      drug,
      manualReferenceHex: refHex,
      manualReactionHex: rxnHex,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}
