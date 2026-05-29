import type { MustEatAlbumCard } from '@/lib/types'

/**
 * Orders of the deck slots that should render as tappable "teaser" cards.
 *
 * A teaser is a must-eat in the server-computed CURATED revealed set
 * (`curatedRevealedIds` — the same set the map reveals, see
 * `lib/map/revealed.server.ts`) that has a resolved `restaurantId` (required by
 * `unlock()`), a numeric `order` (its grid slot), and is not already unlocked.
 *
 * Gating on the shared curated set (rather than the raw `revealedForAnon` flag)
 * keeps the deck teasers IDENTICAL to the map's revealed set.
 */
export function selectTeaserOrders(
  mustEats: MustEatAlbumCard[],
  unlockedIds: Set<string>,
  curatedRevealedIds: Set<string>,
): Set<number> {
  const orders = new Set<number>()
  for (const m of mustEats) {
    if (!curatedRevealedIds.has(m._id)) continue
    if (!m.restaurantId) continue
    if (typeof m.order !== 'number') continue
    if (unlockedIds.has(m._id)) continue
    orders.add(m.order)
  }
  return orders
}
