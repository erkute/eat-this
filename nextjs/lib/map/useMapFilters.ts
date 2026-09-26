import { useCallback, useMemo, useState } from 'react';
import type { MapRestaurant, MapCategory, MapMustEat } from '@/lib/types';
import { getOpenStatus } from './openingHours';
import { PRICE_BUCKETS, matchesPriceBucket, priceBucketOf } from './priceBuckets';
import { byMustEatsThenName } from './listOrder';
import { CUISINE_LABELS_DE } from '@/lib/cuisineLabels';

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
function normalizeForSearch(value: string | null | undefined): string {
  return (
    (value ?? '')
      .toLowerCase()
      /* NFD zerlegt ß nicht; alle Adressen schreiben „straße", getippt wird
       „strasse". */
      .replace(/ß/g, 'ss')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      /* Apostrophe fliegen mit raus, in allen vier Schreibweisen, die im
       Bestand vorkommen. „KuchenRausch's", „EIVGI´S" und die Kurzform
       „P'berg" tippt niemand mit dem richtigen Zeichen — und welches das
       richtige ist, weiss man dem Namen nicht an. */
      .replace(/['\u2019\u02bc\u00b4`]/g, '')
      /* Ausgeschriebene Umlaute: „doener", „neukoelln" — so tippt man ohne
       Umlaut-Taste. Nach dem Akzent-Abstreifen steht „ö" schon als „o", also
       wird „oe" ebenfalls „o", auf BEIDEN Seiten. Dass dabei auch ein
       „Blue" zu „blu" wird, schadet nicht: die Anfrage wird genauso gefaltet. */
      .replace(/ae/g, 'a')
      .replace(/oe/g, 'o')
      .replace(/ue/g, 'u')
  );
}

/* Die Kieze, wie sie im Alltag heissen. Greift auf die schon gefaltete
   Anfrage — „P'berg" ist dort „pberg", „X-Berg" ist „x-berg". */
const KIEZ_NAMES: [RegExp, string][] = [
  [/(^|\s)x-?berg(?=\s|$)/g, '$1kreuzberg'],
  [/(^|\s)f-?hain(?=\s|$)/g, '$1friedrichshain'],
  [/(^|\s)p-?berg(?=\s|$)/g, '$1prenzlauer berg'],
];

/** Die Anfrage als Woerter. Jedes muss irgendwo am Spot stehen — nicht der
 *  ganze Satz in einem Feld: „pizza neukölln" fand sonst nichts. */
function searchTokens(query: string): string[] {
  let q = normalizeForSearch(query.trim());
  /* Der volle Name wird gefaltet wie alles andere — „Prenzlauer" steht im
     Index als „prenzlaur". */
  for (const [pattern, name] of KIEZ_NAMES) q = q.replace(pattern, normalizeForSearch(name));
  return q.split(/\s+/).filter(Boolean);
}

/** Steht `token` in `hay` am Anfang eines Wortes? */
function startsWord(hay: string, token: string): boolean {
  for (let i = hay.indexOf(token); i !== -1; i = hay.indexOf(token, i + 1)) {
    if (i === 0 || !/[a-z0-9]/.test(hay[i - 1])) return true;
  }
  return false;
}

/** Was ein Spot fuer die Suche hergibt, einmal gefaltet. */
interface SearchEntry {
  name: string;
  /** Alle durchsuchten Felder, durch „ | " getrennt, damit kein Wort ueber
   *  eine Feldgrenze hinweg entsteht. */
  all: string;
}

/**
 * Wie gut ein Spot zur Anfrage passt, 0 am besten. Die Liste sortiert sonst
 * nach Entfernung, und bei „eis" stand das „Speiselokal" um die Ecke vor der
 * Eisdiele. Innerhalb einer Stufe bleibt die Entfernung.
 */
function searchRank(entry: SearchEntry, tokens: string[]): number {
  if (tokens.every((t) => startsWord(entry.name, t))) return 0;
  if (tokens.every((t) => startsWord(entry.all, t))) return 1;
  return 2;
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

export function useMapFilters({ restaurants, mustEats = [], location, listCenter = null }: Args) {
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

  /* Jeder Spot einmal gefaltet, statt bei jedem Tastendruck jedes Feld neu. */
  const searchIndex = useMemo(() => {
    const dishes = new Map<string, string[]>();
    for (const mustEat of mustEats) {
      const restaurantId = mustEat.restaurant?._id;
      const dish = mustEat.dish?.trim();
      if (!restaurantId || !dish) continue;
      dishes.set(restaurantId, [...(dishes.get(restaurantId) ?? []), dish]);
    }
    const index = new Map<string, SearchEntry>();
    for (const r of restaurants) {
      const fields = [
        r.name,
        districtOf(r),
        /* Die Strasse. Sie liegt ohnehin im Kartenpayload, kostet hier also
           nichts, und „Kastanienallee" ist eine Suche wie jede andere. */
        r.address,
        r.cuisineType,
        /* Die Küche steht in Sanity ENGLISCH („Vietnamese"), auf den
           deutschen Seiten liest man aber das Label („Vietnamesisch") — und
           genau das tippt man dann auch. Ohne dieses Feld fand
           „vietnamesisch" keinen der acht vietnamesischen Spots. Beide Formen
           zählen, damit die Suche in beiden Sprachen dasselbe findet. */
        r.cuisineType ? CUISINE_LABELS_DE[r.cuisineType] : null,
        ...(dishes.get(r._id) ?? []),
        ...(r.categories ?? []).flatMap((c) => [c.name, c.nameEn, c.slug]),
      ];
      index.set(r._id, {
        name: normalizeForSearch(r.name),
        all: fields.filter(Boolean).map(normalizeForSearch).join(' | '),
      });
    }
    return index;
  }, [restaurants, mustEats]);

  const tokens = useMemo(() => searchTokens(search), [search]);

  const matchesQuery = useCallback(
    (r: MapRestaurant): boolean => {
      if (!tokens.length) return true;
      const entry = searchIndex.get(r._id);
      return Boolean(entry && tokens.every((t) => entry.all.includes(t)));
    },
    [tokens, searchIndex]
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
     byMustEatsThenName. */
  const listRestaurants = useMemo(() => {
    const anchor = listCenter ?? location;
    const ordered = anchor
      ? nearestTo(displayedRestaurants, anchor)
      : [...displayedRestaurants].sort(byMustEatsThenName);
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
  }, [displayedRestaurants, listCenter, location, nearestTo, tokens, searchIndex]);

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
