import { readSanity } from '@/lib/sanity-read';
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

/** Nur die Karten, ohne den Spot-Katalog. Dieselbe Abfrage mit denselben
 *  Optionen wie in `getCachedMapData`, also derselbe Eintrag im Data Cache. */
export function getCachedMustEats(): Promise<MapMustEat[]> {
  return readSanity<MapMustEat[]>(mapMustEatsQuery, {}, MAP_CACHE_OPTIONS);
}

/* Nexts Data Cache fasst gleichzeitige Anfragen nicht zusammen, solange sein
   Eintrag leer ist: 20 Aufrufe von /map auf einer frischen Instanz waren 20-mal
   der ganze Katalog (680 kB). Ein geteiltes Promise ginge nicht, denn Next hängt
   die Tags an den Render, der den `fetch` selbst aufruft; eine ISR-Seite ohne
   `map-data` bliebe nach einer Änderung bis zu 24 Stunden alt. Deshalb warten
   die übrigen Aufrufer nur, bis die laufende Runde durch ist, und lesen dann
   selbst aus dem gefüllten Cache. Scheitert die Runde, versucht es jeder von
   ihnen einmal selbst, statt dass sich Zeitlimits aneinanderreihen. */
let catalogRead: Promise<void> | null = null;

function readCatalog() {
  // Cache each Sanity request in Next's shared Data Cache. Unlike a module
  // variable, these tagged entries can be invalidated across warm instances.
  return Promise.all([
    readSanity<MapRestaurant[]>(mapRestaurantsQuery, {}, MAP_CACHE_OPTIONS),
    getCachedMustEats(),
    readSanity<CategoryDef[]>(allCategoriesQuery, {}, MAP_CACHE_OPTIONS),
  ]);
}

export async function getCachedMapData(): Promise<CachedMapData> {
  if (catalogRead) await catalogRead;
  const read = readCatalog();
  catalogRead ??= read.then(
    () => {
      catalogRead = null;
    },
    () => {
      catalogRead = null;
    }
  );
  const [restaurants, mustEats, categories] = await read;
  return {
    restaurants: restaurants.map((r) => {
      const searchText = searchTextOf(r);
      return searchText ? { ...r, searchText } : r;
    }),
    mustEats,
    categories,
  };
}
