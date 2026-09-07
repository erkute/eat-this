import { useCallback, useMemo, useState } from 'react';
import type { MapRestaurant, MapCategory, MapMustEat } from '@/lib/types';
import { getOpenStatus } from './openingHours';
import { PRICE_BUCKETS, matchesPriceBucket, priceBucketOf } from './priceBuckets';
import { byMustEatsThenName } from './listOrder';
import { CUISINE_LABELS_DE } from '@/lib/cuisineLabels';
import { abbreviateBezirk } from './abbreviateBezirk';

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
}

function districtOf(r: MapRestaurant): string | null {
  return r.bezirk?.name ?? r.district ?? null;
}

/* Kleinschreibung reicht für eine Suche über Restaurantnamen nicht.
 * „banh mi" fand die beiden „Saveur de Bánh Mì" nicht, weil `includes` Zeichen
 * für Zeichen vergleicht und `a` nicht `á` ist. Dasselbe trifft Döner, Café,
 * Türkisch, Neukölln — also fast alles, was man hier tippt.
 *
 * NFD zerlegt jeden Buchstaben in Grundzeichen plus Akzent, danach fliegen die
 * Akzente raus. Das wirkt auf BEIDEN Seiten: „Türkisch" getippt findet
 * „Turkisch" geschrieben und umgekehrt. */
export function normalizeForSearch(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    /* Apostrophe fliegen mit raus, in allen vier Schreibweisen, die im
       Bestand vorkommen. „KuchenRausch's", „EIVGI´S" und die Kurzform
       „P'berg" tippt niemand mit dem richtigen Zeichen — und welches das
       richtige ist, weiss man dem Namen nicht an. */
    .replace(/['\u2019\u02bc\u00b4`]/g, '');
}

function includesQuery(value: string | null | undefined, q: string): boolean {
  if (!value) return false;
  return normalizeForSearch(value).includes(q);
}

/** The three pickable filters plus the open-now toggle — everything the chip
 *  rail holds. The search box is deliberately not part of it: a query replaces
 *  this whole predicate rather than narrowing it. */
export interface MapChipState {
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

function countOptions(list: MapRestaurant[], base: MapChipState): MapOptionCounts {
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
    // Each dimension is counted with its own chip lifted — otherwise every
    // row but the active one reads 0.
    if (matchesChips(r, { ...base, category: 'All' })) {
      withoutDimension.category += 1;
      for (const c of r.categories ?? []) if (c.slug) bump(byValue.category, c.slug);
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
  if (s.category !== 'All' && !r.categories?.some((c) => c.slug === s.category)) return false;
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
}: Args) {
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

  const dishIndexByRestaurantId = useMemo(() => {
    const index = new Map<string, string>();
    for (const mustEat of mustEats) {
      const restaurantId = mustEat.restaurant?._id;
      const dish = mustEat.dish?.trim();
      if (!restaurantId || !dish) continue;
      index.set(restaurantId, `${index.get(restaurantId) ?? ''} ${normalizeForSearch(dish)}`);
    }
    return index;
  }, [mustEats]);

  // A non-empty search query overrides all other filters: the user expects to
  // find anything on the map regardless of the active bezirk/category/open
  // selection.
  const filterRestaurant = useCallback(
    (r: MapRestaurant): boolean => {
      const q = normalizeForSearch(search.trim());
      if (q) {
        const dishIndex = dishIndexByRestaurantId.get(r._id) ?? '';
        const hit =
          includesQuery(r.name, q) ||
          includesQuery(districtOf(r), q) ||
          /* „P'berg" steht so auf den Aufklebern der Liste — wer es liest,
             tippt es auch. */
          includesQuery(abbreviateBezirk(districtOf(r)), q) ||
          /* Die Strasse. Sie liegt ohnehin im Kartenpayload, kostet hier also
             nichts, und „Kastanienallee" ist eine Suche wie jede andere. */
          includesQuery(r.address, q) ||
          includesQuery(r.cuisineType, q) ||
          /* Die Küche steht in Sanity ENGLISCH („Vietnamese"), auf den
             deutschen Seiten liest man aber das Label („Vietnamesisch") — und
             genau das tippt man dann auch. Ohne diese Zeile fand „vietnamesisch"
             keinen der acht vietnamesischen Spots. Beide Formen zählen, damit
             die Suche in beiden Sprachen dasselbe findet. */
          (r.cuisineType ? includesQuery(CUISINE_LABELS_DE[r.cuisineType], q) : false) ||
          dishIndex.includes(q) ||
          r.categories?.some(
            (c) =>
              includesQuery(c.name, q) || includesQuery(c.nameEn, q) || includesQuery(c.slug, q)
          );
        return Boolean(hit);
      }
      return matchesChips(r, { category, bezirk, price, openOnly });
    },
    [category, bezirk, price, openOnly, search, dishIndexByRestaurantId]
  );

  /* What every picker row would actually yield, counted against the OTHER
     chips. Both lists are built from the whole catalogue, so a Bezirk with
     five spots still offered all 23 cuisines and eighteen of them were
     guaranteed zeroes with nothing saying so — you found out by tapping and
     landing on "Keine Spots".

     Search is left out on purpose — a query overrides the chips (see above),
     and these counts describe what the chips give once it is cleared. */
  const optionCounts = useMemo<MapOptionCounts>(
    () => countOptions(catalogue, { category, bezirk, price, openOnly }),
    [catalogue, category, bezirk, price, openOnly]
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
     byMustEatsThenName. */
  const listRestaurants = useMemo(() => {
    const anchor = listCenter ?? location;
    return anchor
      ? nearestTo(displayedRestaurants, anchor)
      : [...displayedRestaurants].sort(byMustEatsThenName);
  }, [displayedRestaurants, listCenter, location, nearestTo]);

  return {
    category,
    setCategory,
    search,
    setSearch,
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
