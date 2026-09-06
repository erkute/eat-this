// nextjs/lib/buddy/retrieval.ts
import { client as sanityClient } from '@/lib/sanity';
import { formatPriceLabel } from '@/app/components/map/restaurantDetail.helpers';
import { OPEN_STATUS_LABELS, DAY_LABELS, berlinNow, getOpenStatus } from '@/lib/map/openingHours';
import { distanceKm, distanceLabel, type LatLng } from './geo';
import type { OpeningHourSlot } from '@/lib/types';
import type { Locale, SpotCandidate, ArticleResult } from './types';
import { groqImageUrl } from '@/lib/sanity-image-presets';
import { semanticRank, applySemanticOrder } from './semanticSearch';

export interface SpotFilters {
  cuisine?: string;
  bezirk?: string;
  priceRange?: string;
  /** A specific spot named by the user (e.g. "Gazzo"). Matched against name. */
  name?: string;
  /** User location — when set, results are sorted by distance and labelled. */
  userGeo?: LatLng;
  vibeQuery: string;
}

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, Math.trunc(Number.isFinite(n) ? n : lo)));

const SPOTS_PROJECTION = `{
  _id,
  name,
  "slug": slug.current,
  cuisineType,
  "bezirk": bezirkRef->name,
  "shortDescription": select($locale == "en" => coalesce(shortDescriptionEn, shortDescription), shortDescription),
  "tip": select($locale == "en" => coalesce(tipEn, tip), tip),
  priceRange, // raw {min,max,currency} object — formatted to a label in searchSpots
  mapsUrl,
  openingHours, // [{days, hours}] — open-now status computed in searchSpots
  lat, lng, // used to compute distance when the user shares their location
  "categorySlugs": categories[defined(@->_id)]->slug.current, // pack-teaser vote (server-internal)
  "image": ${groqImageUrl('image', 'buddyThumb')}
}`;

export function buildSpotsQuery(limit: number): string {
  const n = clamp(limit, 1, 40);
  return `*[
    _type == "restaurant"
    && isOpen == true && isClosed != true
    && (!defined($slug) || slug.current == $slug)
    && (!defined($name) || name match $name)
    && (!defined($cuisine) || count(tags[@ match $cuisine]) > 0 || cuisineType match $cuisine || name match $cuisine || shortDescription match $cuisine || shortDescriptionEn match $cuisine || description match $cuisine || descriptionEn match $cuisine || tip match $cuisine || tipEn match $cuisine)
    && (!defined($bezirk) || bezirkRef->name match $bezirk)
    && (!defined($priceMin) || (priceRange.min >= $priceMin && (!defined($priceMaxExcl) || priceRange.min < $priceMaxExcl)))
    && defined(slug.current)
  ] | order(
    // When the user shared their location, nearest first (squared distance with
    // a Berlin longitude weight ~cos(52.5°)²≈0.37; searchSpots re-sorts exactly).
    select(defined($lat) => (lat - $lat) * (lat - $lat) + (lng - $lng) * (lng - $lng) * 0.37, 0) asc,
    select(defined($name) && name match $name => 1, 0) desc,
    select(
      !defined($cuisine) => 0,
      count(tags[@ match $cuisine]) > 0 => 4,
      cuisineType match $cuisine => 3,
      name match $cuisine => 2,
      shortDescription match $cuisine || shortDescriptionEn match $cuisine || description match $cuisine || descriptionEn match $cuisine => 1,
      0
    ) desc,
    // Soft vibe ranking: up to three folded tokens from the user's free-text
    // intent ("gemütlich", "date", …) — counts matching tokens, never filters.
    (
      select(defined($vibe1) && (shortDescription match $vibe1 || shortDescriptionEn match $vibe1 || description match $vibe1 || descriptionEn match $vibe1 || tip match $vibe1 || tipEn match $vibe1) => 1, 0)
      + select(defined($vibe2) && (shortDescription match $vibe2 || shortDescriptionEn match $vibe2 || description match $vibe2 || descriptionEn match $vibe2 || tip match $vibe2 || tipEn match $vibe2) => 1, 0)
      + select(defined($vibe3) && (shortDescription match $vibe3 || shortDescriptionEn match $vibe3 || description match $vibe3 || descriptionEn match $vibe3 || tip match $vibe3 || tipEn match $vibe3) => 1, 0)
    ) desc,
    featured desc,
    lastReviewed desc
  ) [0...${n}] ${SPOTS_PROJECTION}`;
}

