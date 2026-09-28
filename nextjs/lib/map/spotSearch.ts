import type { MapRestaurant, MapMustEat } from '@/lib/types';
import { CUISINE_LABELS_DE } from '@/lib/cuisineLabels';

/**
 * Die Suche auf der Karte: was ein Spot hergibt, wie eine Anfrage gelesen
 * wird und ob beides zusammenpasst. Gefiltert und sortiert wird in
 * useMapFilters; hier steht nur die Sprache der Suche.
 */

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
      .replace(/['’ʼ´`]/g, '')
      /* Ausgeschriebene Umlaute: „doener", „neukoelln" — so tippt man ohne
       Umlaut-Taste. Nach dem Akzent-Abstreifen steht „ö" schon als „o", also
       wird „oe" ebenfalls „o", auf BEIDEN Seiten. Dass dabei auch ein
       „Blue" zu „blu" wird, schadet nicht: die Anfrage wird genauso gefaltet. */
      .replace(/ae/g, 'a')
      .replace(/oe/g, 'o')
      .replace(/ue/g, 'u')
      /* Die Adressen schreiben mal „Weserstr. 208", mal „Weichselstraße 17";
       getippt wird beides und dazu „strasse". Alles wird „str", der Punkt
       fällt weg. */
      .replace(/strasse/g, 'str')
      .replace(/\./g, '')
  );
}

/* Die Kieze, wie sie im Alltag heissen. Greift auf die schon gefaltete
   Anfrage — „P'berg" ist dort „pberg", „X-Berg" ist „x-berg". */
const KIEZ_NAMES: [RegExp, string][] = [
  [/(^|\s)x-?berg(?=\s|$)/g, '$1kreuzberg'],
  [/(^|\s)f-?hain(?=\s|$)/g, '$1friedrichshain'],
  [/(^|\s)p-?berg(?=\s|$)/g, '$1prenzlauer berg'],
];

/* Wörter, die etwas anderes meinen, als am Spot steht. Jeder Eintrag: die
   getippten Formen, dann was stattdessen auch trifft — am Wortanfang, damit
   „eis" als Alternative nicht in „Reisbar" landet.

   Bewusst schmal. Nicht drin ist sushi → Japanisch: das lieferte Ramen.
   Und cocktail → Bar nicht, weil „bar" auch „barlevain" trifft, eine
   Bäckerei. Gemessen am echten Katalog, 28.09.2026: „brunch", „kebab",
   „nkln" fanden nichts. */
const SYNONYMS: [string[], string[]][] = [
  [['brunch'], ['fruhstuck', 'breakfast']],
  [['kebab', 'kebap', 'doner', 'doener'], ['kebab', 'kebap', 'doner', 'turkish', 'turkisch']],
  [['nkln'], ['neukolln']],
  [['gelato'], ['eisdiele', 'ice cream']],
  [['wein', 'naturwein'], ['wine', 'wein']],
  [['pasta'], ['italian', 'italienisch']],
  [['vegetarisch', 'veggie'], ['vegan', 'vegetarisch']],
  [['brot'], ['bakery', 'backerei']],
];
const SYNONYMS_BY_WORD = new Map(
  SYNONYMS.flatMap(([words, alternatives]) =>
    words.map((w) => [normalizeForSearch(w), alternatives.map(normalizeForSearch)] as const)
  )
);

/** Ein Wort der Anfrage und was es noch meinen darf. */
export interface QueryWord {
  text: string;
  alternatives: string[];
}

/** Die Anfrage als Woerter. Jedes muss irgendwo am Spot stehen — nicht der
 *  ganze Satz in einem Feld: „pizza neukölln" fand sonst nichts. */
export function parseQuery(query: string): QueryWord[] {
  let q = normalizeForSearch(query.trim());
  /* Der volle Name wird gefaltet wie alles andere — „Prenzlauer" steht im
     Index als „prenzlaur". */
  for (const [pattern, name] of KIEZ_NAMES) q = q.replace(pattern, normalizeForSearch(name));
  return q
    .split(/\s+/)
    .filter(Boolean)
    .map((text) => ({ text, alternatives: SYNONYMS_BY_WORD.get(text) ?? [] }));
}

