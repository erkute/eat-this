import type { MapRestaurant, MapMustEat } from '@/lib/types';
import { CUISINE_LABELS_DE } from '@/lib/cuisineLabels';

/**
 * Die Suche auf der Karte: was ein Spot hergibt, wie eine Anfrage gelesen
 * wird und ob beides zusammenpasst. Gefiltert und sortiert wird in
 * useMapFilters; hier steht nur die Sprache der Suche.
 */

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

   Jede Zeile ist am echten Katalog gemessen (zuletzt 30.10.2026, 249 Spots)
   und zeigt nur auf Wörter, die dort vorkommen. Eine Alternative, die mehr
   Falsches als Richtiges holt, fliegt raus: sushi → Japanisch lieferte Ramen,
   cocktail → Bar die Bäckerei „barlevain", maki traf „making". */
const SYNONYMS: [string[], string[]][] = [
  [['brunch'], ['fruhstuck', 'breakfast']],
  [
    ['kebab', 'kebap', 'doner', 'doener'],
    ['kebab', 'kebap', 'doner', 'turkish', 'turkisch'],
  ],
  [['nkln'], ['neukolln']],
  [['gelato'], ['eisdiele', 'ice cream']],
  [
    ['wein', 'naturwein'],
    ['wine', 'wein'],
  ],
  [['pasta'], ['italian', 'italienisch']],
  [
    ['vegetarisch', 'veggie'],
    ['vegan', 'vegetarisch'],
  ],
  [['brot'], ['bakery', 'backerei']],
  /* Was man isst, nicht wie die Küche heisst — „Nudeln" stand an keinem Spot
     und fand nichts (Betreiber, 29.09.2026). Jede Zeile zeigt nur auf Küchen
     und Kategorien, die es im Bestand gibt (cuisineLabels.ts). */
  [
    ['nudeln', 'nudel', 'noodle', 'noodles'],
    /* „italienisch", nicht „italian": Pizzerien stehen als „Italian / Pizza"
       im Index und heissen auf Deutsch „Pizza" — die sind hier nicht gemeint. */
    [
      'nudel',
      'nudeln',
      'pasta',
      'noodle',
      'ramen',
      'udon',
      'soba',
      'spaghetti',
      'tagliatelle',
      'linguine',
      'fettuccine',
      'penne',
      'rigatoni',
      'vermicelli',
      'lasagne',
      'lasagna',
      'italienisch',
    ],
  ],
  [
    ['suppe', 'suppen', 'soup', 'soups'],
    ['suppe', 'suppen', 'soup', 'ramen', 'pho', 'laksa'],
  ],
  [['pho'], ['vietnamese', 'vietnamesisch']],
  [
    ['asiatisch', 'asiate', 'asia', 'asian'],
    [
      'chinese',
      'chinesisch',
      'japanese',
      'japanisch',
      'korean',
      'koreanisch',
      'thai',
      'vietnamese',
      'vietnamesisch',
      'indonesian',
      'indonesisch',
    ],
  ],
  [
    ['currywurst', 'wurst'],
    ['currywurst', 'imbiss', 'german / fast food'],
  ],
  [['schnitzel'], ['austrian', 'osterreichisch', 'deutsche kuche']],
  [
    ['falafel', 'hummus'],
    ['israeli', 'israelisch', 'middle eastern', 'orientalisch'],
  ],
  [
    ['dumplings', 'dumpling', 'teigtaschen', 'gyoza', 'wonton', 'wantan', 'jiaozi', 'baozi'],
    ['dumpling', 'teigtasche', 'gyoza', 'wonton', 'jiaozi', 'chinese', 'chinesisch'],
  ],
  [
    ['kuchen', 'torte'],
    ['bakery', 'backerei', 'desserts', 'konditorei'],
  ],
  [['fleisch'], ['steak', 'steakhouse', 'grill']],
  [['eiscafe'], ['ice cream', 'eisdiele', 'gelato']],
  [['mittag', 'mittagessen'], ['lunch']],
  [['abendessen', 'abends'], ['dinner']],
  /* Dasselbe Essen auf Deutsch und Englisch, in beide Richtungen: die Texte
     stehen in beiden Sprachen, aber nicht jeder Spot nennt beide Wörter
     (Katalog 30.10.2026: „Hähnchen" fand 15, „chicken" 27). */
  [
    ['hahnchen', 'huhn', 'chicken', 'hendl', 'poulet'],
    ['hahnchen', 'huhn', 'chicken', 'hendl', 'poulet', 'geflugel'],
  ],
  [
    ['fisch', 'fish'],
    ['fisch', 'fish', 'seafood', 'meeresfruchte'],
  ],
  [
    ['pommes', 'fries', 'frites'],
    ['pommes', 'fries', 'frites'],
  ],
  [
    ['eier', 'egg', 'eggs'],
    ['eier', 'egg', 'spiegelei', 'omelett', 'shakshuka'],
  ],
  [
    ['rind', 'rindfleisch', 'beef'],
    ['rind', 'beef', 'wagyu', 'steak'],
  ],
  [
    ['schwein', 'schweinefleisch', 'pork'],
    ['schwein', 'pork'],
  ],
  [
    ['lamm', 'lamb'],
    ['lamm', 'lamb'],
  ],
  [
    ['ente', 'duck'],
    ['ente', 'duck'],
  ],
  [
    ['tee', 'tea'],
    ['tee', 'tea', 'matcha', 'chai'],
  ],
  [
    ['kakao', 'cacao', 'cocoa'],
    ['kakao', 'cacao', 'cocoa'],
  ],
  [
    ['bier', 'beer'],
    ['bier', 'beer', 'brauerei', 'brewery'],
  ],
  [
    ['smoothie', 'smoothies', 'saft', 'juice'],
    ['smoothie', 'saft', 'juice'],
  ],
  /* Ein Kaffeegetränk meint das Café, nicht nur die Spots, die das Wort
     zufällig schreiben: „Cappuccino" fand einen einzigen. */
  [
    ['cappuccino', 'espresso', 'latte', 'kaffee', 'coffee', 'cortado'],
    ['kaffee', 'coffee', 'cafe', 'espresso', 'cappuccino', 'roaster', 'rosterei'],
  ],
  [
    ['eis', 'eiscreme', 'icecream', 'glace'],
    ['ice cream', 'eisdiele', 'gelato', 'eiscafe', 'sorbet'],
  ],
  [
    ['pfannkuchen', 'eierkuchen'],
    ['pancake', 'pfannkuchen'],
  ],
  [
    ['frikadelle', 'frikadellen', 'bulette', 'buletten', 'fleischpflanzerl'],
    ['frikadelle', 'bulette', 'boulette'],
  ],
  [['cheeseburger', 'hamburger'], ['burger']],
  [
    ['sashimi', 'nigiri'],
    ['sushi', 'sashimi', 'nigiri'],
  ],
  [
    ['bulgogi', 'bibimbap'],
    ['korean', 'koreanisch', 'bulgogi', 'bibimbap'],
  ],
  [
    ['gyros', 'souvlaki', 'tzatziki'],
    ['griechisch', 'greek', 'gyros', 'souvlaki'],
  ],
  [
    ['lahmacun', 'pide'],
    ['turkish', 'turkisch', 'lahmacun', 'pide'],
  ],
  [
    ['tacos', 'taco', 'burrito', 'quesadilla', 'nachos'],
    ['mexican', 'mexikanisch', 'taco', 'burrito', 'quesadilla'],
  ],
  [
    ['khachapuri', 'khinkali'],
    ['georgisch', 'georgian'],
  ],
  [
    ['donut', 'donuts', 'doughnut', 'krapfen'],
    ['donut', 'doughnut', 'krapfen', 'graffa'],
  ],
  [
    ['zimtschnecke', 'zimtschnecken', 'kanelbulle'],
    ['zimtschnecke', 'kanelbulle'],
  ],
  [
    ['geback', 'pastry', 'pastries', 'plunder', 'teilchen'],
    ['croissant', 'backerei', 'bakery', 'patisserie', 'plunder', 'zimtschnecke'],
  ],
  [
    ['sandwich', 'sandwiches', 'stulle', 'panini'],
    ['sandwich', 'stulle', 'panini', 'banh mi', 'bagel', 'deli'],
  ],
  [
    ['bowl', 'bowls'],
    ['bowl', 'poke'],
  ],
  [
    ['pflanzlich', 'plantbased'],
    ['vegan', 'plant'],
  ],
];
const SYNONYMS_BY_WORD = new Map(
  SYNONYMS.flatMap(([words, alternatives]) =>
    words.map((w) => [normalizeForSearch(w), alternatives.map(normalizeForSearch)] as const)
  )
);

