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

const MAX_GALLERY = 5
// "Product" = the thing you consume: a plated dish/pastry (food) or a finished
// drink. Interior (atmosphere) is supporting only. Exterior, menu, unusable
// (machines, bare shops, equipment, …) are dropped entirely.
const PRODUCT_CATEGORIES = new Set<PhotoJudgment['category']>(['food', 'drink'])
// Galleries use ONLY original (owner-uploaded) photos — the restaurant's own
// professional brand shots, never guest phone snaps. That owner-only rule is
// the real "professional" guarantee, so the per-category floor only needs to
// drop a genuinely bad original upload, not police phone quality.
const FOOD_FLOOR = 5
const DRINK_FLOOR = 5
const INTERIOR_FLOOR = 5

function passesFloor(jd: PhotoJudgment): boolean {
  if (jd.category === 'food') return jd.score >= FOOD_FLOOR
  if (jd.category === 'drink') return jd.score >= DRINK_FLOOR
  if (jd.category === 'interior') return jd.score >= INTERIOR_FLOOR
  return false // exterior, menu, unusable
}

// Normalise for comparison: lower-case, German umlauts → ae/oe/ue/ss, strip
// remaining accents, drop everything non-alphanumeric.
const normName = (s: string) =>
  s
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')

// Generic words that don't identify a specific business — a business's own
// Google name often varies these (e.g. "Albatross Bäckerei" vs "Albatross
// Bakery"), so they must not be required for an owner match.
const GENERIC_NAME_WORDS = new Set([
  'restaurant', 'cafe', 'bar', 'bakery', 'baeckerei', 'coffee', 'kaffee', 'kitchen',
  'deli', 'pizza', 'pizzeria', 'ristorante', 'trattoria', 'osteria', 'bistro', 'bistrot',
  'eis', 'eiscafe', 'icecream', 'ice', 'cream', 'gelato', 'shop', 'club', 'haus', 'house',
  'berlin', 'the', 'und', 'and', 'der', 'die', 'das', 'le', 'la', 'el', 'di', 'by', 'gmbh',
])

/** The distinctive words of a restaurant name, normalised — generic words and
 *  very short tokens removed. "Albatross Bäckerei" → ["albatross"]. */
function distinctiveTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !GENERIC_NAME_WORDS.has(t))
}

/** Owner-uploaded Places photos carry the business name as their author
 *  attribution (e.g. "Foto: 136 Berlin Restaurant"); guest photos carry a
 *  person's name. We match on the restaurant's DISTINCTIVE words so a business
 *  whose Google name varies the generic part still counts — "Albatross Bakery"
 *  matches "Albatross Bäckerei" on the shared token "albatross". A spot whose
 *  name is entirely generic/short falls back to a whole-name containment check. */
export function isOwnerPhoto(displayName: string | null | undefined, restaurantName: string): boolean {
  if (!displayName) return false
  const dn = normName(displayName)
  const toks = distinctiveTokens(restaurantName)
  // A distinctive word of 4+ chars is a reliable brand signal — match on the
  // tokens so name variants (Bakery/Bäckerei, dropped suffixes) still count.
  if (toks.some((t) => t.length >= 4)) {
    return toks.every((t) => dn.includes(t))
  }
  // Short / numeric / all-generic names ("963") — a substring would false-match
  // a guest who merely contains the token, so require the display to BE the name.
  const rn = normName(restaurantName)
  return rn.length >= 3 && dn === rn
}

/** Picks up to 4 gallery candidate indexes. Rules:
 *   1. ONLY original (owner-uploaded) photos — never guest photos. Owner photos
 *      carry the business name as attribution; they are the restaurant's own
 *      professional brand shots. A spot with no usable originals gets nothing.
 *   2. Product photos (food + drink) before interior; interior is supporting
 *      atmosphere only.
 *   3. Higher score breaks ties.
 *   4. A per-category floor drops a genuinely bad original; machines / bare
 *      shops / menus / exteriors are already excluded as non-product,
 *      non-interior.
 *   5. Never an all-interior ("just the shop") gallery — if nothing but
 *      interior survives, return nothing so the spot stays hero-only.
 *  `owners[i]` flags candidate i as an owner photo. `judgments === null`
 *  (model unavailable) can't categorise, so it falls back to the original
 *  photos in candidate order. */
export function selectGalleryPhotos(
  judgments: PhotoJudgment[] | null,
  owners: boolean[],
  candidateCount: number,
): number[] {
  if (judgments === null) {
    return Array.from({ length: candidateCount }, (_, i) => i)
      .filter((i) => owners[i])
      .slice(0, MAX_GALLERY)
  }
  const eligible = judgments.filter(
    (jd) => jd.index >= 0 && jd.index < candidateCount && owners[jd.index] && passesFloor(jd),
  )
  const productRank = (jd: PhotoJudgment) => (PRODUCT_CATEGORIES.has(jd.category) ? 0 : 1)
  eligible.sort((a, b) => {
    const p = productRank(a) - productRank(b)
    if (p !== 0) return p        // product before interior
    return b.score - a.score     // then best-scored first
  })
  const picked = eligible.slice(0, MAX_GALLERY)
  // No "just the shop" gallery: if every survivor is interior, show none.
  if (picked.length && picked.every((jd) => !PRODUCT_CATEGORIES.has(jd.category))) return []
  return picked.map((jd) => jd.index)
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

// Sonnet judges categories + aesthetic quality more accurately than Haiku; the
// cost delta is a couple of cents per restaurant. Override via env if needed.
const JUDGE_MODEL = process.env.GALLERY_JUDGE_MODEL ?? 'claude-sonnet-4-6'

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
        `These are candidate gallery photos for the restaurant "${restaurantName}" on a curated, design-led vegan food map. ` +
        `We want professional, magazine-quality photos that showcase the FOOD and DRINKS — the actual product. ` +
        `Judge each photo. Respond with ONLY a JSON array, one entry per photo: ` +
        `[{"index": <photo number>, "category": "food"|"interior"|"exterior"|"drink"|"menu"|"unusable", "score": <0-10>}]. ` +
        `Categories: "food" = dishes, pastries, baked goods, pizza, the actual product; ` +
        `"drink" = a finished beverage (coffee, cocktail, juice); ` +
        `"interior" = an INVITING dining room or café with character and atmosphere (tables, warm light, ambiance) — ` +
        `NOT equipment and NOT a bare or empty shop. ` +
        `"unusable" = a machine or equipment as the main subject (espresso machine, grinder, oven), bare retail shelves ` +
        `or rows of bottles/products, an empty counter or empty room with no food/drink/atmosphere, selfies, people as ` +
        `the subject, receipts, parking lots, screenshots, unrelated content. ` +
        `score = production quality + how appetizing/inviting it looks. ` +
        `Score HIGH (8-10) ONLY for clearly professional shots: even/intentional lighting, deliberate composition, ` +
        `clean uncluttered background, sharp focus. ` +
        `Score LOW (0-4) for amateur phone snapshots: harsh on-camera flash, cluttered tables, busy or distracting ` +
        `backgrounds, people/hands in the background, dim or yellow lighting, food shot in the kitchen/oven/in production, ` +
        `crooked or careless framing. Be strict — most casual phone photos should score 4 or below.`,
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
