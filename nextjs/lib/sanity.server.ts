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
  restaurantCountQuery,
} from './queries'
import type { Restaurant, NewsArticle, StaticPageDoc, MustEatAlbumCard, BezirkDoc, RestaurantCard } from './types'
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
    // `bezirk` (generic) catches restaurant publishes — the webhook can't
    // resolve the restaurant's bezirk slug, so it fires the generic tag.
    { next: { revalidate: 3600, tags: [`bezirk:${slug}`, 'bezirk'] } }
  )
}

export async function getRestaurantsByBezirk(slug: string): Promise<RestaurantCard[]> {
  return client.fetch<RestaurantCard[]>(
    restaurantsByBezirkQuery,
    { bezirkSlug: slug },
    { next: { revalidate: 3600, tags: [`bezirk:${slug}`, 'bezirk', 'sitemap-restaurants'] } }
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

export async function getRestaurantCount(): Promise<number> {
  const n = await client.fetch<number | null>(
    restaurantCountQuery,
    {},
    { next: { revalidate: 3600, tags: ['restaurant'] } }
  )
  return n ?? 0
}