/** Steht `token` in `hay` am Anfang eines Wortes? */
function startsWord(hay: string, token: string): boolean {
  for (let i = hay.indexOf(token); i !== -1; i = hay.indexOf(token, i + 1)) {
    if (i === 0 || !/[a-z0-9]/.test(hay[i - 1])) return true;
  }
  return false;
}

/** Was ein Spot fuer die Suche hergibt, einmal gefaltet. */
export interface SearchEntry {
  name: string;
  /** Alle durchsuchten Felder, durch „ | " getrennt, damit kein Wort ueber
   *  eine Feldgrenze hinweg entsteht. */
  all: string;
  /** Die einzelnen Woerter aus `all`, fuer den Tippfehler-Durchgang. */
  words: string[];
}

/** Jeder Spot einmal gefaltet, statt bei jedem Tastendruck jedes Feld neu. */
export function buildSearchIndex(
  restaurants: MapRestaurant[],
  mustEats: MapMustEat[]
): Map<string, SearchEntry> {
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
      /* Die Strasse. Seit 28.09.2026 wieder im Kartenpayload
         (mapRestaurantsQuery) — davor stand sie nur hier, und
         „kastanienallee" fand nichts. */
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
    const all = fields.filter(Boolean).map(normalizeForSearch).join(' | ');
    index.set(r._id, {
      name: normalizeForSearch(r.name),
      all,
      words: [...new Set(all.split(/[^a-z0-9]+/).filter(Boolean))],
    });
  }
  return index;
}

/* Ab dieser Länge darf ein Wort einen Buchstaben danebenliegen. Kürzer rät
   die Suche zu viel: „ruz" wäre „rutz", „reis", „rum". */
const FUZZY_MIN_LENGTH = 4;

/** Höchstens ein Buchstabe daneben: vertauscht, ersetzt, zu viel, zu wenig. */
function withinOneEdit(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  if (a.length === b.length) {
    const diff: number[] = [];
    for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) diff.push(i);
    if (diff.length === 1) return true;
    // Zwei Nachbarn vertauscht: „pzizza".
    return (
      diff.length === 2 &&
      diff[1] === diff[0] + 1 &&
      a[diff[0]] === b[diff[1]] &&
      a[diff[1]] === b[diff[0]]
    );
  }
  const [short, long] = a.length < b.length ? [a, b] : [b, a];
  let i = 0;
  while (i < short.length && short[i] === long[i]) i += 1;
  return short.slice(i) === long.slice(i + 1);
}

/** Beginnt ein Wort des Spots mit `token`, bis auf einen Buchstaben? */
function nearWordStart(words: string[], token: string): boolean {
  if (token.length < FUZZY_MIN_LENGTH) return false;
  return words.some((word) =>
    [token.length - 1, token.length, token.length + 1].some(
      (n) => n <= word.length && withinOneEdit(token, word.slice(0, n))
    )
  );
}

function wordMatches(entry: SearchEntry, word: QueryWord, fuzzy: boolean): boolean {
  if (entry.all.includes(word.text)) return true;
  if (word.alternatives.some((alt) => startsWord(entry.all, alt))) return true;
  return fuzzy && nearWordStart(entry.words, word.text);
}

/**
 * Passt der Spot zur Anfrage? Jedes Wort muss treffen. `fuzzy` lässt pro
 * Wort einen Buchstaben daneben zu — nur für den Rückfall, wenn die exakte
 * Suche im ganzen Katalog nichts findet (useMapFilters). So kommt nach
 * „piza" die Pizza, und „eis" holt trotzdem kein „reis" dazu.
 */
export function matchesSearch(entry: SearchEntry, query: QueryWord[], fuzzy = false): boolean {
  return query.every((word) => wordMatches(entry, word, fuzzy));
}

/**
 * Wie gut ein Spot zur Anfrage passt, 0 am besten. Die Liste sortiert sonst
 * nach Entfernung, und bei „eis" stand das „Speiselokal" um die Ecke vor der
 * Eisdiele. Innerhalb einer Stufe bleibt die Entfernung.
 */
export function searchRank(entry: SearchEntry, query: QueryWord[]): number {
  if (query.every((w) => startsWord(entry.name, w.text))) return 0;
  if (
    query.every(
      (w) => startsWord(entry.all, w.text) || w.alternatives.some((alt) => startsWord(entry.all, alt))
    )
  ) {
    return 1;
  }
  return 2;
}
