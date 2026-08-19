import { useEffect, useMemo, useRef, useState } from 'react';
import type { MapCategory, MapRestaurant } from '@/lib/types';
import {
  buildMapFilterIndex,
  currentUrl,
  hasActiveChips,
  isDefaultFilterState,
  resolveMapFilterState,
  urlWithParams,
  writeMapFilterParams,
  MAP_FILTER_DEFAULTS,
  type MapFilterState,
} from './mapFilterParams';

interface Args extends MapFilterState {
  isActive: boolean;
  /** Both sets feed the slug index: a district can hold only locked spots
   *  (Friedenau for a free user), and ?bezirk= still has to resolve there —
   *  the list then shows those spots as locked previews. */
  restaurants: MapRestaurant[];
  lockedRestaurants: MapRestaurant[];
  setCategory: (c: MapCategory) => void;
  setBezirk: (name: string | null) => void;
  setCuisine: (c: string | null) => void;
  setSearch: (v: string) => void;
  setOpenOnly: (v: boolean) => void;
  /** The sheet is a peek by default; a URL that arrives pre-filtered should
   *  show the result it filtered for. Only ever raises the list view. */
  sheetView: 'list' | 'detail';
  setSnap: (snap: 'peek' | 'mid' | 'full') => void;
}

/**
 * Keeps the five map filters in the query string, both directions.
 *
 * Inbound is the older half: `?cat=` and `?bezirk=` already arrive from the
 * kategorie, bezirk and guide pages, so their names and slug values are fixed.
 * `?cuisine=`, `?q=` and `?open=` are new, and every one of them is now also
 * WRITTEN when the user picks a filter in the UI — which is what makes a
 * filtered map shareable, bookmarkable and survivable across a reload.
 *
 * The push rule: the first time a chip filter goes active we push one history
 * entry and then keep replacing it for the rest of the visit. Back therefore
 * returns to the unfiltered map instead of leaving it, and ten chip changes
 * still cost exactly one back press. Typing in the search box only ever
 * replaces — a query is a keystroke stream, not a decision, and each character
 * would otherwise be an entry to back out of.
 */
export function useMapFilterUrl({
  isActive,
  restaurants,
  lockedRestaurants,
  category,
  bezirk,
  cuisine,
  search,
  openOnly,
  setCategory,
  setBezirk,
  setCuisine,
  setSearch,
  setOpenOnly,
  sheetView,
  setSnap,
}: Args) {
  const index = useMemo(
    () => buildMapFilterIndex([restaurants, lockedRestaurants]),
    [restaurants, lockedRestaurants]
  );

  /* Applying a URL state is the same work at mount and on popstate, and both
     need the freshest setters — hence the ref rather than a dependency. */
  const applyRef = useRef<(locationSearch: string) => MapFilterState>(() => MAP_FILTER_DEFAULTS);
  applyRef.current = (locationSearch: string) => {
    const next = resolveMapFilterState(locationSearch, index);
    if (next.category !== category) setCategory(next.category);
    if (next.bezirk !== bezirk) setBezirk(next.bezirk);
    if (next.cuisine !== cuisine) setCuisine(next.cuisine);
    if (next.search !== search) setSearch(next.search);
    if (next.openOnly !== openOnly) setOpenOnly(next.openOnly);
    return next;
  };

  /* The URL wins at mount, and the writer below stays out of the way until it
     has. This is state and not a ref on purpose: a ref would flip within the
     same commit, the writer would then run while the props still held the
     defaults, and its first act would be to strip the very ?cat= it was handed.
     As state it batches with the setters above, so the writer's first run
     already sees the URL's filters and finds nothing to change. */
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (hydrated || !isActive) return;
    const params = new URLSearchParams(window.location.search);
    const needsIndex = params.has('cat') || params.has('bezirk') || params.has('cuisine');
    // Slug resolution needs the rows; q/open don't, so a URL carrying only
    // those applies immediately instead of waiting on a fetch.
    if (needsIndex && restaurants.length === 0 && lockedRestaurants.length === 0) return;
    setHydrated(true);
    const applied = applyRef.current(window.location.search);
    if (sheetView === 'list' && !isDefaultFilterState(applied)) setSnap('mid');
  }, [hydrated, isActive, restaurants, lockedRestaurants, index, sheetView, setSnap]);

  const pushedRef = useRef(false);
  useEffect(() => {
    if (!hydrated || !isActive) return;
    const state: MapFilterState = { category, bezirk, cuisine, search, openOnly };
    const params = new URLSearchParams(window.location.search);
    writeMapFilterParams(params, state, index);
    const next = urlWithParams(params);
    if (next === currentUrl()) return;

    if (hasActiveChips(state) && !pushedRef.current) {
      pushedRef.current = true;
      window.history.pushState(window.history.state, '', next);
      return;
    }
    window.history.replaceState(window.history.state, '', next);
  }, [hydrated, isActive, category, bezirk, cuisine, search, openOnly, index]);

  useEffect(() => {
    if (!isActive) return;
    const onPopState = () => applyRef.current(window.location.search);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [isActive]);
}
