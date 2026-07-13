// Pure helpers for the booster pack detail route (/pack/[slug]).
// Keep free of React / Sanity so they stay unit-testable.
import { CATALOG, type PackDef } from '@/lib/stripe-catalog'
import type { RestaurantCard } from '@/lib/types'

/** URL slug for a pack detail page: the category slug, or 'all-berlin'. */
export function packUrlSlug(pack: PackDef): string {
  return pack.slug ?? 'all-berlin'
}

/** Resolve a /pack/[slug] URL segment to its catalog pack, or null. */
export function resolvePackByUrlSlug(slug: string): PackDef | null {
  return Object.values(CATALOG).find(p => packUrlSlug(p) === slug) ?? null
}

/** Mockup price style: "2,99 €" for fractional, "20 €" for whole euros. */
export function formatPackPrice(amountCents: number): string {
  const euros = Math.floor(amountCents / 100)
  const cents = amountCents % 100
  if (cents === 0) return `${euros} €`
  return `${euros},${String(cents).padStart(2, '0')} €`
}

interface PackTeaserRow {
  name: string
  district?: string
}
interface PackTeaser {
  /** First N spots shown by name + district (the hook). */
  revealed: PackTeaserRow[]
  /** Next M spots — district only, name stays covered until purchase. */
  locked: { district?: string }[]
}

/**
 * Split a category's restaurants into a small revealed teaser + a couple of
 * covered rows. Names of locked rows are deliberately withheld.
 */
export function buildPackTeaser(
  restaurants: RestaurantCard[],
  revealCount = 3,
  lockedCount = 2,
): PackTeaser {
  const revealed = restaurants.slice(0, revealCount).map(r => ({
    name: r.name,
    district: r.district,
  }))
  const locked = restaurants
    .slice(revealCount, revealCount + lockedCount)
    .map(r => ({ district: r.district }))
  return { revealed, locked }
}