/** Ein Wort der Anfrage und was es noch meinen darf. */
interface QueryWord {
  text: string;
  alternatives: string[];
  /** Ein Bezirk oder Kiez des Katalogs. Trifft nur Lage und Namen, nicht den
   *  Text (siehe parseQuery). */
  place?: boolean;
}

/* Die Wörter aller Bezirke und Kieze im Katalog, je Index einmal. */
const PLACE_WORDS = new WeakMap<Map<string, SearchEntry>, Set<string>>();
function placeWordsOf(index: Map<string, SearchEntry>): Set<string> {
  let words = PLACE_WORDS.get(index);
  if (!words) {
    words = new Set([...index.values()].flatMap((e) => e.area.split(/[^a-z0-9]+/).filter(Boolean)));
    PLACE_WORDS.set(index, words);
  }
  return words;
}

/* Ein vertippter Bezirk wird der Bezirk. „Kreutzberg" holte über den
   Tippfehler-Rückfall sonst wieder jede Beschreibung, die „Kreuzberger" sagt.
   Erst ab sechs Buchstaben — „burg" ist nicht „berg" — und nur, wenn das
   Getippte selbst nirgends im Katalog steht. */
const PLACE_FUZZY_MIN_LENGTH = 6;
function correctPlace(word: string, places: Set<string>, index: Map<string, SearchEntry>): string {
  if (word.length < PLACE_FUZZY_MIN_LENGTH || places.has(word)) return word;
  const near = [...places].find((p) => withinOneEdit(word, p));
  if (!near) return word;
  for (const entry of index.values()) if (entry.all.includes(word)) return word;
  return near;
}

