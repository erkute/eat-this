import { client } from './sanity'
import {
  restaurantBySlugQuery,
  allRestaurantSlugsQuery,
  articleBySlugQuery,
  allArticleSlugsQuery,
  allNewsArticlesQuery,
  allStaticPagesQuery,
  allMustEatsAlbumQuery,
} from './queries'
import type { Restaurant, NewsArticle, StaticPageDoc, MustEatAlbumCard } from './types'

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
