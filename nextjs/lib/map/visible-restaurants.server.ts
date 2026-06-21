import type { resolveEntitlements } from '@/lib/firebase/entitlements'
import { isRestaurantVisible } from '@/lib/firebase/entitlements'
import { getSpotOfDayId } from '@/lib/home/spotOfDay.server'
import type { MapMustEat, MapRestaurant } from '@/lib/types'
import { applyFreeSurface } from './free-surface'
import { applySpotOfDayReveal } from './spotOfDayReveal'
import {
  composeAnonRestaurants,
  composeRevealedMustEats,
  composeSignedRestaurants,
} from './tier-composition'

type Entitlements = Awaited<ReturnType<typeof resolveEntitlements>>

interface ComposeVisibleRestaurantsArgs {
  all: MapRestaurant[]
  allMustEats: MapMustEat[]
  ent: Entitlements
  uid: string | null
  freeRestaurantIds: Set<string>
  today?: string
}

export interface VisibleRestaurantsResult {
  restaurants: MapRestaurant[]
  lockedRestaurants: MapRestaurant[]
  mustEats: MapMustEat[]
  revealedMustEatIds: Set<string>
}

export async function composeVisibleRestaurants({
  all,
  allMustEats,
  ent,
  uid,
  freeRestaurantIds,
  today = new Date().toISOString().slice(0, 10),
}: ComposeVisibleRestaurantsArgs): Promise<VisibleRestaurantsResult> {
  const mustEatCountByRestaurant = new Map<string, number>()
  for (const m of allMustEats) {
    const rid = m.restaurant._id
    mustEatCountByRestaurant.set(rid, (mustEatCountByRestaurant.get(rid) ?? 0) + 1)
  }

  const anonSet = composeAnonRestaurants(all, mustEatCountByRestaurant)
  const anonIds = new Set(anonSet.map((r) => r._id))
  const revealedSet = composeRevealedMustEats(allMustEats, anonIds)

  let visibleRestaurants: MapRestaurant[]
  if (!uid) {
    visibleRestaurants = anonSet
  } else {
    const signedSet = composeSignedRestaurants(all, anonIds, mustEatCountByRestaurant)
    const tierUnion = [...anonSet, ...signedSet]
    const tierUnionIds = new Set(tierUnion.map((r) => r._id))

    const restaurantIdsFromMustEats = new Set<string>()
    if (ent.mustEatIds.size > 0) {
      for (const m of allMustEats) {
        if (ent.mustEatIds.has(m._id)) restaurantIdsFromMustEats.add(m.restaurant._id)
      }
    }

    const hasIndividualEntitlements =
      ent.categorySlugs.size > 0 ||
      ent.restaurantIds.size > 0 ||
      restaurantIdsFromMustEats.size > 0

    if (hasIndividualEntitlements) {
      const matched = all.filter(
        (r) => !tierUnionIds.has(r._id) && (
          isRestaurantVisible(r, ent) || restaurantIdsFromMustEats.has(r._id)
        ),
      )
      visibleRestaurants = [...tierUnion, ...matched]
    } else {
      visibleRestaurants = tierUnion
    }
  }

  visibleRestaurants = applyFreeSurface(visibleRestaurants, all, freeRestaurantIds)

  const visibleIdSet = new Set(visibleRestaurants.map((r) => r._id))
  const visibleMustEats = allMustEats.filter((m) => visibleIdSet.has(m.restaurant._id))
  const lockedRestaurants = all.filter((r) => !visibleIdSet.has(r._id))

  const spotId = await getSpotOfDayId(today)
  return applySpotOfDayReveal(spotId, all, allMustEats, {
    restaurants: visibleRestaurants,
    lockedRestaurants,
    mustEats: visibleMustEats,
    revealedMustEatIds: revealedSet,
  })
}