const wildcard = (s?: string) => {
  const t = (s ?? '').trim();
  return t.length > 0 ? `*${t}*` : null;
};

// Diacritic-folded, lowercased, alphanumeric-only — "Kuréme" and "kureme",
// "amatō" and "amato", "Boii Boii" and "boiboi" land on comparable strings.
export function foldName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function levenshtein(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 3) return 99;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

interface NameIndexRow {
  name: string;
  slug: string;
  folded: string;
}

// GROQ `match` is case-insensitive but diacritic-blind: a user typing "amato"
// never finds "amatō", "kureme" never finds "Kuréme" — exactly the spellings
// real searchers use (see GSC). 340 names fit comfortably in memory, so we
// resolve the model's `name` input against a folded index instead.
const NAME_INDEX_TTL = 10 * 60_000;
let nameIndexCache: { at: number; rows: NameIndexRow[] } | null = null;

async function getNameIndex(client: SanityLike, now: number): Promise<NameIndexRow[]> {
  if (nameIndexCache && now - nameIndexCache.at < NAME_INDEX_TTL) return nameIndexCache.rows;
  const rows = (await client.fetch(
    `*[_type == "restaurant" && isOpen == true && isClosed != true && defined(slug.current)]{ name, "slug": slug.current }`
  )) as { name: string; slug: string }[];
  const indexed = (rows ?? []).map((r) => ({ ...r, folded: foldName(r.name) }));
  nameIndexCache = { at: now, rows: indexed };
  return indexed;
}

/** Exposed for tests — clears the module-level name-index cache. */
export function __resetNameIndexCache(): void {
  nameIndexCache = null;
}

// Resolve a user-/model-provided spot name to a slug: exact folded match,
// then substring containment (either direction), then fuzzy (edit distance
// scaled to length). Returns null when nothing is convincing — the caller
// falls back to the raw GROQ `match`.
export function resolveNameToSlug(query: string, index: NameIndexRow[]): string | null {
  const q = foldName(query);
  if (q.length < 3) return null;
  const exact = index.find((r) => r.folded === q);
  if (exact) return exact.slug;
  const contains = index.filter((r) => r.folded.includes(q) || q.includes(r.folded));
  if (contains.length === 1) return contains[0].slug;
  if (contains.length > 1) return null; // ambiguous — let GROQ rank the candidates
  const maxDist = q.length <= 5 ? 1 : 2;
  let best: { slug: string; dist: number } | null = null;
  let bestIsUnique = true;
  for (const r of index) {
    const dist = levenshtein(q, r.folded);
    if (dist > maxDist) continue;
    if (!best || dist < best.dist) {
      best = { slug: r.slug, dist };
      bestIsUnique = true;
    } else if (dist === best.dist && r.slug !== best.slug) {
      bestIsUnique = false;
    }
  }
  return best && bestIsUnique ? best.slug : null;
}

// Up to three folded, wildcarded tokens from the free-text vibe — used as a
// soft ranking signal in the GROQ order(), never as a filter.
const VIBE_STOPWORDS = new Set([
  'der',
  'die',
  'das',
  'und',
  'oder',
  'ein',
  'eine',
  'einen',
  'einem',
  'für',
  'fuer',
  'mit',
  'ohne',
  'nach',
  'beim',
  'zum',
  'zur',
  'ich',
  'wir',
  'ihr',
  'mir',
  'uns',
  'was',
  'etwas',
  'bisschen',
  'gerne',
  'gern',
  'mal',
  'heute',
  'abend',
  'morgen',
  'essen',
  'gehen',
  'suche',
  'will',
  'möchte',
  'the',
  'and',
  'for',
  'with',
  'some',
  'something',
  'nice',
  'good',
  'place',
  'food',
  'want',
  'looking',
]);

