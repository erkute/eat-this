// nextjs/lib/buddy/packTeaser.ts
// Booster-Pack teaser for the buddy chat: when a spot search lands clearly in
// one pack category, the APP shows a pack card under Remy's answer — Remy's
// own text stays sales-free (his prompt forbids the salesman voice). The pick
// is anchored on the user's own cuisine term when that term names a pack topic;
// otherwise a deterministic majority vote over the curated category refs of the
// top results decides. All teaser copy comes verbatim from the stripe-catalog.
import { CATALOG, type PackDef } from '@/lib/stripe-catalog'
import { categoryArt } from '@/lib/categoryArt'
import type { Locale, PackTeaser, SpotCandidate } from './types'

// Vote over the most relevant results only — the query orders by match
// quality, so the head of the list is what Remy will actually recommend.
const VOTE_SPOTS = 10
// Below this the result is too thin to call it a topic.
const MIN_VOTERS = 3
// When the user named the pack topic outright, the teaser is justified by the
// question itself — a single tagged spot among the results corroborates that
// the term was understood. (Text retrieval for broad terms like "drinks" can
// surface mostly untagged spots, so a higher bar would drop the card on
// exactly the questions it exists for.)
const MIN_INTENT_SUPPORT = 1

// User wording → pack category slug, matched after foldTerm (DE/EN, singular
// and plural where they differ). The buddy's `cuisine` tool input is the
// user's own word for what they want — when that word IS a pack topic, the
// vote must not override it: nearly every restaurant carries lunch/dinner
// refs, so the generic tags otherwise outvote the asked-for category
// (breakfast search → Lunch card, drinks search → Dinner card).
const INTENT_TO_SLUG: Record<string, string> = {
  // breakfast
  fruhstuck: 'breakfast', fruehstueck: 'breakfast', fruhstucken: 'breakfast',
  fruehstuecken: 'breakfast', breakfast: 'breakfast', brunch: 'breakfast', brunchen: 'breakfast',
  // coffee
  kaffee: 'coffee', coffee: 'coffee', cafe: 'coffee', espresso: 'coffee',
  cappuccino: 'coffee', flatwhite: 'coffee', latte: 'coffee',
  // dinner
  dinner: 'dinner', abendessen: 'dinner',
  // drinks
  drink: 'drinks', drinks: 'drinks', getranke: 'drinks', getraenke: 'drinks',
  cocktail: 'drinks', cocktails: 'drinks', cocktailbar: 'drinks', bar: 'drinks', bars: 'drinks',
  wein: 'drinks', wine: 'drinks', weinbar: 'drinks', winebar: 'drinks',
  naturwein: 'drinks', naturalwine: 'drinks', aperitif: 'drinks', aperitivo: 'drinks',
  apero: 'drinks', bier: 'drinks', beer: 'drinks', craftbeer: 'drinks',
  longdrink: 'drinks', longdrinks: 'drinks', spritz: 'drinks',
  // fast food
  fastfood: 'fast-food', imbiss: 'fast-food', snack: 'fast-food', snacks: 'fast-food',
  // fine dining
  finedining: 'fine-dining', gourmet: 'fine-dining', sternekuche: 'fine-dining', michelin: 'fine-dining',
  // lunch
  lunch: 'lunch', mittagessen: 'lunch', mittag: 'lunch', mittagstisch: 'lunch',
  // pizza
  pizza: 'pizza', pizzen: 'pizza', pizzeria: 'pizza',
  // sweets
  sweets: 'sweets', susses: 'sweets', suesses: 'sweets', dessert: 'sweets', desserts: 'sweets',
  nachtisch: 'sweets', kuchen: 'sweets', torte: 'sweets', eis: 'sweets', eiscreme: 'sweets',
  icecream: 'sweets', gelato: 'sweets', patisserie: 'sweets', konditorei: 'sweets',
}

// Diacritic-folded, lowercased, alphanumeric-only — "Frühstück", "fruhstuck"
// and "Fruehstueck" (via the explicit ue-spelling keys) all resolve.
const foldTerm = (s: string) =>
  s
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')

/** The pack category the user's cuisine term names, or null for dish terms. */
export function packSlugForIntent(intent?: string): string | null {
  if (!intent) return null
  // Whole term first so "fine dining"/"natural wine" hit their joined keys,
  // then per-token so "wein" inside "natural wein bar" still resolves.
  const joined = foldTerm(intent)
  if (INTENT_TO_SLUG[joined]) return INTENT_TO_SLUG[joined]
  for (const token of intent.split(/[^\p{L}\p{N}]+/u)) {
    const folded = foldTerm(token)
    if (folded && INTENT_TO_SLUG[folded]) return INTENT_TO_SLUG[folded]
  }
  return null
}

function packBySlug(slug: string): PackDef | null {
  return Object.values(CATALOG).find((p) => p.type === 'category' && p.slug === slug) ?? null
}

export function pickPackForSpots(spots: SpotCandidate[], intent?: string): PackDef | null {
  const voters = spots.slice(0, VOTE_SPOTS)
  if (voters.length < MIN_VOTERS) return null
  const counts = new Map<string, number>()
  for (const s of voters) {
    // de-dupe per spot so a spot with duplicate refs can't double-vote
    for (const slug of new Set(s.categorySlugs ?? [])) {
      counts.set(slug, (counts.get(slug) ?? 0) + 1)
    }
  }

  // The user named a pack topic outright ("frühstück", "cocktails") — that
  // term decides the pack. Without any support among the results we show
  // nothing rather than let the generic refs pick a different pack than the
  // one the user asked about.
  const intentSlug = packSlugForIntent(intent)
  if (intentSlug) {
    return (counts.get(intentSlug) ?? 0) >= MIN_INTENT_SUPPORT ? packBySlug(intentSlug) : null
  }

  // Dish/cuisine terms that name no pack topic ("ramen"): majority vote over
  // the curated refs. A tie means the results don't agree on one topic —
  // insertion order must not pick the winner.
  let best: string | null = null
  let bestN = 0
  let tied = false
  for (const [slug, n] of counts) {
    if (n > bestN) {
      best = slug
      bestN = n
      tied = false
    } else if (n === bestN) {
      tied = true
    }
  }
  // Majority of the voters must share the category — otherwise the question
  // wasn't really about one pack topic and a teaser would feel random.
  if (!best || tied || bestN < Math.ceil(voters.length / 2)) return null
  return packBySlug(best)
}

export function buildPackTeaser(pack: PackDef, locale: Locale): PackTeaser {
  return {
    packId: pack.packId,
    slug: pack.slug ?? '',
    name: pack.displayName,
    spectrum: pack.spectrum[locale],
    description: pack.description[locale],
    art: pack.slug ? categoryArt(pack.slug) : null,
  }
}
