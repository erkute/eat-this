import { client } from './sanity'
import {
  restaurantBySlugQuery,
  allRestaurantSlugsQuery,
  articleBySlugQuery,
  allArticleSlugsQuery,
  allNewsArticlesQuery,
  latestNewsArticlesQuery,
  allStaticPagesQuery,
  allMustEatsAlbumQuery,
  mustEatsByRestaurantQuery,
  allBezirkeWithStatsQuery,
  bezirkBySlugQuery,
  restaurantsByBezirkQuery,
  restaurantsByCategoryQuery,
  allCategoriesQuery,
  categoryBySlugQuery,
  categoryOccurrencesQuery,
  landingPageQuery,
  restaurantCountQuery,
  categoryGridQuery,
  recentlyAddedQuery,
  restaurantTickerQuery,
} from './queries'
import type { Restaurant, NewsArticle, StaticPageDoc, MustEatAlbumCard, BezirkDoc, RestaurantCard, LandingPageDoc, CategoryGridTile, RecentlyAddedCard } from './types'
import type { CategoryDef } from './categories'

export async function getRestaurantBySlug(slug: string): Promise<Restaurant | null> {
  return client.fetch<Restaurant | null>(
    restaurantBySlugQuery,
    { slug },
    { next: { revalidate: 3600, tags: [`restaurant:${slug}`] } }
  )
}

export async function getAllRestaurantSlugs(): Promise<string[]> {
  const results = await client.fetch<{ slug: string }[]>(
    allRestaurantSlugsQuery,
    {},
    { next: { revalidate: 3600 } }
  )
  return results.map(r => r.slug)
}

export async function getArticleBySlug(slug: string): Promise<NewsArticle | null> {
  return client.fetch<NewsArticle | null>(
    articleBySlugQuery,
    { slug },
    { next: { revalidate: 3600, tags: [`article:${slug}`] } }
  )
}

export async function getAllArticleSlugs(): Promise<string[]> {
  const results = await client.fetch<{ slug: string }[]>(
    allArticleSlugsQuery,
    {},
    { next: { revalidate: 3600 } }
  )
  return results.map(a => a.slug)
}

export async function getAllNewsArticles(): Promise<NewsArticle[]> {
  return client.fetch<NewsArticle[]>(
    allNewsArticlesQuery,
    {},
    { next: { revalidate: 3600, tags: ['news'] } }
  )
}

export async function getAllStaticPages(): Promise<StaticPageDoc[]> {
  return client.fetch<StaticPageDoc[]>(
    allStaticPagesQuery,
    {},
    { next: { revalidate: 3600, tags: ['staticPage'] } }
  )
}

export async function getAllMustEats(): Promise<MustEatAlbumCard[]> {
  return client.fetch<MustEatAlbumCard[]>(
    allMustEatsAlbumQuery,
    {},
    { next: { revalidate: 3600, tags: ['mustEat'] } }
  )
}

export interface MustEatPreview {
  _id: string
  dish: string
  photo: string
  order?: number
}

export async function getMustEatsByRestaurant(restaurantId: string): Promise<MustEatPreview[]> {
  return client.fetch<MustEatPreview[]>(
    mustEatsByRestaurantQuery,
    { restaurantId },
    { next: { revalidate: 3600, tags: ['mustEat'] } }
  )
}

export async function getAllBezirkeWithStats(): Promise<BezirkDoc[]> {
  return client.fetch<BezirkDoc[]>(
    allBezirkeWithStatsQuery,
    {},
    { next: { revalidate: 3600, tags: ['bezirk', 'sitemap-bezirke'] } }
  )
}

export async function getBezirkBySlug(slug: string): Promise<BezirkDoc | null> {
  return client.fetch<BezirkDoc | null>(
    bezirkBySlugQuery,
    { slug },
    { next: { revalidate: 3600, tags: [`bezirk:${slug}`] } }
  )
}

export async function getRestaurantsByBezirk(slug: string): Promise<RestaurantCard[]> {
  return client.fetch<RestaurantCard[]>(
    restaurantsByBezirkQuery,
    { bezirkSlug: slug },
    { next: { revalidate: 3600, tags: [`bezirk:${slug}`, 'sitemap-restaurants'] } }
  )
}

export async function getRestaurantsByCategory(categorySlug: string): Promise<RestaurantCard[]> {
  return client.fetch<RestaurantCard[]>(
    restaurantsByCategoryQuery,
    { categorySlug },
    { next: { revalidate: 3600, tags: [`category:${categorySlug}`, 'category-list'] } }
  )
}

