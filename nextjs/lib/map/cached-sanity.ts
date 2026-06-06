import { client } from '@/lib/sanity'
import { mapRestaurantsQuery, mapMustEatsQuery } from './queries'
import { allCategoriesQuery } from '@/lib/queries'
import type { MapRestaurant, MapMustEat } from '@/lib/types'
import type { CategoryDef } from '@/lib/categories'

export interface CachedMapData {
  restaurants: MapRestaurant[]
  mustEats:    MapMustEat[]
  categories:  CategoryDef[]
}

const TTL_MS = 60_000

let cached: { data: CachedMapData; expiresAt: number } | null = null
let inflight: Promise<CachedMapData> | null = null

export async function getCachedMapData(): Promise<CachedMapData> {
  if (cached && Date.now() < cached.expiresAt) return cached.data
  if (inflight) return inflight

  inflight = (async () => {
    const [restaurants, mustEats, categories] = await Promise.all([
      client.fetch(mapRestaurantsQuery),
      client.fetch(mapMustEatsQuery),
      client.fetch(allCategoriesQuery),
    ])
    const data: CachedMapData = { restaurants, mustEats, categories }
    cached = { data, expiresAt: Date.now() + TTL_MS }
    return data
  })()

  try {
    return await inflight
  } finally {
    inflight = null
  }
}

export function invalidateMapDataCache(): void {
  cached = null
}

// Test-only reset — clears both cached + inflight. Not exported from the
// barrel; consumers should never call this in production code.
export function __resetForTests(): void {
  cached = null
  inflight = null
}
