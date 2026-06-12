/**
 * Pure selection logic for the restaurant photo gallery. Judgments come from
 * Haiku vision scoring (see judgePhotos below); selection is kept pure so it
 * is unit-testable without network. Hero (photos[0]) is excluded by the
 * CALLER — indexes here refer to the gallery candidate list (photos[1..]).
 */
import Anthropic from '@anthropic-ai/sdk'

export interface PhotoJudgment {
  index: number
  category: 'food' | 'interior' | 'exterior' | 'drink' | 'menu' | 'unusable'
  score: number
}

const MAX_GALLERY = 4
const SCORE_THRESHOLD = 6
const FALLBACK_COUNT = 3

/** Returns candidate indexes to keep, best first. `judgments === null`
 *  (scoring unavailable) falls back to the first 3 candidates unscored. */
export function selectGalleryPhotos(
  judgments: PhotoJudgment[] | null,
  candidateCount: number,
): number[] {
  if (judgments === null) {
    return Array.from({ length: Math.min(FALLBACK_COUNT, candidateCount) }, (_, i) => i)
  }
  const usable = judgments.filter(
    (jd) =>
      jd.category !== 'unusable' &&
      jd.score >= SCORE_THRESHOLD &&
      jd.index >= 0 &&
      jd.index < candidateCount,
  )
  const sorted = [...usable].sort((a, b) => b.score - a.score)
  const picked: PhotoJudgment[] = []
  // A food shot sells a restaurant better than three interiors — always keep
  // the best usable one, even if other categories out-score it.
  const bestFood = sorted.find((jd) => jd.category === 'food')
  if (bestFood) picked.push(bestFood)
  for (const jd of sorted) {
    if (picked.length >= MAX_GALLERY) break
    if (!picked.includes(jd)) picked.push(jd)
  }
  return picked.slice(0, MAX_GALLERY).map((jd) => jd.index)
}

/** German alt-text label per category, used for gallery image alt fields. */
export const CATEGORY_LABEL_DE: Record<PhotoJudgment['category'], string> = {
  food: 'Gericht',
  interior: 'Innenraum',
  exterior: 'Außenansicht',
  drink: 'Getränk',
  menu: 'Speisekarte',
  unusable: 'Foto',
}

const VALID_CATEGORIES = new Set(['food', 'interior', 'exterior', 'drink', 'menu', 'unusable'])

/** Tolerant JSON extraction for the model reply: accepts bare arrays or
 *  arrays inside prose/code fences. Returns null on any shape violation so
 *  callers fall back to unscored selection. */
export function parseJudgments(text: string, candidateCount: number): PhotoJudgment[] | null {
  const match = text.match(/\[[\s\S]*\]/)
  if (!match) return null
  let raw: unknown
  try {
    raw = JSON.parse(match[0])
  } catch {
    return null
  }
  if (!Array.isArray(raw)) return null
  const out: PhotoJudgment[] = []
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) return null
    const { index, category, score } = item as Record<string, unknown>
    if (typeof index !== 'number' || !Number.isInteger(index)) return null
    if (typeof category !== 'string' || !VALID_CATEGORIES.has(category)) return null
    if (typeof score !== 'number' || Number.isNaN(score)) return null
    if (index < 0 || index >= candidateCount) continue
    out.push({ index, category: category as PhotoJudgment['category'], score })
  }
  return out
}

export interface JudgeInput {
  /** base64-encoded image bytes (≤ ~400px wide preview) */
  data: string
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
}

const JUDGE_MODEL = 'claude-haiku-4-5'

/** Scores gallery candidates with Haiku vision in ONE request (the model
 *  sees all photos and scores them relative to each other). Returns null on
 *  any failure — callers then fall back to the first 3 unscored. */
export async function judgePhotos(
  images: JudgeInput[],
  restaurantName: string,
): Promise<PhotoJudgment[] | null> {
  if (!images.length) return []
  if (!process.env.ANTHROPIC_API_KEY) return null
  try {
    const anthropic = new Anthropic()
    const content: Anthropic.ContentBlockParam[] = images
      .map((img, i): Anthropic.ContentBlockParam[] => [
        { type: 'text' as const, text: `Photo ${i}:` },
        {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: img.mediaType,
            data: img.data,
          },
        },
      ])
      .flat()
    content.push({
      type: 'text',
      text:
        `These are candidate gallery photos for the restaurant "${restaurantName}" on a curated vegan food map. ` +
        `Judge each photo. Respond with ONLY a JSON array, one entry per photo: ` +
        `[{"index": <photo number>, "category": "food"|"interior"|"exterior"|"drink"|"menu"|"unusable", "score": <0-10>}]. ` +
        `category "unusable": selfies, people as main subject, receipts, blurry/dark shots, parking lots, unrelated content. ` +
        `score: sharpness, exposure, composition, and how appetizing/inviting it looks. Be strict — 8+ only for genuinely good photos.`,
    })
    const res = await anthropic.messages.create({
      model: JUDGE_MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content }],
    })
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
    return parseJudgments(text, images.length)
  } catch (err) {
    console.warn(`  photo judging failed: ${(err as Error).message} — falling back to unscored`)
    return null
  }
}