export async function getAllCategories(): Promise<CategoryDef[]> {
  return client.fetch<CategoryDef[]>(
    allCategoriesQuery,
    {},
    { next: { revalidate: 3600, tags: ['category', 'category-list'] } }
  )
}

export async function getCategoryBySlug(slug: string): Promise<CategoryDef | null> {
  return client.fetch<CategoryDef | null>(
    categoryBySlugQuery,
    { slug },
    { next: { revalidate: 3600, tags: [`category:${slug}`] } }
  )
}

export async function getCategoryCounts(): Promise<Record<string, number>> {
  const occurrences = await client.fetch<({ slug: string | null } | null)[]>(
    categoryOccurrencesQuery,
    {},
    { next: { revalidate: 3600, tags: ['category-list'] } }
  )
  const counts: Record<string, number> = {}
  for (const occ of occurrences) {
    const slug = occ?.slug
    if (!slug) continue
    counts[slug] = (counts[slug] ?? 0) + 1
  }
  return counts
}

export async function getLatestNewsArticles(limit: number): Promise<NewsArticle[]> {
  return client.fetch<NewsArticle[]>(
    latestNewsArticlesQuery,
    { limit },
    { next: { revalidate: 3600, tags: ['news'] } },
  )
}

// ── Landing Page ───────────────────────────────────────────────────

export async function getLandingPage(): Promise<LandingPageDoc | null> {
  return client.fetch<LandingPageDoc | null>(
    landingPageQuery,
    {},
    { next: { revalidate: 300, tags: ['landingPage'] } }
  )
}

export async function getRestaurantCount(): Promise<number> {
  const n = await client.fetch<number | null>(
    restaurantCountQuery,
    {},
    { next: { revalidate: 3600, tags: ['restaurant'] } }
  )
  return n ?? 0
}

export async function getCategoryGrid(): Promise<CategoryGridTile[]> {
  return client.fetch<CategoryGridTile[]>(
    categoryGridQuery,
    {},
    { next: { revalidate: 3600, tags: ['category'] } }
  )
}

export async function getRecentlyAdded(limit: number): Promise<RecentlyAddedCard[]> {
  // Fetch a wider pool than asked, dedupe by first-2-words prefix so chains
  // like "The Barn Café Rosenthaler / Nordbahnhof" collapse to one tile,
  // then return the requested limit in original (recency) order.
  const pool = await client.fetch<RecentlyAddedCard[]>(
    recentlyAddedQuery,
    { limit: Math.max(limit * 3, 24) },
    { next: { revalidate: 300, tags: ['recentlyAdded'] } }
  )

  const seen = new Set<string>()
  const unique: RecentlyAddedCard[] = []
  for (const card of pool) {
    const key = card.name.trim().toLowerCase().split(/\s+/).slice(0, 2).join(' ')
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(card)
    if (unique.length >= limit) break
  }
  return unique
}

export interface TickerRestaurant {
  _id: string
  name: string
  bezirk: string | null
}

// Fetches a wide pool of recent restaurants, deduplicates by name (so chains
// like "The Barn" don't fill the ticker with their multiple locations) and
// shuffles. The shuffle runs at fetch time and is cached for the lifetime
// of the revalidate window — so order changes every ~10 minutes, but never
// during a single page render.
export async function getRestaurantTicker(limit: number): Promise<TickerRestaurant[]> {
  const pool = await client.fetch<TickerRestaurant[]>(
    restaurantTickerQuery,
    { limit: Math.max(limit * 3, 60) },
    { next: { revalidate: 600, tags: ['restaurantTicker'] } }
  )

  // Dedupe by the first 3 lowercased words of the name. Catches chains like
  // "The Barn Café Rosenthaler Platz" + "The Barn Café Nordbahnhof" so the
  // marquee shows one brand per chain instead of three identical-looking rows.
  const seen = new Set<string>()
  const unique: TickerRestaurant[] = []
  for (const r of pool) {
    const key = r.name.trim().toLowerCase().split(/\s+/).slice(0, 2).join(' ')
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(r)
  }

  // Fisher-Yates shuffle. Math.random is fine here — the only goal is "feels
  // different across visits", not cryptographic randomness.
  for (let i = unique.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[unique[i], unique[j]] = [unique[j], unique[i]]
  }

  return unique.slice(0, limit)
}
