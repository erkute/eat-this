// nextjs/lib/buddy/retrieval.ts
import { client as sanityClient } from '@/lib/sanity'
import { formatPriceLabel } from '@/app/components/map/restaurantDetail.helpers'
import { getOpenStatus } from '@/lib/map/openingHours'
import { distanceKm, distanceLabel, type LatLng } from './geo'
import type { OpeningHourSlot } from '@/lib/types'
import type { Locale, SpotCandidate, ArticleResult } from './types'

export interface SpotFilters {
  cuisine?: string
  bezirk?: string
  priceRange?: string
  /** A specific spot named by the user (e.g. "Gazzo"). Matched against name. */
  name?: string
  /** User location — when set, results are sorted by distance and labelled. */
  userGeo?: LatLng
  vibeQuery: string
}

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, Math.trunc(Number.isFinite(n) ? n : lo)))

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
  "image": image.asset->url + "?w=120&h=120&fit=crop&auto=format&q=80"
}`

// Server runs in UTC; build a Date whose local accessors (getDay/getHours/…)
// reflect Europe/Berlin so getOpenStatus reads the right wall-clock time.
function berlinNow(base: Date): Date {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin',
    year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: false,
  }).formatToParts(base)
  const get = (t: string) => Number(p.find((x) => x.type === t)?.value)
  return new Date(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'))
}

const OPEN_LABELS: Record<Locale, { open: string; closed: string; opens: string; closes: string }> = {
  de: { open: 'Offen', closed: 'Geschlossen', opens: 'öffnet', closes: 'bis' },
  en: { open: 'Open', closed: 'Closed', opens: 'opens', closes: 'till' },
}

export function buildSpotsQuery(limit: number): string {
  const n = clamp(limit, 1, 40)
  return `*[
    _type == "restaurant"
    && isOpen == true && isClosed != true
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
    featured desc,
    lastReviewed desc
  ) [0...${n}] ${SPOTS_PROJECTION}`
}

const wildcard = (s?: string) => {
  const t = (s ?? '').trim()
  return t.length > 0 ? `*${t}*` : null
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
  const level = (raw ?? '').split('').filter((c) => c === '€').length
  if (level <= 0) return null
  if (level === 1) return { min: 0, maxExcl: 15 }
  if (level === 2) return { min: 15, maxExcl: 35 }
  return { min: 35, maxExcl: null }
}

export function buildSpotsParams(filters: SpotFilters, locale: Locale) {
  const band = priceBand(filters.priceRange)
  return {
    cuisine: wildcard(filters.cuisine),
    bezirk: wildcard(filters.bezirk),
    name: wildcard(filters.name),
    priceMin: band ? band.min : null,
    priceMaxExcl: band ? band.maxExcl : null,
    lat: filters.userGeo?.lat ?? null,
    lng: filters.userGeo?.lng ?? null,
    locale,
  }
}

interface SanityLike {
  fetch: (query: string, params?: Record<string, unknown>) => Promise<unknown>
}
interface RetrievalDeps {
  client?: SanityLike
  /** Override "now" for deterministic tests; defaults to the real clock. */
  now?: Date
}

const SPOTS_LIMIT = 30

// The raw row before priceRange/openingHours/coords are collapsed to display values.
type RawSpotRow = Omit<SpotCandidate, 'priceRange' | 'openNow' | 'openLabel' | 'distanceLabel'> & {
  priceRange?: { min?: number; max?: number; currency?: string } | null
  openingHours?: OpeningHourSlot[] | null
  lat?: number | null
  lng?: number | null
}

export async function searchSpots(
  filters: SpotFilters,
  locale: Locale,
  deps: RetrievalDeps = {},
): Promise<SpotCandidate[]> {
  const client = deps.client ?? (sanityClient as unknown as SanityLike)
  const query = buildSpotsQuery(SPOTS_LIMIT)
  const params = buildSpotsParams(filters, locale)
  const rows = (await client.fetch(query, params)) as RawSpotRow[]
  const now = berlinNow(deps.now ?? new Date())
  const labels = OPEN_LABELS[locale]
  const userGeo = filters.userGeo
  // Drop openingHours/coords + the raw price object from the payload; keep only
  // the derived label/status so the streamed spots stay lean.
  const mapped = (rows ?? []).map(({ openingHours, priceRange: rawPrice, lat, lng, ...rest }) => {
    // priceRange is a {min,max,currency} object in Sanity — format it to the
    // same "10–20 €" label the rest of the app uses (was rendering [object Object]).
    const priceRange = formatPriceLabel({ priceRange: rawPrice ?? undefined })
    // Compute "open now" (Berlin time) so Remy can prioritise open spots and
    // the card can show a status badge. Null when there's no hours data.
    const hours = openingHours ?? []
    const status = hours.length > 0 ? getOpenStatus(hours, now, labels) : null
    // Distance from the user, when they shared their location.
    const km =
      userGeo && typeof lat === 'number' && typeof lng === 'number'
        ? distanceKm(userGeo, { lat, lng })
        : null
    return {
      ...rest,
      priceRange,
      openNow: status ? status.isOpen : null,
      openLabel: status ? status.label : null,
      distanceLabel: km !== null ? distanceLabel(km, locale) : null,
      _km: km,
    }
  })
  // Nearest first when we know where the user is.
  if (userGeo) mapped.sort((a, b) => (a._km ?? Infinity) - (b._km ?? Infinity))
  return mapped.map(({ _km, ...spot }) => {
    void _km
    return spot
  })
}

export interface ArticleQuery {
  query: string
}

const ARTICLES_QUERY = `*[
  _type == "newsArticle"
  && defined(slug.current)
  && (coalesce(titleDe, title) match $q || coalesce(excerptDe, excerpt) match $q || pt::text(content) match $q)
] | order(date desc) [0...5] {
  "title": select($locale == "en" => coalesce(title, titleDe), coalesce(titleDe, title)),
  "slug": slug.current,
  "excerpt": select($locale == "en" => coalesce(excerpt, excerptDe), coalesce(excerptDe, excerpt))
}`

export async function searchArticles(
  input: ArticleQuery,
  locale: Locale,
  deps: RetrievalDeps = {},
): Promise<ArticleResult[]> {
  const client = deps.client ?? (sanityClient as unknown as SanityLike)
  const term = input.query.trim()
  const q = term.length > 0 ? `*${term}*` : '*'
  const rows = (await client.fetch(ARTICLES_QUERY, { q, locale })) as ArticleResult[]
  return rows ?? []
}
