import { client } from './sanity'
import {
  restaurantBySlugQuery,
  allRestaurantSlugsQuery,
  articleBySlugQuery,
  allArticleSlugsQuery,
  allNewsArticlesQuery,
  allStaticPagesQuery,
  allMustEatsAlbumQuery,
  allBezirkeWithStatsQuery,
  bezirkBySlugQuery,
  restaurantsByBezirkQuery,
  restaurantsByCategoryQuery,
  allCategoryOccurrencesQuery,
} from './queries'
import type { Restaurant, NewsArticle, StaticPageDoc, MustEatAlbumCard, BezirkDoc, RestaurantCard } from './types'

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

export async function getRestaurantsByCategory(category: string): Promise<RestaurantCard[]> {
  return client.fetch<RestaurantCard[]>(
    restaurantsByCategoryQuery,
    { category },
    { next: { revalidate: 3600, tags: [`category:${category}`, 'category-list'] } }
  )
}

export async function getCategoryCounts(): Promise<Record<string, number>> {
  const occurrences = await client.fetch<string[]>(
    allCategoryOccurrencesQuery,
    {},
    { next: { revalidate: 3600, tags: ['category-list'] } }
  )
  const counts: Record<string, number> = {}
  for (const cat of occurrences) {
    counts[cat] = (counts[cat] ?? 0) + 1
  }
  return counts
}

const latestNewsArticlesQuery = `
  *[_type == "newsArticle" && defined(slug.current)] | order(date desc)[0...$limit] {
    _id,
    title,
    titleDe,
    "slug": slug.current,
    date,
    excerpt,
    excerptDe,
    categoryLabel,
    categoryLabelDe,
    "imageUrl": image.asset->url + "?w=800&auto=format&q=80"
  }
`

export async function getLatestNewsArticles(limit: number): Promise<NewsArticle[]> {
  const articles = await client.fetch<NewsArticle[]>(
    latestNewsArticlesQuery,
    { limit },
    { next: { revalidate: 3600, tags: ['news'] } },
  )
  return articles ?? []
}
