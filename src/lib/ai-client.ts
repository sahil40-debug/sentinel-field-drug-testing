/**
 * VLM client wrapper — calls z-ai-web-dev-sdk vision API and parses the
 * strict-JSON response into an AiAnalysisResult.
 *
 * SERVER-ONLY. Never import this from a client component.
 */
import 'server-only'
import ZAI from 'z-ai-web-dev-sdk'
import { AiAnalysisResultSchema, buildAnalysisPrompt, type AnalysisContext, type AiAnalysisResult } from './ai-schema'

let _zai: Awaited<ReturnType<typeof ZAI.create>> | null = null
async function getZai() {
  if (!_zai) _zai = await ZAI.create()
  return _zai
}

/** Best-effort JSON extraction from a model response that may include stray text. */
function extractJson(raw: string): string {
  let s = raw.trim()
  // strip code fences ```json ... ```
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) s = fence[1].trim()
  // grab the outermost {...} block
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) s = s.slice(start, end + 1)
  return s
}

export interface AnalyseImageArgs {
  imageDataUrl: string // data:image/...;base64,....
  context: AnalysisContext
}

export async function analyseTestImage({
  imageDataUrl,
  context,
}: AnalyseImageArgs): Promise<{ ok: true; result: AiAnalysisResult } | { ok: false; error: string; raw?: string }> {
  try {
    const zai = await getZai()
    const { system, user } = buildAnalysisPrompt(context)

    const response = await zai.chat.completions.createVision({
      messages: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: [
            { type: 'text', text: user },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        },
      ],
      thinking: { type: 'disabled' },
    })

    const raw = response.choices?.[0]?.message?.content ?? ''
    if (!raw) return { ok: false, error: 'Model returned an empty response.' }

    const jsonStr = extractJson(raw)
    let parsed: unknown
    try {
      parsed = JSON.parse(jsonStr)
    } catch {
      return { ok: false, error: 'Model response was not valid JSON.', raw }
    }

    const validation = AiAnalysisResultSchema.safeParse(parsed)
    if (!validation.success) {
      return {
        ok: false,
        error: 'Model response failed schema validation: ' + validation.error.issues.map((i) => i.message).join('; '),
        raw,
      }
    }
    return { ok: true, result: validation.data }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  }
}
