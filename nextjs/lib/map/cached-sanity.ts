import { client } from '@/lib/sanity'
import { mapRestaurantsQuery, mapMustEatsQuery } from './queries'
import { allCategoriesQuery } from '@/lib/queries'
import type { MapRestaurant, MapMustEat } from '@/lib/types'
import type { CategoryDef } from '@/lib/categories'

interface CachedMapData {
  restaurants: MapRestaurant[]
  mustEats:    MapMustEat[]
  categories:  CategoryDef[]
}

const MAP_CACHE_OPTIONS = {
  next: { revalidate: 60, tags: ['map-data'] },
}

export async function getCachedMapData(): Promise<CachedMapData> {
  // Cache each Sanity request in Next's shared Data Cache. Unlike a module
  // variable, these tagged entries can be invalidated across warm instances.
  const [restaurants, mustEats, categories] = await Promise.all([
    client.fetch<MapRestaurant[]>(mapRestaurantsQuery, {}, MAP_CACHE_OPTIONS),
    client.fetch<MapMustEat[]>(mapMustEatsQuery, {}, MAP_CACHE_OPTIONS),
    client.fetch<CategoryDef[]>(allCategoriesQuery, {}, MAP_CACHE_OPTIONS),
  ])
  return { restaurants, mustEats, categories }
}
