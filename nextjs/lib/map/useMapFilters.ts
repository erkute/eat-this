import { useCallback, useMemo, useState } from 'react';
import type { MapRestaurant, MapCategory, MapMustEat } from '@/lib/types';
import { getOpenStatus } from './openingHours';
import { haversineDistance } from './distance';

interface Args {
  restaurants: MapRestaurant[];
  /** Paywalled spots. Run through the same filter as the free ones: they stand
   *  in the list, they are counted by the pickers, and the map dots them in. */
  lockedRestaurants?: MapRestaurant[];
  mustEats?: MapMustEat[];
  location: { lat: number; lng: number } | null;
}

function districtOf(r: MapRestaurant): string | null {
  return r.bezirk?.name ?? r.district ?? null;
}

/**
 * The list's order when there is no location to sort by.
 *
 * Without this the list simply inherited the order the map payload was
 * assembled in — curated spots, then the round-robin district fill, then
 * whatever the home page surfaces appended at the end (applyFreeSurface). That
 * last step is why tapping a dish on the home page and closing it again landed
 * you on the very last row of 340: not a ranking anyone chose, a build order
 * leaking into the UI.
 *
 * Must Eats first, because that is what the map is for — "we tell you what to
 * eat" — and only 28 of 344 spots carry one, so it is a real distinction rather
 * than a shuffle. Alphabetical underneath: nothing else in the payload ranks
 * quality (the importer fills photo, tip and description for every spot), and a
 * name at least makes the rest findable and keeps the order stable between two
 * visits. Free and paywalled spots rank by the same rule; they are one list.
 */
function byMustEatsThenName(a: MapRestaurant, b: MapRestaurant): number {
  const mustEats = (b.mustEatCount ?? 0) - (a.mustEatCount ?? 0);
  if (mustEats !== 0) return mustEats;
  return a.name.localeCompare(b.name, 'de');
}

function includesQuery(value: string | null | undefined, q: string): boolean {
  return Boolean(value?.toLowerCase().includes(q));
}

/** The three pickable filters plus the open-now toggle — everything the chip
 *  rail holds. The search box is deliberately not part of it: a query replaces
 *  this whole predicate rather than narrowing it. */
export interface MapChipState {
  category: MapCategory;
  bezirk: string | null;
  cuisine: string | null;
  openOnly: boolean;
}

/** A picker dimension, i.e. a chip whose value is chosen from a list. */
export type FilterDimension = 'category' | 'bezirk' | 'cuisine';

/** How many spots each picker row would yield. `byValue` is keyed by the same
 *  value the picker passes back (category slug, district name, raw cuisine);
 *  `withoutDimension` is the "Alle …" reset row for that picker.
 *
 *  Counted over the WHOLE catalogue, locked spots included — they stand in the
 *  list like any other row now, so a number that left them out would predict
 *  the wrong list. What is left of a zero is a real zero. */
export interface MapOptionCounts {
  byValue: Record<FilterDimension, Map<string, number>>;
  withoutDimension: Record<FilterDimension, number>;
}

