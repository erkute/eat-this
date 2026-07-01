import { haversineDistance } from '@/lib/map/distance'
import { getOpenStatus } from '@/lib/map/openingHours'
import type { MapRestaurant } from '@/lib/types'

export type TodayMood = 'any' | 'quick' | 'cozy' | 'special'
export type TodayBudget = 'any' | 'cheap' | 'medium'
export type TodayRadius = 1500 | 3000 | 8000

interface LatLng {
  lat: number
  lng: number
}

export interface TodayPickerPreferences {
  mood: TodayMood
  budget: TodayBudget
  radius: TodayRadius
}

export interface TodayPick {
  restaurant: MapRestaurant
  distanceM: number
  opening: 'open' | 'unknown'
}

const MOOD_TERMS: Record<Exclude<TodayMood, 'any'>, string[]> = {
  quick: ['burger', 'pizza', 'döner', 'doner', 'imbiss', 'fast', 'street', 'taco', 'ramen', 'noodle', 'sandwich', 'lunch'],
  cozy: ['café', 'cafe', 'coffee', 'breakfast', 'frühstück', 'bakery', 'bäckerei', 'wine', 'wein', 'bar', 'bistro'],
  special: ['fine', 'tasting', 'chef', 'omakase', 'special', 'date', 'dinner', 'cocktail'],
}

function restaurantText(r: MapRestaurant): string {
  return [
    r.name,
    r.cuisineType,
    r.district,
    ...(r.categories ?? []).flatMap((c) => [c.name, c.nameEn, c.slug]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function stableNoise(id: string, seed: number): number {
  let hash = seed + 2166136261
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0) / 4294967295
}

function budgetMatches(r: MapRestaurant, budget: TodayBudget): boolean {
  if (budget === 'any') return true
  const { min, max } = r.priceRange ?? {}
  if (min === undefined && max === undefined) return false
  const low = min ?? max ?? 0
  const high = max ?? min ?? 0
  const midpoint = (low + high) / 2
  // Use the range midpoint for exclusive bands. A 15–25 € spot belongs to €,
  // not both € and €€, so switching the control visibly changes the result.
  if (budget === 'cheap') return midpoint <= 20
  return midpoint > 20 && midpoint <= 45
}

function budgetUnknown(r: MapRestaurant): boolean {
  return r.priceRange?.min === undefined && r.priceRange?.max === undefined
}

function moodScore(r: MapRestaurant, mood: TodayMood): number {
  if (mood === 'any') return 0
  const text = restaurantText(r)
  const words = new Set(text.split(/[^\p{L}\p{N}]+/u).filter(Boolean))
  const keywordHits = MOOD_TERMS[mood].filter((term) => words.has(term)).length
  if (mood === 'special') {
    const priceBoost = (r.priceRange?.max ?? 0) >= 35 ? 2 : 0
    const mustEatBoost = (r.mustEatCount ?? 0) >= 2 ? Math.min(r.mustEatCount, 3) : 0
    return keywordHits * 3 + mustEatBoost + priceBoost
  }
  return keywordHits
}

/**
 * Picks three useful candidates without calling a model. Known-open spots win;
 * restaurants with missing hours remain eligible so incomplete editorial data
 * cannot make the feature empty. Known-closed spots are never recommended.
 */
export function pickTodayRestaurants(
  restaurants: MapRestaurant[],
  preferences: TodayPickerPreferences,
  location: LatLng,
  now: Date = new Date(),
  seed = 0,
): TodayPick[] {
  const eligible = restaurants
    .filter((r) => !r.isClosed)
    .map((restaurant) => {
      const distanceM = haversineDistance(location.lat, location.lng, restaurant.lat, restaurant.lng)
      const status = restaurant.openingHours?.length ? getOpenStatus(restaurant.openingHours, now) : null
      return {
        restaurant,
        distanceM,
        opening: status?.isOpen ? 'open' as const : status ? 'closed' as const : 'unknown' as const,
      }
    })
    .filter(
      (pick): pick is typeof pick & { opening: TodayPick['opening'] } =>
        pick.opening !== 'closed',
    )

  const withinRadius = eligible.filter((pick) => pick.distanceM <= preferences.radius)
  const distancePool = withinRadius.length >= 3 ? withinRadius : eligible
  const withinBudget = distancePool.filter((pick) => budgetMatches(pick.restaurant, preferences.budget))
  const budgetUnknowns = distancePool.filter((pick) => budgetUnknown(pick.restaurant))
  const budgetCandidates = [...withinBudget, ...budgetUnknowns]
  const budgetPool =
    preferences.budget !== 'any' && withinBudget.length > 0 && budgetCandidates.length >= 3
      ? budgetCandidates
      : distancePool
  const withinMood = budgetPool.filter((pick) => moodScore(pick.restaurant, preferences.mood) > 0)
  const pool = preferences.mood !== 'any' && withinMood.length >= 3 ? withinMood : budgetPool

  return pool
    .map((pick) => {
      // Preferences decide the candidate pool above. Scoring only orders that
      // relevant pool: known-open first, then a loose distance band. Noise is
      // deliberately strong enough that "shuffle" changes equally useful picks.
      const openScore = pick.opening === 'open' ? 80 : 0
      const distanceScore = Math.max(0, 60 - pick.distanceM / 100)
      const budgetScore = budgetMatches(pick.restaurant, preferences.budget) ? 40 : 0
      const preferenceScore = moodScore(pick.restaurant, preferences.mood) * 45
      const score =
        openScore +
        distanceScore +
        budgetScore +
        preferenceScore +
        stableNoise(
          `${preferences.mood}:${preferences.budget}:${preferences.radius}:${pick.restaurant._id}`,
          seed,
        ) * 70
      return { ...pick, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ restaurant, distanceM, opening }) => ({ restaurant, distanceM, opening }))
}
