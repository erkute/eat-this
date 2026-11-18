import type { MapRestaurant, MapMustEat } from '@/lib/types';
import { CUISINE_LABELS_DE } from '@/lib/cuisineLabels';

/**
 * Die Suche auf der Karte: was ein Spot hergibt, wie eine Anfrage gelesen
 * wird und ob beides zusammenpasst. Gefiltert und sortiert wird in
 * useMapFilters; hier steht nur die Sprache der Suche.
 */

/*
 * Kleinschreibung allein reicht nicht: `includes` vergleicht Zeichen für
 * Zeichen, und `a` ist nicht `á` (Bánh Mì, Döner, Neukölln). NFD trennt die
 * Akzente ab, auf beiden Seiten der Suche.
 */
export function normalizeForSearch(value: string | null | undefined): string {
  return (
    (value ?? '')
      .toLowerCase()
      /* NFD zerlegt ß nicht; alle Adressen schreiben „straße", getippt wird
       „strasse". */
      .replace(/ß/g, 'ss')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      /* Apostrophe fallen in allen Schreibweisen des Bestands weg; das richtige
         Zeichen tippt niemand („KuchenRausch's", „P'berg"). */
      .replace(/['’ʼ´`]/g, '')
      /* Ausgeschriebene Umlaute („doener") falten wie die abgestreiften: „oe"
         wird „o", auf beiden Seiten. */
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
   getippten Formen, dann was stattdessen auch trifft, am Wortanfang, damit
   „eis" als Alternative nicht in „Reisbar" landet.

   Jede Zeile ist am echten Katalog gemessen und zeigt nur auf Wörter, die dort
   vorkommen. Eine Alternative, die mehr Falsches als Richtiges holt, gehört
   nicht hinein: sushi → Japanisch liefert Ramen, cocktail → Bar die Bäckerei
   „barlevain", maki trifft „making", döner → Türkisch einen Laden ohne Döner,
   nudeln → Italienisch und pasta → Italienisch jede Pizzeria, nudeln →
   spaghetti das „Spaghetti-Eis" einer Eisdiele. Den Rest kennt der Suchindex
   (search-terms.json). */
const SYNONYMS: [string[], string[]][] = [
  [['brunch'], ['fruhstuck', 'breakfast']],
  [
    ['kebab', 'kebap', 'doner', 'doener'],
    ['kebab', 'kebap', 'doner'],
  ],
  [['nkln'], ['neukolln']],
  [['gelato'], ['eisdiele', 'ice cream']],
  [
    ['wein', 'naturwein'],
    ['wine', 'wein'],
  ],
  [
    ['vegetarisch', 'veggie'],
    ['vegan', 'vegetarisch'],
  ],
  [['brot'], ['bakery', 'backerei']],
  /* Was man isst, nicht wie die Küche heißt: „Nudeln" steht an keinem Spot.
     Jede Zeile zeigt nur auf Küchen und Kategorien, die es im Bestand gibt
     (cuisineLabels.ts). */
  [
    ['nudeln', 'nudel', 'noodle', 'noodles'],
    [
      'nudel',
      'nudeln',
      'pasta',
      'noodle',
      'ramen',
      'udon',
      'soba',
      'tagliatelle',
      'linguine',
      'fettuccine',
      'penne',
      'rigatoni',
      'vermicelli',
      'ravioli',
      'tortellini',
      'pappardelle',
      'orecchiette',
      'paccheri',
      'bucatini',
      'lasagne',
      'lasagna',
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
  /* Nicht „grill": das trifft jedes „Grilled Cheese". */
  [['fleisch'], ['steak', 'steakhouse']],
  [['eiscafe'], ['ice cream', 'eisdiele', 'gelato']],
  [['mittag', 'mittagessen'], ['lunch']],
  [['abendessen', 'abends'], ['dinner']],
  /* Dasselbe Essen auf Deutsch und Englisch, in beide Richtungen: Die Texte
     stehen in beiden Sprachen, aber nicht jeder Spot nennt beide Wörter
     („Hähnchen" und „chicken" finden verschieden viele). */
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
  /* Ein Kaffeegetränk meint das Café, nicht nur Spots, die das Wort schreiben. */
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
/* Küchen und Kategorien, wie sie am Spot als Etikett stehen. Zeigt ein Synonym
   auf eines davon, meint es das Etikett, nicht jede Erwähnung im Text: „Turkish
   Eggs" bei Father Carpenter und „italienisches Eis" bei Hokey Pokey sind weder
   Döner noch Nudeln. */
const LABELS = new Set(
  [
    ...Object.entries(CUISINE_LABELS_DE).flat(),
    'fruhstuck',
    'breakfast',
    'lunch',
    'dinner',
    'drinks',
    'kaffee',
    'coffee',
    'sweets',
    'susses',
  ].map(normalizeForSearch)
);

const SYNONYMS_BY_WORD = new Map(
  SYNONYMS.flatMap(([words, alternatives]) =>
    words.map((w) => [normalizeForSearch(w), alternatives.map(normalizeForSearch)] as const)
  )
);

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

/**
 * Die Anfrage als Wörter. Jedes muss irgendwo am Spot stehen, nicht der ganze
 * Satz in einem Feld: „pizza neukölln" fände sonst nichts.
 *
 * Mit `index` werden Bezirke und Kieze erkannt. Ein Ortswort meint, wo der Spot
 * liegt: Ohne das fände „Kreuzberg" auch Spots anderswo, deren Beschreibung den
 * Bezirk erwähnt („aus der eigenen Kreuzberger Röstung").
 */
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

function startsWord(hay: string, token: string): boolean {
  for (let i = hay.indexOf(token); i !== -1; i = hay.indexOf(token, i + 1)) {
    if (i === 0 || !/[a-z0-9]/.test(hay[i - 1])) return true;
  }
  return false;
}

function isWord(hay: string, token: string): boolean {
  for (let i = hay.indexOf(token); i !== -1; i = hay.indexOf(token, i + 1)) {
    const end = i + token.length;
    if (
      (i === 0 || !/[a-z0-9]/.test(hay[i - 1])) &&
      (end === hay.length || !/[a-z0-9]/.test(hay[end]))
    ) {
      return true;
    }
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
  /** Was als Etikett am Spot steht: Name, Küche, Kategorien, Gerichte. */
  labels: string;
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
      /* Die Straße. Sie steht im Kartenpayload (mapRestaurantsQuery); ohne sie
         fände „kastanienallee" nichts. */
      /* Ohne das Land: importierte Adressen enden auf „, Deutschland", und
         „deutsch" träfe sonst fast jeden Spot. */
      r.address?.replace(/,\s*(Deutschland|Germany)\s*$/i, ''),
      r.searchText,
      r.cuisineType,
      /* Die Küche steht in Sanity englisch, die deutschen Seiten zeigen das
         Label („Vietnamesisch"), und das wird getippt. Beide Formen zählen. */
      r.cuisineType ? CUISINE_LABELS_DE[r.cuisineType] : null,
      ...(dishes.get(r._id) ?? []),
      ...(r.categories ?? []).flatMap((c) => [c.name, c.nameEn, c.slug]),
    ];
    const all = fields.filter(Boolean).map(normalizeForSearch).join(' | ');
    const labels = [
      r.name,
      r.cuisineType,
      r.cuisineType ? CUISINE_LABELS_DE[r.cuisineType] : null,
      ...(dishes.get(r._id) ?? []),
      ...(r.categories ?? []).flatMap((c) => [c.name, c.nameEn, c.slug]),
    ];
    index.set(r._id, {
      name: normalizeForSearch(r.name),
      labels: labels.filter(Boolean).map(normalizeForSearch).join(' | '),
      area: [r.bezirk?.name, r.district].filter(Boolean).map(normalizeForSearch).join(' | '),
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

/* Ein Wort trifft am Wortanfang, nie mitten im Wort: „döner" fand sonst
   „Londoner", „wein" das „Schwein", „eis" das „Speiselokal". Unter vier
   Buchstaben zählt es im Text nur als ganzes Wort (auch im Plural): „eis"
   steckte am Wortanfang in jedem Eiskaffee, „pho" in „photo". Am Etikett —
   Name, Küche, Gerichte — reicht auch dann der Wortanfang: „piz" findet beim
   Tippen schon die Pizzeria. */
const SHORT_WORD = 3;
function inText(entry: SearchEntry, token: string): boolean {
  if (token.length > SHORT_WORD || token.includes(' ')) return startsWord(entry.all, token);
  return (
    startsWord(entry.labels, token) ||
    entry.words.includes(token) ||
    entry.words.includes(`${token}s`)
  );
}

function wordMatches(entry: SearchEntry, word: QueryWord, fuzzy: boolean): boolean {
  if (word.place) {
    /* Die Lage oder der Name — sonst verschwände „Bergmanns" aus den
       Vorschlägen, sobald „berg" getippt ist. */
    return [word.text, ...word.alternatives].some(
      (t) => startsWord(entry.area, t) || startsWord(entry.name, t)
    );
  }
  if (inText(entry, word.text)) return true;
  if (
    word.alternatives.some((alt) =>
      /* Eine Küche oder Kategorie meint das Etikett, nicht jede Erwähnung im
         Text: „Turkish Eggs" sind kein Döner. */
      LABELS.has(alt)
        ? startsWord(entry.labels, alt)
        : inText(entry, alt) ||
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
  const every = (test: (token: string) => boolean) =>
    query.every((w) => test(w.text) || w.alternatives.some(test));
  /* Das ganze Wort im Namen: „bar" stellt die Wax On Bar vor „The Barn". */
  if (query.every((w) => isWord(entry.name, w.text))) return 0;
  /* Als Etikett — Küche, Kategorie, Gericht: bei „eis" die Eisdielen vor
     den Restaurants, die auch Eis haben. */
  if (every((t) => isWord(entry.labels, t))) return 1;
  if (every((t) => startsWord(entry.labels, t))) return 2;
  if (every((t) => startsWord(entry.all, t))) return 3;
  return 4;
}

/**
 * Die Vorschläge unter dem Suchfeld: dieselben Treffer, die ein Abschicken der
 * Anfrage in die Liste holt (useMapFilters), nach Passung und dann nach Namen
 * geordnet; die Entfernung, nach der die Liste sortiert, kennt ein Vorschlag
 * nicht. Tippen filtert die Liste nicht, erst das Abschicken.
 *
 * Alle Treffer, die Vorschläge scrollen. Mit einem Deckel sähe „Kreuzberg" aus,
 * als gäbe es nur eine Handvoll Spots.
 *
 * Der Tippfehler-Rückfall wie in der Liste (needsFuzzy), gezählt ohne `keep`,
 * die Chips des Aufrufers.
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
