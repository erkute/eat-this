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
 *  *effective* face-up set (the map render sites OR `revealedMustEatIds` in
 *  anyway), letting spot-of-day reveals on restaurants outside the trial-10
 *  show face-up. */
export function resolveUnlockedMustEatIds(args: {
  uid: string | null
  storedUnlockedIds: Set<string>
  revealedMustEatIds: Set<string>
  mustEats: MapMustEat[]
  restaurants: MapRestaurant[]
}): Set<string> {
  const { uid, storedUnlockedIds, revealedMustEatIds, mustEats, restaurants } = args
  if (uid) return new Set<string>([...storedUnlockedIds, ...revealedMustEatIds])
  const unlockedRestaurantIds = new Set(
    restaurants.slice(0, TRIAL_UNLOCKED_COUNT).map((r) => r._id),
  )
  const out = new Set<string>(
    mustEats.filter((m) => unlockedRestaurantIds.has(m.restaurant._id)).map((m) => m._id),
  )
  for (const id of revealedMustEatIds) out.add(id)
  return out
}
