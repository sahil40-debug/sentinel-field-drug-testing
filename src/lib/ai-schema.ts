/**
 * AI analysis schema + prompt for the VLM image-analysis model.
 *
 * The model receives:
 *   - the captured field-test image (reaction colour card)
 *   - the target substance / drug name + aliases
 *   - the test method
 *   - the expected (reference) reaction colour + representative hex
 *   - essential interpretation context
 *
 * and MUST respond with a single JSON object matching `AiAnalysisResult`.
 */
import { z } from 'zod'

// ---- Output schema (what the model must return) ----
export const AiAnalysisResultSchema = z.object({
  classification: z.enum(['Positive', 'Negative', 'Inconclusive']),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1),
  observed_colour: z.object({
    name: z.string(),
    hex: z.string(),
    rgb: z.tuple([z.number(), z.number(), z.number()]),
  }),
  expected_colour: z.object({
    name: z.string(),
    hex: z.string(),
  }),
  colour_match: z.enum(['strong', 'moderate', 'weak', 'none']),
  reference_card_detected: z.boolean(),
  reaction_area_detected: z.boolean(),
  image_quality: z.enum(['good', 'acceptable', 'poor']),
  notes: z.array(z.string()).default([]),
})
export type AiAnalysisResult = z.infer<typeof AiAnalysisResultSchema>

// Backwards-compat alias: older records stored this field as `caveats`.
// `normaliseAnalysis()` below maps old -> new when reading.
export type AiAnalysisResultLegacy = Omit<AiAnalysisResult, 'notes'> & { caveats?: string[] }

export function normaliseAnalysis(raw: unknown): AiAnalysisResult {
  const o = (raw ?? {}) as Partial<AiAnalysisResult> & { caveats?: string[] }
  const notes = (o.notes ?? o.caveats ?? []) as string[]
  return {
    classification: (o.classification ?? 'Inconclusive') as AiAnalysisResult['classification'],
    confidence: typeof o.confidence === 'number' ? o.confidence : 0,
    reason: o.reason ?? 'No reason provided.',
    observed_colour: o.observed_colour ?? { name: 'Unknown', hex: '#888888', rgb: [136, 136, 136] },
    expected_colour: o.expected_colour ?? { name: 'Unknown', hex: '#888888' },
    colour_match: (o.colour_match ?? 'none') as AiAnalysisResult['colour_match'],
    reference_card_detected: o.reference_card_detected ?? false,
    reaction_area_detected: o.reaction_area_detected ?? false,
    image_quality: (o.image_quality ?? 'acceptable') as AiAnalysisResult['image_quality'],
    notes,
  }
}

export type Classification = 'Positive' | 'Negative' | 'Inconclusive'

// ---- Context passed into the model ----
export interface AnalysisContext {
  target: string
  aliases: string[]
  testMethod: string
  expectedColor: string
  expectedHex: string
  interpretation: string
  source: string
}

/**
 * Builds the system + user prompt that constrains the VLM to return strict JSON.
 */
export function buildAnalysisPrompt(ctx: AnalysisContext): { system: string; user: string } {
  const system = `You are a precise laboratory-grade colour-analysis assistant for presumptive field drug testing.
You are given a photograph of a completed colour-change field test. The photo typically contains:
  1. A REFERENCE COLOUR CARD (a small printed coloured patch used to calibrate for lighting/camera differences).
  2. A REACTION AREA (the pouch / well / spot-plate where the reagent changed colour after contact with the sample).

You are also given the selected test definition (target substance, reagent, expected reaction colour).
Your job is to analyse the image and decide whether the observed reaction colour is consistent with the
expected reaction colour for that target substance, and produce a presumptive result.

Definitions:
- "Positive" = the observed reaction colour matches the expected reaction colour strongly enough to be
  consistent with the target substance. This is a PRESUMPTIVE result only, NOT laboratory confirmation.
- "Negative" = the observed reaction colour clearly does NOT match the expected reaction colour
  (i.e. the reaction is consistent with no reaction or a different substance).
- "Inconclusive" = the evidence is ambiguous: the match is weak, the image is poor, the reference card
  cannot be detected, or the reaction area cannot be confidently located. NEVER force a binary answer.

Rules:
- Base your decision on the observed colour of the REACTION AREA, not the reference card.
- Account for lighting by using the reference card as a sanity check of colour fidelity.
- If the image is blurry, over/under exposed, or the reaction area is not clearly visible, return Inconclusive.
- Be conservative: when in doubt, return Inconclusive.

You MUST respond with a single JSON object and NOTHING else. No markdown, no prose, no code fences.
The JSON object MUST conform exactly to this shape:
{
  "classification": "Positive" | "Negative" | "Inconclusive",
  "confidence": <number 0..1>,
  "reason": "<one or two sentences explaining the result>",
  "observed_colour": { "name": "<short name>", "hex": "#RRGGBB", "rgb": [<r>,<g>,<b>] },
  "expected_colour": { "name": "<short name>", "hex": "#RRGGBB" },
  "colour_match": "strong" | "moderate" | "weak" | "none",
  "reference_card_detected": <boolean>,
  "reaction_area_detected": <boolean>,
  "image_quality": "good" | "acceptable" | "poor",
  "notes": ["<optional observations / limitations / context strings>"]
}`

  const user = `TEST DEFINITION (the substance the officer is testing for):
- Target substance: ${ctx.target}
- Also known as: ${ctx.aliases.join(', ') || 'n/a'}
- Reagent / test method: ${ctx.testMethod}
- Expected reaction colour: ${ctx.expectedColor} (representative reference hex ${ctx.expectedHex})
- Interpretation note: ${ctx.interpretation}
- Source: ${ctx.source}

Analyse the attached photograph of the completed field test and return ONLY the JSON object described.`

  return { system, user }
}
