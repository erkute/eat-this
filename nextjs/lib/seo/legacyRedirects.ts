import { oldStyleSlug } from './legacySlug'

// Cleanup for the 2026-06-07 rebuild that re-slugged every spot without
// 301s, leaving Google's whole index on 404 URLs. Three mechanisms:
//   1. EXPLICIT_RESTAURANT_REDIRECTS — irregular cases the heuristics can't
//      derive (single→branch splits, renames, dropped suffixes).
//   2. oldStyleSlug() accent map — every spot whose accented slug changed.
//   3. generic split fallback — old bare slug → `<slug>-<branch>`.
// GONE_SLUGS / NEWS_REDIRECTS are handled statically in middleware.ts.
// See [[project-rebuild-slug-404-incident]].

export interface LegacyRestaurant {
  name: string
  slug: string
  bezirk?: string | null
}

// Irregular, curated old→new restaurant slug map (locale-agnostic).
// Splits point at the flagship/original branch; renames + dropped-suffix
// variants point at the surviving spot.
export const EXPLICIT_RESTAURANT_REDIRECTS: Record<string, string> = {
  // single → branch splits (flagship branch)
  'five-elephant': 'five-elephant-kreuzberg',
  'the-barn-cafe': 'the-barn-cafe-mitte',
  'hokey-pokey': 'hokey-pokey-stargarder',
  'eispatisserie-hokey-pokey': 'hokey-pokey-stargarder',
  'eispatisserie-hokey-pokey-prenzlauer-berg': 'hokey-pokey-stargarder',
  // dropped location suffix
  'tribeca-ice-cream-prenzlauer-berg': 'tribeca-ice-cream',
  'jones-ice-cream-2': 'jones-ice-cream',
  // renamed location (NORD branch closed, SÜD remains)
  'knoedelwirtschaft-nord': 'knoedelwirtschaft-sued',
}

// Permanently closed spots — return 410 Gone so Google drops them cleanly.
export const GONE_SLUGS: ReadonlySet<string> = new Set([
  'phantom-bar',
  'doyum-restaurant',
  'lala-restaurant',
  'gnam-pasta-factory',
  'zeit-caf',
])

// Removed news articles → closest living target (path without locale prefix).
export const NEWS_REDIRECTS: Record<string, string> = {
  'file-asto-brings-a-taste-of-athens-to-kreuzberg': '/restaurant/file-asto',
  'bun-society': '/news',
  'ramen-berlin': '/news',
  'michelin-berlin': '/news',
  'the-renaissance-of-the-food-court-why-you-need-to-visit-kalle-halle': '/news',
}

function pickPrimary(branches: LegacyRestaurant[]): string {
  const mitte = branches.find(b => b.bezirk === 'mitte')
  if (mitte) return mitte.slug
  return [...branches].sort((a, b) => a.slug.localeCompare(b.slug))[0].slug
}

/**
 * Resolve a 404ing restaurant slug to its current slug, or null if it's a
 * genuine 404. Pure — `restaurants` is the full current list.
 */
export function resolveLegacyRestaurantSlug(
  slug: string,
  restaurants: LegacyRestaurant[],
): string | null {
  if (EXPLICIT_RESTAURANT_REDIRECTS[slug]) return EXPLICIT_RESTAURANT_REDIRECTS[slug]

  const currentSlugs = new Set(restaurants.map(r => r.slug))
  if (currentSlugs.has(slug)) return null // real page — leave it alone

  // Accent map: old slug → new slug, only when unambiguous and not shadowing
  // a real page.
  const byOld = new Map<string, Set<string>>()
  for (const r of restaurants) {
    const key = oldStyleSlug(r.name)
    if (!key || key === r.slug || currentSlugs.has(key)) continue
    if (!byOld.has(key)) byOld.set(key, new Set())
    byOld.get(key)!.add(r.slug)
  }
  const accentHit = byOld.get(slug)
  if (accentHit?.size === 1) return [...accentHit][0]

  // Generic split fallback: old bare slug now carries a branch suffix.
  const branches = restaurants.filter(r => r.slug.startsWith(`${slug}-`))
  if (branches.length > 0) return pickPrimary(branches)

  // Ambiguous accent collision (e.g. two same-named spots) → primary.
  if (accentHit && accentHit.size > 1) {
    return pickPrimary(restaurants.filter(r => accentHit.has(r.slug)))
  }

  return null
}
