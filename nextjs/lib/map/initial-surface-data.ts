import type { InitialMapData } from './server-initial-map-data'

const HOME_MUST_EAT_COUNT = 6

export type InitialMustEatsData = Pick<
  InitialMapData,
  'mustEats' | 'revealedMustEatIds'
>

/**
 * The home client islands share useMapData, but only need the visible
 * restaurants and the first six public Must Eats for their initial render.
 * Dropping the map-only collections keeps them out of the HTML/RSC payload.
 */
export function selectHomeInitialMapData(data: InitialMapData): InitialMapData {
  const revealedIds = new Set(data.revealedMustEatIds)

  return {
    ...data,
    lockedRestaurants: [],
    categories: [],
    mustEats: data.mustEats
      .filter((mustEat) => revealedIds.has(mustEat._id))
      .slice(0, HOME_MUST_EAT_COUNT),
  }
}

/** The public Must-Eats catalog never reads restaurant or category payloads. */
export function selectInitialMustEatsData(
  data: InitialMapData,
): InitialMustEatsData {
  return {
    mustEats: data.mustEats,
    revealedMustEatIds: data.revealedMustEatIds,
  }
}
