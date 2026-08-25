import { useCallback, useMemo, useState } from 'react';
import type { MapRestaurant, MapCategory, MapMustEat } from '@/lib/types';
import { getOpenStatus } from './openingHours';
import { haversineDistance } from './distance';

interface Args {
  restaurants: MapRestaurant[];
  /** Paywalled spots. Run through the same filter so the empty state can say
   *  how many matches are held back and the map can dot them in. */
  lockedRestaurants?: MapRestaurant[];
  mustEats?: MapMustEat[];
  location: { lat: number; lng: number } | null;
}

function districtOf(r: MapRestaurant): string | null {
  return r.bezirk?.name ?? r.district ?? null;
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
 *  The locked pair carries the same counts over the paywalled set, and it is
 *  what tells a dead end from an offer: a row with no free hits but three
 *  locked ones is worth tapping — the list shows what is being held back and
 *  names the price. Only a row with neither is nothing at all. */
export interface MapOptionCounts {
  byValue: Record<FilterDimension, Map<string, number>>;
  withoutDimension: Record<FilterDimension, number>;
  lockedByValue: Record<FilterDimension, Map<string, number>>;
  lockedWithoutDimension: Record<FilterDimension, number>;
}

interface DimensionCounts {
  byValue: Record<FilterDimension, Map<string, number>>;
  withoutDimension: Record<FilterDimension, number>;
}

/* One pass over one set of spots. Runs twice — free and locked — so both
   answers come out of the same rules; a second, hand-written locked counter is
   exactly how the two numbers would drift apart. */
function countOptions(list: MapRestaurant[], base: MapChipState): DimensionCounts {
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

  // Distinct district names across the visible set — populates the Bezirk
  // picker. Sorted alphabetically (German collation).
  const bezirkNames = useMemo(() => {
    const set = new Set<string>();
    for (const r of restaurants) {
      const d = districtOf(r);
      if (d) set.add(d);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'de'));
  }, [restaurants]);

  // Distinct cuisine values across the visible set — used to populate the
  // Cuisine picker. Sorted alphabetically (German collation).
  const cuisineNames = useMemo(() => {
    const set = new Set<string>();
    for (const r of restaurants) {
      const c = r.cuisineType?.trim();
      if (c) set.add(c);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'de'));
  }, [restaurants]);

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

     Counted twice, free and locked. The free number is what the list renders
     for a chip filter, so it is what the row has to predict; the locked one is
     what separates "nothing here" from "everything here is in a pack". Search
     is left out on purpose — a query overrides the chips (see above), and these
     counts describe what the chips give once it is cleared. */
  const optionCounts = useMemo<MapOptionCounts>(() => {
    const base = { category, bezirk, cuisine, openOnly };
    const free = countOptions(restaurants, base);
    const locked = countOptions(lockedRestaurants, base);
    return {
      byValue: free.byValue,
      withoutDimension: free.withoutDimension,
      lockedByValue: locked.byValue,
      lockedWithoutDimension: locked.withoutDimension,
    };
  }, [restaurants, lockedRestaurants, category, bezirk, cuisine, openOnly]);

  const displayedRestaurants = useMemo(() => {
    const filtered = restaurants.filter(filterRestaurant);
    if (!location) return filtered;
    return [...filtered].sort((a, b) => {
      const aD = haversineDistance(location.lat, location.lng, a.lat, a.lng);
      const bD = haversineDistance(location.lat, location.lng, b.lat, b.lng);
      return aD - bD;
    });
  }, [restaurants, filterRestaurant, location]);

  // The same filter applied to the locked rows. Two consumers, both uncapped:
  // the empty state names how many matches the paywall is holding back, and
  // the map draws each one as a muted dot so the locked catalogue is visible
  // instead of simply absent. The list is never rendered as rows.
  const displayedLockedRestaurants = useMemo(
    () => lockedRestaurants.filter(filterRestaurant),
    [lockedRestaurants, filterRestaurant]
  );

  const lockedMatchCount = displayedLockedRestaurants.length;

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
    lockedMatchCount,
  };
}
