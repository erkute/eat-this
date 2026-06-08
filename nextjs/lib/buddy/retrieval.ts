// nextjs/lib/buddy/retrieval.ts
import { client as sanityClient } from '@/lib/sanity'
import type { Locale, SpotCandidate, ArticleResult } from './types'

export interface SpotFilters {
  cuisine?: string
  bezirk?: string
  priceRange?: string
  vibeQuery: string
}

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, Math.trunc(Number.isFinite(n) ? n : lo)))

const SPOTS_PROJECTION = `{
  name,
  "slug": slug.current,
  cuisineType,
  "bezirk": bezirkRef->name,
  "shortDescription": select($locale == "en" => coalesce(shortDescriptionEn, shortDescription), shortDescription),
  "tip": select($locale == "en" => coalesce(tipEn, tip), tip),
  priceRange,
  mapsUrl
}`

export function buildSpotsQuery(limit: number): string {
  const n = clamp(limit, 1, 40)
  return `*[
    _type == "restaurant"
    && isOpen == true && isClosed != true && tierAnon == true
    && (!defined($cuisine) || cuisineType match $cuisine)
    && (!defined($bezirk) || bezirkRef->name match $bezirk)
    && (!defined($price) || priceRange == $price)
    && defined(slug.current)
  ] | order(featured desc, lastReviewed desc) [0...${n}] ${SPOTS_PROJECTION}`
}

const wildcard = (s?: string) => {
  const t = (s ?? '').trim()
  return t.length > 0 ? `*${t}*` : null
}

export function buildSpotsParams(filters: SpotFilters, locale: Locale) {
  return {
    cuisine: wildcard(filters.cuisine),
    bezirk: wildcard(filters.bezirk),
    price: (filters.priceRange ?? '').trim() || null,
    locale,
  }
}

interface SanityLike {
  fetch: <T>(query: string, params?: Record<string, unknown>) => Promise<T>
}
interface RetrievalDeps {
  client?: SanityLike
}

const SPOTS_LIMIT = 30

export async function searchSpots(
  filters: SpotFilters,
  locale: Locale,
  deps: RetrievalDeps = {},
): Promise<SpotCandidate[]> {
  const client = deps.client ?? (sanityClient as unknown as SanityLike)
  const query = buildSpotsQuery(SPOTS_LIMIT)
  const params = buildSpotsParams(filters, locale)
  const rows = await client.fetch<SpotCandidate[]>(query, params)
  return rows ?? []
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
  const rows = await client.fetch<ArticleResult[]>(ARTICLES_QUERY, { q, locale })
  return rows ?? []
}
