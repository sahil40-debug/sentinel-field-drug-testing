/**
 * VLM client wrapper — calls Google Gemini Vision API and parses the
 * structured-JSON response into an AiAnalysisResult.
 *
 * SERVER-ONLY. Never import this from a client component.
 *
 * Requires GEMINI_API_KEY environment variable (get one free at
 * https://aistudio.google.com/apikey).
 */
import 'server-only'
import { GoogleGenAI, Type } from '@google/genai'
import { AiAnalysisResultSchema, buildAnalysisPrompt, type AnalysisContext, type AiAnalysisResult } from './ai-schema'

let _client: GoogleGenAI | null = null
function getClient(): GoogleGenAI {
  if (_client) return _client
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set. Get a free key at https://aistudio.google.com/apikey and add it to Vercel.')
  }
  _client = new GoogleGenAI({ apiKey })
  return _client
}

/**
 * The Gemini response schema — guarantees the model returns exactly this
 * JSON shape (much more reliable than prompt-only enforcement).
 */
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    classification: {
      type: Type.STRING,
      enum: ['Positive', 'Negative', 'Inconclusive'],
    },
    confidence: { type: Type.NUMBER },
    reason: { type: Type.STRING },
    observed_colour: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        hex: { type: Type.STRING },
        rgb: {
          type: Type.ARRAY,
          items: { type: Type.INTEGER },
        },
      },
      required: ['name', 'hex', 'rgb'],
    },
    expected_colour: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        hex: { type: Type.STRING },
      },
      required: ['name', 'hex'],
    },
    colour_match: {
      type: Type.STRING,
      enum: ['strong', 'moderate', 'weak', 'none'],
    },
    reference_card_detected: { type: Type.BOOLEAN },
    reaction_area_detected: { type: Type.BOOLEAN },
    image_quality: {
      type: Type.STRING,
      enum: ['good', 'acceptable', 'poor'],
    },
    manual_override_used: { type: Type.BOOLEAN },
    notes: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: [
    'classification',
    'confidence',
    'reason',
    'observed_colour',
    'expected_colour',
    'colour_match',
    'reference_card_detected',
    'reaction_area_detected',
    'image_quality',
    'manual_override_used',
    'notes',
  ],
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
    const client = getClient()
    const { system, user } = buildAnalysisPrompt(context)

    // Extract mime type + base64 from the data URL
    const match = imageDataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/)
    if (!match) {
      return { ok: false, error: 'Invalid image data URL format.' }
    }
    const mimeType = match[1]
    const base64Data = match[2]

    const response = await client.models.generateContent({
      model: 'gemini-2.0-flash-lite',
      contents: [
        {
          role: 'user',
          parts: [
            { text: user },
            { inlineData: { mimeType, data: base64Data } },
          ],
        },
      ],
      config: {
        systemInstruction: system,
        responseMimeType: 'application/json',
        responseSchema,
      },
    })

    const raw = response.text ?? ''
    if (!raw) return { ok: false, error: 'Gemini returned an empty response.' }

    // With responseSchema, Gemini guarantees valid JSON — but we still validate
    let parsed: unknown
    try {
      parsed = JSON.parse(raw)
    } catch {
      return { ok: false, error: 'Gemini response was not valid JSON.', raw }
    }

    const validation = AiAnalysisResultSchema.safeParse(parsed)
    if (!validation.success) {
      return {
        ok: false,
        error: 'Gemini response failed schema validation: ' + validation.error.issues.map((i) => i.message).join('; '),
        raw,
      }
    }
    return { ok: true, result: validation.data }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  }
}
