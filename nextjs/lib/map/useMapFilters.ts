import { useCallback, useMemo, useState } from 'react';
import type { MapRestaurant, MapCategory, MapMustEat } from '@/lib/types';
import { berlinNow, getOpenStatus } from './openingHours';
import { PRICE_BUCKETS, matchesPriceBucket, priceBucketOf } from './priceBuckets';
import { byMustEatsThenName, openFirst } from './listOrder';
import { MUST_EATS_CATEGORY } from './mapFilterParams';
import {
  buildSearchIndex,
  matchesSearch,
  needsFuzzy,
  parseQuery,
  searchRank,
  suggestSpots,
} from './spotSearch';

/** Ab wie vielen Spots ein Bezirk im Filter erscheint. Zehn der zwanzig
 *  Bezirke lagen darunter, die Hälfte davon bei ein oder zwei Treffern. */
const BEZIRK_MIN_SPOTS = 5;
import { haversineDistance } from './distance';

interface Args {
  restaurants: MapRestaurant[];
  mustEats?: MapMustEat[];
  location: { lat: number; lng: number } | null;
  /** Where the map is looking, once the user has moved it (see listCenter.ts).
   *  Orders the LIST only — the markers and the camera fits keep working from
   *  the visitor's position. */
  listCenter?: { lat: number; lng: number } | null;
  /** Die Berliner Uhrzeit, nach der die Liste Geöffnetes nach vorn stellt
   *  (openFirst). Fest für den Besuch, damit nichts unter dem Finger umsortiert;
   *  ohne Angabe zählt die Zeit beim ersten Rendern. */
  orderedAt?: Date;
}

function districtOf(r: MapRestaurant): string | null {
  return r.bezirk?.name ?? r.district ?? null;
}

/** The three pickable filters plus the open-now toggle — everything the chip
 *  rail holds. The search box narrows on top of it (see filterRestaurant). */
interface MapChipState {
  category: MapCategory;
  bezirk: string | null;
  /** Eine Preisstufen-ID aus PRICE_BUCKETS, nicht der Preis selbst. */
  price: string | null;
  openOnly: boolean;
}

/** A picker dimension, i.e. a chip whose value is chosen from a list. */
export type FilterDimension = 'category' | 'bezirk' | 'price';

/** How many spots each picker row would yield. `byValue` is keyed by the same
 *  value the picker passes back (category slug, district name, raw cuisine);
 *  `withoutDimension` is the "Alle …" reset row for that picker.
 *
 *  Counted over the WHOLE catalogue — was uebrig bleibt, wenn eine Zahl auf
 *  null faellt, ist eine echte Null. */
export interface MapOptionCounts {
  byValue: Record<FilterDimension, Map<string, number>>;
  withoutDimension: Record<FilterDimension, number>;
}

function countOptions(
  list: MapRestaurant[],
  base: MapChipState,
  matchesQuery: (r: MapRestaurant) => boolean
): MapOptionCounts {
  const byValue: Record<FilterDimension, Map<string, number>> = {
    category: new Map(),
    bezirk: new Map(),
    price: new Map(),
  };
  const withoutDimension: Record<FilterDimension, number> = {
    category: 0,
    bezirk: 0,
    price: 0,
  };
  const bump = (into: Map<string, number>, key: string) => into.set(key, (into.get(key) ?? 0) + 1);

  for (const r of list) {
    if (!matchesQuery(r)) continue;
    // Each dimension is counted with its own chip lifted — otherwise every
    // row but the active one reads 0.
    if (matchesChips(r, { ...base, category: 'All' })) {
      withoutDimension.category += 1;
      for (const c of r.categories ?? []) if (c.slug) bump(byValue.category, c.slug);
      if (r.mustEatCount > 0) bump(byValue.category, MUST_EATS_CATEGORY);
    }
    if (matchesChips(r, { ...base, bezirk: null })) {
      withoutDimension.bezirk += 1;
      const d = districtOf(r);
      if (d) bump(byValue.bezirk, d);
    }
    if (matchesChips(r, { ...base, price: null })) {
      withoutDimension.price += 1;
      const bucket = priceBucketOf(r);
      if (bucket) bump(byValue.price, bucket);
    }
  }
  return { byValue, withoutDimension };
}

