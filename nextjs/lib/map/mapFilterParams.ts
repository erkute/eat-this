import type { MapCategory, MapRestaurant } from '@/lib/types';
import { isPriceBucketId } from './priceBuckets';

/** The five map filters, in the shape useMapFilters holds them. `bezirk` is a
 *  display value (a district NAME); the URL carries the district's slug
 *  instead, so the params stay readable and match the ?bezirk= links the
 *  bezirk pages already emit. `price` is a Preisstufen-ID („20"), die in
 *  beiden Richtungen dieselbe ist. */
export interface MapFilterState {
  category: MapCategory;
  bezirk: string | null;
  price: string | null;
  search: string;
  openOnly: boolean;
}

export const MAP_FILTER_DEFAULTS: MapFilterState = {
  category: 'All',
  bezirk: null,
  price: null,
  search: '',
  openOnly: false,
};

/* `cat` and `bezirk` are pre-existing inbound params — the kategorie, bezirk
   and guide pages link into the map with them (MapPromoCTA). Their names and
   slug values are therefore fixed; `price`, `q` and `open` are new.
   `cuisine` stand hier bis zum 27.08.2026 und ist ersatzlos weg — der Filter
   las ein ungeprüftes Freitextfeld aus. Alte Links mit ?cuisine= verlieren
   still ihren Filter und zeigen die ganze Karte; das ist das Verhalten, das
   ein unbekannter Parameter hier immer schon hatte. */
const MAP_FILTER_KEYS = ['cat', 'bezirk', 'price', 'q', 'open'] as const;

/** The current URL with `params` swapped in, path and hash untouched. Both map
 *  URL writers — the filters here and the ?r=/?me= detail sync in MapSection —
 *  need it to compare against location before touching the history stack. */
export function urlWithParams(params: URLSearchParams): string {
  const qs = params.toString();
  return window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash;
}

export function currentUrl(): string {
  return window.location.pathname + window.location.search + window.location.hash;
}

/** Chips = everything except the search box. The two are split because only a
 *  chip earns a history entry — see the push rule in useMapFilterUrl. */
export function hasActiveChips(state: MapFilterState): boolean {
  return (
    state.category !== MAP_FILTER_DEFAULTS.category ||
    state.bezirk !== null ||
    state.price !== null ||
    state.openOnly
  );
}

export function isDefaultFilterState(state: MapFilterState): boolean {
  return !hasActiveChips(state) && state.search === '';
}

/** Slug ⇄ display-value lookups, built from the restaurant rows themselves so
 *  a param only ever resolves to a value the filters can actually match. */
export interface MapFilterIndex {
  bezirkNameBySlug: Map<string, string>;
  bezirkSlugByName: Map<string, string>;
  categorySlugByLower: Map<string, string>;
}

export function buildMapFilterIndex(rows: MapRestaurant[][]): MapFilterIndex {
  const index: MapFilterIndex = {
    bezirkNameBySlug: new Map(),
    bezirkSlugByName: new Map(),
    categorySlugByLower: new Map(),
  };
  for (const set of rows) {
    for (const r of set) {
      const name = r.bezirk?.name;
      const slug = r.bezirk?.slug;
      if (name && slug) {
        index.bezirkNameBySlug.set(slug.toLowerCase(), name);
        index.bezirkSlugByName.set(name, slug);
      }
      for (const c of r.categories ?? []) {
        if (c.slug) index.categorySlugByLower.set(c.slug.toLowerCase(), c.slug);
      }
    }
  }
  return index;
}

/** URL → filter state. Absent or unresolvable params fall back to the default,
 *  so the result is always the complete state the URL describes — which is what
 *  a popstate needs: backing out of `?cat=pizza` has to clear the category, not
 *  merely leave it alone. An unresolvable slug is dropped rather than applied;
 *  a filter nothing matches reads as a broken map. */
export function resolveMapFilterState(search: string, index: MapFilterIndex): MapFilterState {
  const params = new URLSearchParams(search);
  const state: MapFilterState = { ...MAP_FILTER_DEFAULTS };

  const cat = params.get('cat');
  if (cat) {
    const canonical = index.categorySlugByLower.get(cat.toLowerCase());
    if (canonical) state.category = canonical;
  }

  const bezirk = params.get('bezirk');
  if (bezirk) {
    const name = index.bezirkNameBySlug.get(bezirk.toLowerCase());
    if (name) state.bezirk = name;
  }

  const price = params.get('price');
  if (price && isPriceBucketId(price)) state.price = price;

  state.search = params.get('q') ?? '';
  state.openOnly = params.get('open') === '1';

  return state;
}

/** Filter state → URL, in place on an existing URLSearchParams so ?r= / ?me=
 *  and anything else on the URL survive. Default values are removed, never
 *  written as empty — the clean `/map` URL is the shareable one. */
export function writeMapFilterParams(
  params: URLSearchParams,
  state: MapFilterState,
  index: MapFilterIndex
): void {
  for (const key of MAP_FILTER_KEYS) params.delete(key);

  if (state.category !== 'All') params.set('cat', state.category);
  if (state.bezirk) {
    const slug = index.bezirkSlugByName.get(state.bezirk);
    // No slug (a district the rows never named) cannot round-trip, so it stays
    // out of the URL rather than producing a link that silently drops it.
    if (slug) params.set('bezirk', slug);
  }
  if (state.price) params.set('price', state.price);
  if (state.search) params.set('q', state.search);
  if (state.openOnly) params.set('open', '1');
}