export function vibeTokens(vibe: string): (string | null)[] {
  // NICHT diakritika-falten: GROQ matcht gegen den ungefalteten Feldtext —
  // "gemutlich" würde "gemütlich" nie treffen. match ist case-insensitiv,
  // lowercase dient hier nur der Stopword-/Dedupe-Normalisierung.
  const tokens = vibe
    .split(/[^\p{L}\p{N}]+/u)
    .map((t) => t.toLowerCase())
    .filter((t) => t.length >= 4 && !VIBE_STOPWORDS.has(t));
  const unique = [...new Set(tokens)].slice(0, 3);
  return [
    unique[0] ? `*${unique[0]}*` : null,
    unique[1] ? `*${unique[1]}*` : null,
    unique[2] ? `*${unique[2]}*` : null,
  ];
}

// Map the user-facing "€"/"€€"/"€€€" level to a band on priceRange.min (the
// entry price per person in €). Sanity stores priceRange as a {min,max} object,
// so the old `priceRange == "€€"` comparison never matched — any price filter
// silently returned zero spots. Bands are derived from the live data, where min
// clusters at 1/10/20/30/40+: € = cheap eats, €€ = mid, €€€ = upscale. Counting
// € signs (rather than exact-matching the string) tolerates stray whitespace and
// €€€€; an unparseable value yields null so the filter is dropped (fail open)
// rather than returning nothing.
export function priceBand(raw?: string): { min: number; maxExcl: number | null } | null {
  const level = (raw ?? '').split('').filter((c) => c === '€').length;
  if (level <= 0) return null;
  if (level === 1) return { min: 0, maxExcl: 15 };
  if (level === 2) return { min: 15, maxExcl: 35 };
  return { min: 35, maxExcl: null };
}

export function buildSpotsParams(
  filters: SpotFilters,
  locale: Locale,
  resolvedSlug: string | null = null
) {
  const band = priceBand(filters.priceRange);
  const [vibe1, vibe2, vibe3] = vibeTokens(filters.vibeQuery ?? '');
  return {
    // When the name resolved against the folded index, query by exact slug and
    // drop the raw `name match` — otherwise diacritics would empty the result.
    slug: resolvedSlug,
    name: resolvedSlug ? null : wildcard(filters.name),
    cuisine: wildcard(filters.cuisine),
    bezirk: wildcard(filters.bezirk),
    priceMin: band ? band.min : null,
    priceMaxExcl: band ? band.maxExcl : null,
    lat: filters.userGeo?.lat ?? null,
    lng: filters.userGeo?.lng ?? null,
    vibe1,
    vibe2,
    vibe3,
    locale,
  };
}

interface SanityLike {
  fetch: (query: string, params?: Record<string, unknown>) => Promise<unknown>;
}
interface RetrievalDeps {
  client?: SanityLike;
  /** Override "now" for deterministic tests; defaults to the real clock. */
  now?: Date;
}

const SPOTS_LIMIT = 30;
/**
 * Drei statt frueher fuenf. Die Treffer sind nach Punkten sortiert, der
 * Schwanz ist also der schwaechste Teil — bei „Was macht Berliner Kaffee
 * besonders" stand auf Platz fuenf ein Schoeneberg-Guide (0,48: ueber der
 * Schwelle, aber kein Kaffee-Text). Unter einer Chat-Antwort sind drei Karten
 * ohnehin genug. Die Schwelle bleibt, wo sie gemessen wurde: sie liegt
 * mittig in der Luecke zwischen passend und fremd, ein hoeherer Wert haette
 * die schwaecheren echten Treffer mitgenommen.
 */
const ARTICLES_LIMIT = 3;
export const MIN_SEMANTIC_CANDIDATES = 8;