function countOptions(list: MapRestaurant[], base: MapChipState): MapOptionCounts {
  const byValue: Record<FilterDimension, Map<string, number>> = {
    category: new Map(),
    bezirk: new Map(),
    cuisine: new Map(),
  };
  const withoutDimension: Record<FilterDimension, number> = {
    category: 0,
    bezirk: 0,
    cuisine: 0,
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
    if (matchesChips(r, { ...base, cuisine: null })) {
      withoutDimension.cuisine += 1;
      const c = r.cuisineType?.trim();
      if (c) bump(byValue.cuisine, c);
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
  if (s.cuisine && r.cuisineType !== s.cuisine) return false;
  if (s.openOnly) {
    if (!r.openingHours) return false;
    if (!getOpenStatus(r.openingHours).isOpen) return false;
  }
  return true;
}

export function useMapFilters({
  restaurants,
  lockedRestaurants = [],
  mustEats = [],
  location,
}: Args) {
  const [category, setCategory] = useState<MapCategory>('All');
  const [search, setSearch] = useState('');
  const [bezirk, setBezirk] = useState<string | null>(null);
  const [cuisine, setCuisine] = useState<string | null>(null);
  const [openOnly, setOpenOnly] = useState(false);

  /* Free and paywalled spots in one pile. Everything a picker offers and
     everything it counts comes from here: the list shows both, so the filters
     have to describe both. Built from the two sets rather than replacing them
     — the map still draws them differently, and only this file knows they were
     ever apart. */
  const catalogue = useMemo(
    () => [...restaurants, ...lockedRestaurants],
    [restaurants, lockedRestaurants]
  );

  // Distinct district names across the catalogue — populates the Bezirk
  // picker. Sorted alphabetically (German collation).
  const bezirkNames = useMemo(() => {
    const set = new Set<string>();
    for (const r of catalogue) {
      const d = districtOf(r);
      if (d) set.add(d);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'de'));
  }, [catalogue]);

  /* Distinct cuisine values across the catalogue — used to populate the Cuisine
     picker. Sorted alphabetically (German collation). A cuisine that only
     paywalled spots carry belongs in here: leaving it out did not just hide the
     offer, it hid that the map has Georgian food at all. */
  const cuisineNames = useMemo(() => {
    const set = new Set<string>();
    for (const r of catalogue) {
      const c = r.cuisineType?.trim();
      if (c) set.add(c);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'de'));
  }, [catalogue]);

  const dishIndexByRestaurantId = useMemo(() => {
    const index = new Map<string, string>();
    for (const mustEat of mustEats) {
      const restaurantId = mustEat.restaurant?._id;
      const dish = mustEat.dish?.trim();
      if (!restaurantId || !dish) continue;
      index.set(restaurantId, `${index.get(restaurantId) ?? ''} ${dish.toLowerCase()}`);
    }
    return index;
  }, [mustEats]);

  // A non-empty search query overrides all other filters: the user expects to
  // find anything on the map regardless of the active bezirk/category/open
  // selection.
  const filterRestaurant = useCallback(
    (r: MapRestaurant): boolean => {
      const q = search.trim().toLowerCase();
      if (q) {
        const dishIndex = dishIndexByRestaurantId.get(r._id) ?? '';
        const hit =
          includesQuery(r.name, q) ||
          includesQuery(districtOf(r), q) ||
          includesQuery(r.cuisineType, q) ||
          dishIndex.includes(q) ||
          r.categories?.some(
            (c) =>
              includesQuery(c.name, q) || includesQuery(c.nameEn, q) || includesQuery(c.slug, q)
          );
        return Boolean(hit);
      }
      return matchesChips(r, { category, bezirk, cuisine, openOnly });
    },
    [category, bezirk, cuisine, openOnly, search, dishIndexByRestaurantId]
  );

  /* What every picker row would actually yield, counted against the OTHER
     chips. Both lists are built from the whole catalogue, so a Bezirk with
     five spots still offered all 23 cuisines and eighteen of them were
     guaranteed zeroes with nothing saying so — you found out by tapping and
     landing on "Keine Spots".

     Search is left out on purpose — a query overrides the chips (see above),
     and these counts describe what the chips give once it is cleared. */
  const optionCounts = useMemo<MapOptionCounts>(
    () => countOptions(catalogue, { category, bezirk, cuisine, openOnly }),
    [catalogue, category, bezirk, cuisine, openOnly]
  );

  const nearestFirst = useCallback(
    (list: MapRestaurant[]) => {
      if (!location) return list;
      return [...list].sort((a, b) => {
        const aD = haversineDistance(location.lat, location.lng, a.lat, a.lng);
        const bD = haversineDistance(location.lat, location.lng, b.lat, b.lng);
        return aD - bD;
      });
    },
    [location]
  );

  // Free matches. Feeds the map's own markers and the camera — the list has
  // its own set below.
  const displayedRestaurants = useMemo(
    () => nearestFirst(restaurants.filter(filterRestaurant)),
    [restaurants, filterRestaurant, nearestFirst]
  );

  // The same filter over the paywalled spots — the map draws each one as a
  // muted dot, so the locked catalogue is visible instead of simply absent.
  const displayedLockedRestaurants = useMemo(
    () => lockedRestaurants.filter(filterRestaurant),
    [lockedRestaurants, filterRestaurant]
  );

  /* What the LIST renders: every match, locked ones among them (user decision
     25.08.2026). A locked row looks and behaves like any other until it is
     opened — the detail is where the paywall speaks, and it does that well.
     Splitting them into "yours" and "not yours" up here only ever produced
     surfaces that said 0 while the map underneath showed dots.

     A location outranks everything: the two sets interleave by distance like
     one list, which is the whole claim of a map — these are the spots around
     you. Without one, byMustEatsThenName decides. */
  const listRestaurants = useMemo(() => {
    const all = [...displayedRestaurants, ...displayedLockedRestaurants];
    return location ? nearestFirst(all) : all.sort(byMustEatsThenName);
  }, [displayedRestaurants, displayedLockedRestaurants, location, nearestFirst]);

  return {
    category,
    setCategory,
    search,
    setSearch,
    bezirk,
    setBezirk,
    cuisine,
    setCuisine,
    openOnly,
    setOpenOnly,
    bezirkNames,
    cuisineNames,
    optionCounts,
    displayedRestaurants,
    displayedLockedRestaurants,
    listRestaurants,
  };
}
