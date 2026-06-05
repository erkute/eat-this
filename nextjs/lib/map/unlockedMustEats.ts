import type { MapRestaurant, MapMustEat } from '@/lib/types'

/** Anonymous trial: the must-eats of the first N restaurants (deterministic
 *  most-must-eats-first order from /api/map-data) are revealed face-up. */
export const TRIAL_UNLOCKED_COUNT = 10

/** The face-up must-eat set — mirrors the map exactly.
 *  Signed-in: stored Firestore unlocks ∪ server-revealed set.
 *  Anonymous: must-eats of the first TRIAL_UNLOCKED_COUNT restaurants
 *  (deterministic most-must-eats-first order) ∪ server-revealed set
 *  (spot-of-day gift).
 *
 *  This is the single source of truth for "which must-eats render face-up"
 *  across the map, the /must-eats gallery, and the /home teaser. For the
 *  signed-in branch it is byte-identical to MapSection's historical
 *  `unlockedIds` memo (stored ∪ revealed). For the anon branch it additionally
 *  folds in `revealedMustEatIds` so the returned set equals the map's
 *  *effective* face-up set (the map's render sites OR in `revealedMustEatIds`
 *  regardless), letting spot-of-day reveals on restaurants outside the
 *  trial-10 show face-up. */
export function resolveUnlockedMustEatIds(args: {
  uid: string | null
  storedUnlockedIds: Set<string>
  revealedMustEatIds: Set<string>
  mustEats: MapMustEat[]
  restaurants: MapRestaurant[]
  /** The server-computed anon face-up set (trial-10 ∪ spot-of-day) — "publicly
   *  face-up means face-up everywhere", so it's unioned in for signed-in users
   *  too. Ids not present in the consumer's `mustEats` are inert. Compute it
   *  from `getInitialAnonMapData()` — the trial-10 slice is only valid on the
   *  anon restaurant ordering, never on a signed-in user's owned list. */
  publicFaceUpIds?: Set<string>
}): Set<string> {
  const { uid, storedUnlockedIds, revealedMustEatIds, mustEats, restaurants, publicFaceUpIds } = args
  if (uid) {
    const out = new Set<string>([...storedUnlockedIds, ...revealedMustEatIds])
    if (publicFaceUpIds) for (const id of publicFaceUpIds) out.add(id)
    return out
  }
  const unlockedRestaurantIds = new Set(
    restaurants.slice(0, TRIAL_UNLOCKED_COUNT).map((r) => r._id),
  )
  const out = new Set<string>(
    mustEats.filter((m) => unlockedRestaurantIds.has(m.restaurant._id)).map((m) => m._id),
  )
  for (const id of revealedMustEatIds) out.add(id)
  if (publicFaceUpIds) for (const id of publicFaceUpIds) out.add(id)
  return out
}