// The raw row before priceRange/openingHours/coords are collapsed to display values.
type RawSpotRow = Omit<SpotCandidate, 'priceRange' | 'openNow' | 'openLabel' | 'distanceLabel'> & {
  priceRange?: { min?: number; max?: number; currency?: string } | null;
  openingHours?: OpeningHourSlot[] | null;
  lat?: number | null;
  lng?: number | null;
};

export function shouldUseSemanticRank(args: {
  candidateCount: number;
  hasUserGeo: boolean;
  hasResolvedSlug: boolean;
  semanticQuery: string;
}): boolean {
  return (
    args.candidateCount >= MIN_SEMANTIC_CANDIDATES &&
    !args.hasUserGeo &&
    !args.hasResolvedSlug &&
    args.semanticQuery.trim().length >= 3
  );
}

export async function searchSpots(
  filters: SpotFilters,
  locale: Locale,
  deps: RetrievalDeps = {}
): Promise<SpotCandidate[]> {
  const client = deps.client ?? (sanityClient as unknown as SanityLike);
  const query = buildSpotsQuery(SPOTS_LIMIT);
  // A named spot resolves against the folded index first ("amato" → amatō,
  // "boi boi" → Boii Boii); only unresolved names fall back to raw `match`.
  let resolvedSlug: string | null = null;
  if (filters.name && filters.name.trim().length > 0) {
    try {
      const index = await getNameIndex(client, (deps.now ?? new Date()).getTime());
      resolvedSlug = resolveNameToSlug(filters.name, index);
    } catch {
      // Index fetch failed — raw match still works, just diacritic-blind.
    }
  }
  const params = buildSpotsParams(filters, locale, resolvedSlug);
  const rows = (await client.fetch(query, params)) as RawSpotRow[];
  const now = berlinNow(deps.now ?? new Date());
  const labels = { ...OPEN_STATUS_LABELS[locale], days: DAY_LABELS[locale] };
  const userGeo = filters.userGeo;
  // Drop openingHours/coords + the raw price object from the payload; keep only
  // the derived label/status so the streamed spots stay lean.
  const mapped = (rows ?? []).map(({ openingHours, priceRange: rawPrice, lat, lng, ...rest }) => {
    // priceRange is a {min,max,currency} object in Sanity — format it to the
    // same "10–20 €" label the rest of the app uses (was rendering [object Object]).
    const priceRange = formatPriceLabel({ priceRange: rawPrice ?? undefined }, locale);
    // Compute "open now" (Berlin time) so Remy can prioritise open spots and
    // the card can show a status badge. Null when there's no hours data.
    const hours = openingHours ?? [];
    const status = hours.length > 0 ? getOpenStatus(hours, now, labels) : null;
    // Distance from the user, when they shared their location.
    const km =
      userGeo && typeof lat === 'number' && typeof lng === 'number'
        ? distanceKm(userGeo, { lat, lng })
        : null;
    return {
      ...rest,
      priceRange,
      openNow: status ? status.isOpen : null,
      openLabel: status ? status.label : null,
      distanceLabel: km !== null ? distanceLabel(km, locale) : null,
      _km: km,
    };
  });
  // Nearest first when we know where the user is.
  if (userGeo) mapped.sort((a, b) => (a._km ?? Infinity) - (b._km ?? Infinity));

  // Semantic re-ranking: reorder the GROQ candidates by how well they match the
  // free-text intent (vibe + cuisine). Only when location isn't driving the
  // order and the user didn't name a specific spot — and it degrades to a no-op
  // if the embeddings index or Voyage key is absent (see semanticRank). The
  // GROQ filter stays the hard gate; this only changes order.
  let ordered = mapped;
  const semanticQuery = [filters.cuisine, filters.vibeQuery]
    .filter((s) => s && s.trim())
    .join(', ');
  if (
    shouldUseSemanticRank({
      candidateCount: mapped.length,
      hasUserGeo: Boolean(userGeo),
      hasResolvedSlug: Boolean(resolvedSlug),
      semanticQuery,
    })
  ) {
    const semantic = await semanticRank(semanticQuery);
    ordered = applySemanticOrder(mapped, semantic);
  }

  return ordered.map(({ _km, ...spot }) => {
    void _km;
    return spot;
  });
}

