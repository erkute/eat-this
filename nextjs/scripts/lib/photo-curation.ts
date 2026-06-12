/**
 * Pure selection logic for the restaurant photo gallery. Judgments come from
 * Haiku vision scoring (see judgePhotos below); selection is kept pure so it
 * is unit-testable without network. Hero (photos[0]) is excluded by the
 * CALLER — indexes here refer to the gallery candidate list (photos[1..]).
 */
import Anthropic from '@anthropic-ai/sdk'

/** Thrown when Haiku judging can't run at all (no credits / bad auth). Batch
 *  callers should abort rather than write un-judged fallback galleries. */
export class HaikuUnavailableError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'HaikuUnavailableError'
  }
}

export interface PhotoJudgment {
  index: number
  category: 'food' | 'interior' | 'exterior' | 'drink' | 'menu' | 'unusable'
  score: number
}

const MAX_GALLERY = 4
// Product rule: galleries show only plated food and interior atmosphere.
// Drinks, menu cards, exterior/building shots and unusable photos are dropped.
const KEEP_CATEGORIES = new Set<PhotoJudgment['category']>(['food', 'interior'])

const normName = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/** Owner-uploaded Places photos carry the business name as their author
 *  attribution (e.g. "Foto: 136 Berlin Restaurant"); guest photos carry a
 *  person's name. We prefer owner photos — they're the on-brand, professional
 *  ones — so flag them here. Match when the (normalised) display name CONTAINS
 *  the restaurant name; require ≥4 chars so a very short name can't false-match
 *  a guest who happens to share those letters. */
export function isOwnerPhoto(displayName: string | null | undefined, restaurantName: string): boolean {
  if (!displayName) return false
  const dn = normName(displayName)
  const rn = normName(restaurantName)
  if (rn.length < 4) return dn === rn
  return dn.includes(rn)
}

/** Picks up to 4 gallery candidate indexes from Haiku judgments. Rules:
 *   - keep only food + interior categories (KEEP_CATEGORIES)
 *   - owner photos first, then the best-scored guest photos
 *   - fill to 4 even with weaker guest photos (no score floor); if fewer than
 *     4 food/interior photos exist at all, return fewer.
 *  `owners[i]` flags whether candidate i is an owner photo. `judgments === null`
 *  (Haiku unavailable) can't categorise, so it falls back to owner-first in the
 *  candidates' original order. */
export function selectGalleryPhotos(
  judgments: PhotoJudgment[] | null,
  owners: boolean[],
  candidateCount: number,
): number[] {
  const ownerRank = (i: number) => (owners[i] ? 0 : 1)
  if (judgments === null) {
    const idx = Array.from({ length: candidateCount }, (_, i) => i)
    idx.sort((a, b) => ownerRank(a) - ownerRank(b)) // stable sort: owners first, else original order
    return idx.slice(0, MAX_GALLERY)
  }
  const eligible = judgments.filter(
    (jd) => KEEP_CATEGORIES.has(jd.category) && jd.index >= 0 && jd.index < candidateCount,
  )
  eligible.sort((a, b) => {
    const r = ownerRank(a.index) - ownerRank(b.index)
    if (r !== 0) return r        // owner photos before guest photos
    return b.score - a.score     // then best-scored first
  })
  return eligible.slice(0, MAX_GALLERY).map((jd) => jd.index)
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
    const status = (err as { status?: number })?.status
    const msg = err instanceof Error ? err.message : String(err)
    // Credit exhaustion / auth failures are persistent — every later call
    // fails too. Surface them so a batch run aborts instead of silently
    // writing un-judged (category-unfiltered) fallback galleries over good
    // ones. Transient errors still fall back to unscored for single imports.
    if (status === 401 || status === 403 || (status === 400 && /credit balance|billing|quota/i.test(msg))) {
      throw new HaikuUnavailableError(msg)
    }
    console.warn(`  photo judging failed: ${msg} — falling back to unscored`)
    return null
  }
}
