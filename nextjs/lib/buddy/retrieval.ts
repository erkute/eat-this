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
    && isOpen == true && isClosed != true
    && (!defined($cuisine) || count(tags[@ match $cuisine]) > 0 || cuisineType match $cuisine || name match $cuisine || shortDescription match $cuisine || shortDescriptionEn match $cuisine || description match $cuisine || descriptionEn match $cuisine || tip match $cuisine || tipEn match $cuisine)
    && (!defined($bezirk) || bezirkRef->name match $bezirk)
    && (!defined($price) || priceRange == $price)
    && defined(slug.current)
  ] | order(
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

export function buildSpotsParams(filters: SpotFilters, locale: Locale) {
  return {
    cuisine: wildcard(filters.cuisine),
    bezirk: wildcard(filters.bezirk),
    price: (filters.priceRange ?? '').trim() || null,
    locale,
  }
}

interface SanityLike {
  fetch: (query: string, params?: Record<string, unknown>) => Promise<unknown>
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
  const rows = (await client.fetch(query, params)) as SpotCandidate[]
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
  const rows = (await client.fetch(ARTICLES_QUERY, { q, locale })) as ArticleResult[]
  return rows ?? []
}