/** Pulled out of `filterRestaurant` so the same rules can answer a
 *  hypothetical — "how many spots if the Bezirk were Neukölln instead" — which
 *  is what puts a count on every picker row. */
function matchesChips(r: MapRestaurant, s: MapChipState): boolean {
  if (s.category === MUST_EATS_CATEGORY) {
    if (!(r.mustEatCount > 0)) return false;
  } else if (s.category !== 'All' && !r.categories?.some((c) => c.slug === s.category)) {
    return false;
  }
  if (s.bezirk && districtOf(r) !== s.bezirk) return false;
  if (s.price && !matchesPriceBucket(r, s.price)) return false;
  if (s.openOnly) {
    if (!r.openingHours) return false;
    if (!getOpenStatus(r.openingHours).isOpen) return false;
  }
  return true;
}

export function useMapFilters({
  restaurants,
  mustEats = [],
  location,
  listCenter = null,
  orderedAt,
}: Args) {
  const [fallbackOrderedAt] = useState(() => berlinNow());
  const orderTime = orderedAt ?? fallbackOrderedAt;
  const [category, setCategory] = useState<MapCategory>('All');
  const [search, setSearch] = useState('');
  const [bezirk, setBezirk] = useState<string | null>(null);
  const [price, setPrice] = useState<string | null>(null);
  const [openOnly, setOpenOnly] = useState(false);

  /* Der ganze Katalog. Bis zum 06.09.2026 kamen hier zwei Mengen zusammen —
     die freien Spots und die bezahlten —, weil die Picker beide beschreiben
     mussten. Seit die Karte frei ist, gibt es nur noch eine. */
  const catalogue = restaurants;

  /* Distinct district names across the catalogue — populates the Bezirk
     picker. Sorted alphabetically (German collation).

     Erst ab fünf Spots: die Liste stand auf 20 Werten, von denen die Hälfte
     ein bis drei Treffer hatte (Friedenau 1, Treptow 1, Lichtenberg 2 …) —
     eine Auswahl, die einen einzigen Spot zurückgibt, ist keine Auswahl
     (User, 2026-08-27). Gezählt wird über den GESAMTEN Katalog, nicht über die
     gerade gefilterte Menge: sonst käme und ginge Wedding, je nachdem, was
     sonst noch aktiv ist. Die Spots selbst bleiben auf der Karte, in der Liste
     und in der Suche — nur der Filter zeigt sie nicht mehr an. */
  const bezirkNames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of catalogue) {
      const d = districtOf(r);
      if (d) counts.set(d, (counts.get(d) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .filter(([, n]) => n >= BEZIRK_MIN_SPOTS)
      .map(([name]) => name)
      .sort((a, b) => a.localeCompare(b, 'de'));
  }, [catalogue]);

  /* Die Preisstufen stehen in fester Reihenfolge (billig → teuer), nicht
     alphabetisch: bei einer Skala ist die Reihenfolge die Information. Eine
     Stufe, die im Katalog niemand trägt, fällt raus — anders als bei den
     Küchen kann hier nichts „fehlen", was jemand gesucht hätte. */
  const priceBucketIds = useMemo(() => {
    const present = new Set<string>();
    for (const r of catalogue) {
      const bucket = priceBucketOf(r);
      if (bucket) present.add(bucket);
    }
    return PRICE_BUCKETS.map((b) => b.id).filter((id) => present.has(id));
  }, [catalogue]);

  const searchIndex = useMemo(
    () => buildSearchIndex(restaurants, mustEats),
    [restaurants, mustEats]
  );

  const tokens = useMemo(() => parseQuery(search), [search]);

  /* Findet die exakte Suche im ganzen Katalog nichts, darf jedes Wort einen
     Buchstaben danebenliegen (needsFuzzy, dieselbe Regel wie die Vorschläge). */
  const fuzzy = useMemo(() => needsFuzzy(searchIndex, tokens), [tokens, searchIndex]);

  const matchesQuery = useCallback(
    (r: MapRestaurant): boolean => {
      if (!tokens.length) return true;
      const entry = searchIndex.get(r._id);
      return Boolean(entry && matchesSearch(entry, tokens, fuzzy));
    },
    [tokens, searchIndex, fuzzy]
  );

  /* Suche UND Chips. Bis zum 23.09.2026 hob eine Anfrage jeden Chip auf —
     „pizza" in Neukölln zeigte Pizza aus ganz Berlin, die Chips standen
     ausgegraut daneben. Wer einen Bezirk gewählt hat und dann tippt, sucht
     IN diesem Bezirk (User, 23.09.2026). */
  const filterRestaurant = useCallback(
    (r: MapRestaurant): boolean =>
      matchesQuery(r) && matchesChips(r, { category, bezirk, price, openOnly }),
    [category, bezirk, price, openOnly, matchesQuery]
  );

  /* What every picker row would actually yield, counted against the OTHER
     chips. Both lists are built from the whole catalogue, so a Bezirk with
     five spots still offered all 23 cuisines and eighteen of them were
     guaranteed zeroes with nothing saying so — you found out by tapping and
     landing on "Keine Spots".

     The query counts too: it narrows the list like any chip, so a row that
     reads 12 under "pizza" has to yield 12 pizza spots. */
  const optionCounts = useMemo<MapOptionCounts>(
    () => countOptions(catalogue, { category, bezirk, price, openOnly }, matchesQuery),
    [catalogue, category, bezirk, price, openOnly, matchesQuery]
  );

  const nearestTo = useCallback(
    (list: MapRestaurant[], anchor: { lat: number; lng: number } | null) => {
      if (!anchor) return list;
      return [...list].sort((a, b) => {
        const aD = haversineDistance(anchor.lat, anchor.lng, a.lat, a.lng);
        const bD = haversineDistance(anchor.lat, anchor.lng, b.lat, b.lng);
        return aD - bD;
      });
    },
    []
  );
  const nearestFirst = useCallback(
    (list: MapRestaurant[]) => nearestTo(list, location),
    [nearestTo, location]
  );

  // Die Treffer. Sie speisen die Marker und die Kamera — die Liste hat ihre
  // eigene Ordnung, gleich darunter.
  const displayedRestaurants = useMemo(
    () => nearestFirst(restaurants.filter(filterRestaurant)),
    [restaurants, filterRestaurant, nearestFirst]
  );

  /* Was die LISTE zeigt: dieselben Treffer, anders sortiert. Ein Ort schlaegt
     alles — das ist der ganze Anspruch einer Karte: das sind die Spots um HIER
     herum. „Hier" ist die Kartenmitte, sobald jemand die Karte bewegt hat
     (listCenter), und bis dahin die eigene Position. Ohne beides entscheidet
     byMustEatsThenName. Darüber steht, was gerade geöffnet hat (openFirst). */
  const listRestaurants = useMemo(() => {
    const anchor = listCenter ?? location;
    /* Geöffnet vor geschlossen — über der Entfernung, auch mit Standort: der
       nächste Laden hilft nicht, wenn er zu hat. */
    const ordered = openFirst(
      anchor
        ? nearestTo(displayedRestaurants, anchor)
        : [...displayedRestaurants].sort(byMustEatsThenName),
      orderTime
    );
    if (!tokens.length) return ordered;
    /* Bei einer Suche zuerst, wie gut ein Spot passt; sort ist stabil, die
       Ordnung darueber bleibt innerhalb einer Stufe stehen. */
    const rank = new Map(
      ordered.map((r) => {
        const entry = searchIndex.get(r._id);
        return [r._id, entry ? searchRank(entry, tokens) : 2] as const;
      })
    );
    return ordered.sort((a, b) => rank.get(a._id)! - rank.get(b._id)!);
  }, [displayedRestaurants, listCenter, location, nearestTo, orderTime, tokens, searchIndex]);

  /* Vorschläge fürs Suchfeld: was die Anfrage beim Abschicken in die Liste
     holen würde, also mit den Chips — wer einen Bezirk gewählt hat, sucht
     in diesem Bezirk (s. filterRestaurant). */
  const suggest = useCallback(
    (query: string) =>
      suggestSpots(catalogue, searchIndex, query, {
        keep: (r) => matchesChips(r, { category, bezirk, price, openOnly }),
      }),
    [catalogue, searchIndex, category, bezirk, price, openOnly]
  );

  return {
    category,
    setCategory,
    search,
    setSearch,
    suggest,
    bezirk,
    setBezirk,
    price,
    setPrice,
    openOnly,
    setOpenOnly,
    bezirkNames,
    priceBucketIds,
    optionCounts,
    displayedRestaurants,
    listRestaurants,
  };
}
