import type { RestaurantCard } from '../types'

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
 * Distinct districts represented in a category's restaurant list, most-common
 * first. Links from the category hub into /bezirk/{slug}. Needs the bezirk
 * reference (slug), which only
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
