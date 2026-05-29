import type { MustEatAlbumCard } from '@/lib/types'

/**
 * Orders of the deck slots that should render as tappable "teaser" cards.
 * A teaser is a Sanity-flagged `revealedForAnon` must-eat that has a resolved
 * `restaurantId` (required by `unlock()`), a numeric `order` (its grid slot),
 * and is not already in the user's unlocked set.
 *
 * Mirrors the map's `composeRevealedMustEats` trust in the `revealedForAnon`
 * flag — no hard cap here; Sanity curation is the source of truth.
 */
export function selectTeaserOrders(
  mustEats: MustEatAlbumCard[],
  unlockedIds: Set<string>,
): Set<number> {
  const orders = new Set<number>()
  for (const m of mustEats) {
    if (!m.revealedForAnon) continue
    if (!m.restaurantId) continue
    if (typeof m.order !== 'number') continue
    if (unlockedIds.has(m._id)) continue
    orders.add(m.order)
  }
  return orders
}
