import type { MapMustEat } from '@/lib/types'

/** Server-side paywall guard for must-eat content.
 *
 *  A covered (face-down) card renders only the card-back + its restaurant
 *  label, so that's all it gets: id, sort order and the restaurant ref. The
 *  paid fields (dish, image, description, price) stay on the server until the
 *  card is face-up for this viewer — curated anon set, spot-of-day gift,
 *  purchased entitlement or on-site unlock. Gating the reveal in the UI alone
 *  shipped the full content to every visitor in the JSON payload / SSR HTML.
 */
export function stripCoveredMustEats(
  mustEats: MapMustEat[],
  faceUpIds: ReadonlySet<string>,
): MapMustEat[] {
  return mustEats.map((m) =>
    faceUpIds.has(m._id)
      ? m
      : { _id: m._id, order: m.order, restaurant: m.restaurant },
  )
}
