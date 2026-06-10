// nextjs/lib/buddy/packTeaser.ts
// Booster-Pack teaser for the buddy chat: when a spot search lands clearly in
// one pack category, the APP shows a pack card under Remy's answer — Remy's
// own text stays sales-free (his prompt forbids the salesman voice). The pick
// is a deterministic majority vote over the curated category refs of the top
// results; all teaser copy comes verbatim from the canonical stripe-catalog.
import { CATALOG, type PackDef } from '@/lib/stripe-catalog'
import { categoryArt } from '@/lib/categoryArt'
import type { Locale, PackTeaser, SpotCandidate } from './types'

// Vote over the most relevant results only — the query orders by match
// quality, so the head of the list is what Remy will actually recommend.
const VOTE_SPOTS = 10
// Below this the result is too thin to call it a topic.
const MIN_VOTERS = 3

export function pickPackForSpots(spots: SpotCandidate[]): PackDef | null {
  const voters = spots.slice(0, VOTE_SPOTS)
  if (voters.length < MIN_VOTERS) return null
  const counts = new Map<string, number>()
  for (const s of voters) {
    // de-dupe per spot so a spot with duplicate refs can't double-vote
    for (const slug of new Set(s.categorySlugs ?? [])) {
      counts.set(slug, (counts.get(slug) ?? 0) + 1)
    }
  }
  let best: string | null = null
  let bestN = 0
  for (const [slug, n] of counts) {
    if (n > bestN) {
      best = slug
      bestN = n
    }
  }
  // Majority of the voters must share the category — otherwise the question
  // wasn't really about one pack topic and a teaser would feel random.
  if (!best || bestN < Math.ceil(voters.length / 2)) return null
  return (
    Object.values(CATALOG).find((p) => p.type === 'category' && p.slug === best) ?? null
  )
}

export function formatPackPrice(amountCents: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === 'en' ? 'en-IE' : 'de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amountCents / 100)
}

export function buildPackTeaser(pack: PackDef, locale: Locale): PackTeaser {
  return {
    packId: pack.packId,
    slug: pack.slug ?? '',
    name: pack.displayName,
    spectrum: pack.spectrum[locale],
    description: pack.description[locale],
    art: pack.slug ? categoryArt(pack.slug) : null,
    priceLabel: formatPackPrice(pack.amountCents, locale),
  }
}
