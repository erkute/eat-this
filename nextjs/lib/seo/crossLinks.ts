import type { RestaurantCard } from '../types'
import { localizedCategoryName } from '../categories'

type Loc = 'de' | 'en'

export interface CrossLink {
  slug: string
  label: string
  count: number
}

function rank(map: Map<string, CrossLink>, limit: number): CrossLink[] {
  return [...map.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit)
}

/**
 * Distinct categories represented in a district's restaurant list, most-common
 * first. Powers the "Kategorien in {Bezirk}" cross-link row: it funnels internal
 * link equity from district hubs into category hubs and hands Google an on-page
 * path toward the long-tail "beste {Kategorie} in {Bezirk}" intent that neither
 * hub currently links to.
 */
export function districtCategoryLinks(
  restaurants: RestaurantCard[],
  locale: Loc,
  limit = 8,
): CrossLink[] {
  const tally = new Map<string, CrossLink>()
  for (const r of restaurants) {
    for (const cat of r.categories ?? []) {
      if (!cat.slug) continue
      const existing = tally.get(cat.slug)
      if (existing) existing.count += 1
      else tally.set(cat.slug, { slug: cat.slug, label: localizedCategoryName(cat, locale), count: 1 })
    }
  }
  return rank(tally, limit)
}

/**
 * Distinct districts represented in a category's restaurant list, most-common
 * first. The mirror of districtCategoryLinks for the category hub — links into
 * /bezirk/{slug}. Needs the bezirk reference (slug), which only
 * restaurantsByCategoryQuery projects; restaurants with a plain district name
 * but no bezirk ref are skipped because they can't be linked.
 */
export function categoryDistrictLinks(
  restaurants: Array<Pick<RestaurantCard, 'bezirk' | 'district'>>,
  limit = 8,
): CrossLink[] {
  const tally = new Map<string, CrossLink>()
  for (const r of restaurants) {
    const slug = r.bezirk?.slug
    const label = r.bezirk?.name
    if (!slug || !label) continue
    const existing = tally.get(slug)
    if (existing) existing.count += 1
    else tally.set(slug, { slug, label, count: 1 })
  }
  return rank(tally, limit)
}