/** Die Anfrage als Woerter. Jedes muss irgendwo am Spot stehen — nicht der
 *  ganze Satz in einem Feld: „pizza neukölln" fand sonst nichts.
 *
 *  Mit `index` werden Bezirke und Kieze erkannt. „Kreuzberg" fand 71 Spots
 *  statt der 50 in Kreuzberg: 21 Beschreibungen anderswo erwähnen den Bezirk
 *  („aus der eigenen Kreuzberger Röstung", Katalog 27.10.2026). Ein Ortswort
 *  meint, wo der Spot liegt. */
export function parseQuery(query: string, index?: Map<string, SearchEntry>): QueryWord[] {
  let q = normalizeForSearch(query.trim());
  /* Der volle Name wird gefaltet wie alles andere — „Prenzlauer" steht im
     Index als „prenzlaur". */
  for (const [pattern, name] of KIEZ_NAMES) q = q.replace(pattern, normalizeForSearch(name));
  const places = index ? placeWordsOf(index) : null;
  return q
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map((typed) => {
      const text = index && places ? correctPlace(typed, places, index) : typed;
      const alternatives = SYNONYMS_BY_WORD.get(text) ?? [];
      /* „nkln" ist selbst kein Ortswort, meint aber nur eins. */
      const place = Boolean(
        places &&
        (places.has(text) || (alternatives.length > 0 && alternatives.every((a) => places.has(a))))
      );
      return place ? { text, alternatives, place } : { text, alternatives };
    });
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
  /** Bezirk und Kiez, durch „ | " getrennt. */
  area: string;
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
      r.bezirk?.name,
      r.district,
      /* Die Strasse. Seit 28.09.2026 wieder im Kartenpayload
         (mapRestaurantsQuery) — davor stand sie nur hier, und
         „kastanienallee" fand nichts. */
      /* Ohne das Land: importierte Adressen enden auf „, Deutschland", und
         „deutsch" fand sonst 174 von 249 Spots. */
      r.address?.replace(/,\s*(Deutschland|Germany)\s*$/i, ''),
      r.searchText,
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
      area: [r.bezirk?.name, r.district].filter(Boolean).map(normalizeForSearch).join(' | '),
      all,
      words: [...new Set(all.split(/[^a-z0-9]+/).filter(Boolean))],
    });
  }
  return index;
}

const SUBSTRING_MIN_LENGTH = 4;

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

/* Deutsche Gerichte stehen oft als Kompositum im Text: Tomatensuppe,
   Reisnudeln. Diese Endungen dürfen auch die englischen Suchwörter treffen. */
const FOOD_ENDINGS = new Set(['suppe', 'suppen', 'nudel', 'nudeln']);

/* Ein kurzes Wort steckt sonst überall mitten drin: „eis" in Fleisch, heißt
   und weiße (123 von 249 Spots), „tea" in Team und Steak. Unter vier
   Buchstaben zählt es deshalb im Text nur als ganzes Wort (auch im Plural)
   und am Wortanfang nur im Namen — dort tippt man es an: „piz" findet die
   Pizzeria. Ab vier Buchstaben darf es mitten im Wort stehen: „suppe" in
   „Tomatensuppe". */
