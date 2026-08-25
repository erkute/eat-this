import { client } from '@/lib/sanity';
import { SANITY_LIVE_SURFACE_SECONDS } from '@/lib/constants';
import { mapRestaurantsQuery, mapMustEatsQuery } from './queries';
import { allCategoriesQuery } from '@/lib/queries';
import type { MapRestaurant, MapMustEat } from '@/lib/types';
import type { CategoryDef } from '@/lib/categories';

interface CachedMapData {
  restaurants: MapRestaurant[];
  mustEats: MapMustEat[];
  categories: CategoryDef[];
}

// Fünf Minuten statt einer. /map ist force-dynamic; diese Fetches sind das
// Einzige, was die Fläche überhaupt cached hält, und bei einem Crawler, der die
// Karte im Minutentakt abruft, war die alte Frist ein Dauerabo auf frische
// Sanity-Anfragen. Der Webhook invalidiert `map-data` bei jeder Änderung
// gezielt — die Frist ist nur das Netz darunter.
const MAP_CACHE_OPTIONS = {
  next: { revalidate: SANITY_LIVE_SURFACE_SECONDS, tags: ['map-data'] },
};

export async function getCachedMapData(): Promise<CachedMapData> {
  // Cache each Sanity request in Next's shared Data Cache. Unlike a module
  // variable, these tagged entries can be invalidated across warm instances.
  const [restaurants, mustEats, categories] = await Promise.all([
    client.fetch<MapRestaurant[]>(mapRestaurantsQuery, {}, MAP_CACHE_OPTIONS),
    client.fetch<MapMustEat[]>(mapMustEatsQuery, {}, MAP_CACHE_OPTIONS),
    client.fetch<CategoryDef[]>(allCategoriesQuery, {}, MAP_CACHE_OPTIONS),
  ]);
  return { restaurants, mustEats, categories };
}