export interface ArticleQuery {
  query: string;
}

const ARTICLE_PROJECTION = `{
  "title": select($locale == "en" => coalesce(title, titleDe), coalesce(titleDe, title)),
  "slug": slug.current,
  "excerpt": select($locale == "en" => coalesce(excerpt, excerptDe), coalesce(excerptDe, excerpt))
}`;

/**
 * Rueckfallweg, wenn die semantische Suche nicht verfuegbar ist — kein Key,
 * kein Index, oder Voyage bremst (der Free-Tier laesst 3 Anfragen pro Minute).
 *
 * Er sucht bewusst nach EINZELNEN Wortstaemmen, nicht nach der ganzen Frage.
 * Ein `match "*Was macht Berliner Kaffee besonders*"` trifft nie — genau daran
 * war das Werkzeug vorher tot. Mit bis zu drei Tokens aus der Frage bleibt
 * wenigstens ein grober Treffer moeglich, wenn das Ranking gerade ausfaellt.
 */
const ARTICLES_KEYWORD_QUERY = `*[
  _type == "newsArticle"
  && defined(slug.current)
  && count([$t1, $t2, $t3][@ != null && (
       coalesce(titleDe, title) match @ ||
       coalesce(excerptDe, excerpt) match @ ||
       pt::text(coalesce(contentDe, content)) match @
     )]) > 0
] | order(date desc) [0...${ARTICLES_LIMIT}] ${ARTICLE_PROJECTION}`;

const ARTICLES_BY_SLUG_QUERY = `*[
  _type == "newsArticle" && slug.current in $slugs
] ${ARTICLE_PROJECTION}`;

/**
 * Ab hier zaehlt ein Artikel als Treffer. An echten Anfragen kalibriert
 * (06.09.2026): thematisch passende Fragen landeten bei 0,52–0,67, fremde
 * ("Wie repariere ich mein Fahrrad", "Wetter morgen in Hamburg") bei hoechstens
 * 0,28. Ohne Schwelle liefe jede Frage in fuenf Karten, auch die, zu der wir
 * nichts geschrieben haben — und Remy verweist dann im Text auf einen Guide,
 * der nicht zur Frage passt.
 */
export const ARTICLE_MIN_SCORE = 0.45;

export async function searchArticles(
  input: ArticleQuery,
  locale: Locale,
  deps: RetrievalDeps = {}
): Promise<ArticleResult[]> {
  const client = deps.client ?? (sanityClient as unknown as SanityLike);
  const term = input.query.trim();

  // Der semantische Weg ist hier der Hauptweg, nicht die Kuer: das Werkzeug
  // bekommt vom Modell eine Formulierung, kein Stichwort.
  const ranked = await semanticRank(term, 'articles');
  if (ranked) {
    const slugs = ranked
      .filter((r) => r.score >= ARTICLE_MIN_SCORE)
      .slice(0, ARTICLES_LIMIT)
      .map((r) => r.slug);
    // Nichts ueber der Schwelle ist eine vollstaendige Antwort: zu dieser Frage
    // haben wir nichts geschrieben. Lieber keine Karte als eine unpassende.
    if (slugs.length === 0) return [];
    const rows = (await client.fetch(ARTICLES_BY_SLUG_QUERY, { slugs, locale })) as ArticleResult[];
    // GROQ gibt Dokumentreihenfolge zurueck — die Rangfolge wieder herstellen.
    const order = new Map(slugs.map((slug, i) => [slug, i]));
    return (rows ?? []).sort(
      (a, b) => (order.get(a.slug) ?? Infinity) - (order.get(b.slug) ?? Infinity)
    );
  }

  const [t1, t2, t3] = vibeTokens(term);
  if (!t1) return [];
  const rows = (await client.fetch(ARTICLES_KEYWORD_QUERY, {
    t1,
    t2,
    t3,
    locale,
  })) as ArticleResult[];
  return rows ?? [];
}