function isWholeWord(entry: SearchEntry, token: string): boolean {
  return entry.words.includes(token) || entry.words.includes(`${token}s`);
}

function textMatches(entry: SearchEntry, token: string): boolean {
  if (token.length >= SUBSTRING_MIN_LENGTH) return entry.all.includes(token);
  return startsWord(entry.name, token) || isWholeWord(entry, token);
}

/** Eine Alternative trifft am Wortanfang; kurze nur als ganzes Wort. */
function altMatches(entry: SearchEntry, alt: string): boolean {
  if (alt.length >= SUBSTRING_MIN_LENGTH || alt.includes(' ')) return startsWord(entry.all, alt);
  return isWholeWord(entry, alt);
}

function wordMatches(entry: SearchEntry, word: QueryWord, fuzzy: boolean): boolean {
  if (word.place) {
    /* Die Lage oder der Name — sonst verschwände „Bergmanns" aus den
       Vorschlägen, sobald „berg" getippt ist. */
    return [word.text, ...word.alternatives].some(
      (t) => startsWord(entry.area, t) || startsWord(entry.name, t)
    );
  }
  if (textMatches(entry, word.text)) return true;
  if (
    word.alternatives.some(
      (alt) =>
        altMatches(entry, alt) ||
        (FOOD_ENDINGS.has(alt) && entry.words.some((term) => term.endsWith(alt)))
    )
  )
    return true;
  return fuzzy && nearWordStart(entry.words, word.text);
}

/**
 * Passt der Spot zur Anfrage? Jedes Wort muss treffen. `fuzzy` lässt pro
 * Wort einen Buchstaben daneben zu — nur für den Rückfall, wenn die exakte
 * Suche im ganzen Katalog nichts findet (needsFuzzy). So kommt nach
 * „piza" die Pizza, und „eis" holt trotzdem kein „reis" dazu.
 */
export function matchesSearch(entry: SearchEntry, query: QueryWord[], fuzzy = false): boolean {
  return query.every((word) => wordMatches(entry, word, fuzzy));
}

/**
 * Der Tippfehler-Rückfall: nur, wenn exakt im ganzen Katalog nichts passt.
 * Gezählt ohne die Chips — ein Bezirk, in dem es keine Pizza gibt, ist kein
 * Tippfehler. Eine Regel für Liste (useMapFilters) und Vorschläge
 * (suggestSpots): die Vorschläge zeigen, was das Abschicken in die Liste holt.
 */
export function needsFuzzy(index: Map<string, SearchEntry>, query: QueryWord[]): boolean {
  if (!query.length) return false;
  for (const entry of index.values()) if (matchesSearch(entry, query)) return false;
  return true;
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
      (w) =>
        startsWord(entry.all, w.text) || w.alternatives.some((alt) => startsWord(entry.all, alt))
    )
  ) {
    return 1;
  }
  return 2;
}

/**
 * Die Vorschläge unter dem Suchfeld: dieselben Treffer, die ein Abschicken
 * der Anfrage in die Liste holt (useMapFilters), nach Passung und dann nach
 * Namen geordnet — die Entfernung, nach der die Liste sortiert, kennt ein
 * Vorschlag nicht. Tippen filtert die Liste nicht mehr, erst das Abschicken
 * (Betreiber, 29.09.2026).
 *
 * Alle Treffer, die Vorschläge scrollen. Bis 27.10.2026 standen dort höchstens
 * sechs, und „Kreuzberg" sah aus, als gäbe es nur sechs Spots (Betreiber).
 *
 * Der Tippfehler-Rückfall wie in der Liste (needsFuzzy) — gezählt ohne
 * `keep`, die Chips des Aufrufers.
 */
export function suggestSpots(
  restaurants: MapRestaurant[],
  index: Map<string, SearchEntry>,
  query: string,
  { keep = () => true }: { keep?: (r: MapRestaurant) => boolean } = {}
): MapRestaurant[] {
  const words = parseQuery(query, index);
  if (!words.length) return [];
  const fuzzy = needsFuzzy(index, words);
  const hits: { r: MapRestaurant; rank: number }[] = [];
  for (const r of restaurants) {
    const entry = index.get(r._id);
    if (!entry || !matchesSearch(entry, words, fuzzy) || !keep(r)) continue;
    hits.push({ r, rank: searchRank(entry, words) });
  }
  return hits
    .sort((a, b) => a.rank - b.rank || a.r.name.localeCompare(b.r.name, 'de'))
    .map((h) => h.r);
}
