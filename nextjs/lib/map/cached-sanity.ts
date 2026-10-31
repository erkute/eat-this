import { client } from '@/lib/sanity';
import { SANITY_LIVE_SURFACE_SECONDS } from '@/lib/constants';
import { mapRestaurantsQuery, mapMustEatsQuery } from './queries';
import { allCategoriesQuery } from '@/lib/queries';
import type { MapRestaurant, MapMustEat } from '@/lib/types';
import type { CategoryDef } from '@/lib/categories';
import searchTerms from './search-terms.json';

/* Der Suchindex (scripts/build-search-terms.ts): je Spot, was es dort gibt.
   Die Beschreibung selbst zu durchsuchen findet jede Erwähnung — „im
   Eisladen" war ein Eis-Treffer, „Turkish Eggs" ein Döner. Ein Spot ohne
   Eintrag (neu seit dem letzten Lauf) bleibt über seine Beschreibung
   findbar. */
const SEARCH_TERMS: Record<string, { t: string[] } | undefined> = searchTerms;

function searchTextOf(r: MapRestaurant): string | undefined {
  const indexed = SEARCH_TERMS[r._id];
  /* „ | " trennt die Begriffe, damit kein Treffer über zwei hinweg entsteht. */
  if (indexed) return indexed.t.join(' | ');
  if (!r.searchText) return undefined;
  return [...new Set(r.searchText.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean))].join(' ');
}

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
  return {
    restaurants: restaurants.map((r) => {
      const searchText = searchTextOf(r);
      return searchText ? { ...r, searchText } : r;
    }),
    mustEats,
    categories,
  };
}
