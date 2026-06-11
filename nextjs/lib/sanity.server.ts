import { client } from './sanity'
import {
  restaurantBySlugQuery,
  allRestaurantSlugsQuery,
  articleBySlugQuery,
  allArticleSlugsQuery,
  allNewsArticlesQuery,
  latestNewsArticlesQuery,
  allStaticPagesQuery,
  mustEatsByRestaurantQuery,
  allBezirkeWithStatsQuery,
  bezirkBySlugQuery,
  restaurantsByBezirkQuery,
  restaurantsByCategoryQuery,
  allCategoriesQuery,
  categoryBySlugQuery,
  emailSpotsQuery,
  emailSpotCardQuery,
} from './queries'
import type { Restaurant, NewsArticle, StaticPageDoc, BezirkDoc, RestaurantCard } from './types'
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

// Lightweight name+slug+bezirk list, used by the legacy-slug resolver to map
// post-rebuild 404 URLs to their current slug. See lib/seo/legacyRedirects.ts.
export async function getAllRestaurantsLite(): Promise<{ name: string; slug: string; bezirk: string | null }[]> {
  return client.fetch(
    `*[_type == "restaurant" && defined(slug.current) && !(_id in path("drafts.**"))]{ name, "slug": slug.current, "bezirk": bezirkRef->slug.current }`,
    {},
    { next: { revalidate: 3600, tags: ['restaurants-lite'] } }
  )
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

// Card-back teaser data only — never add content fields (dish/photo/price)
// here; they would leak through the public restaurant page's RSC payload.
export interface MustEatPreview {
  _id: string
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

export async function getLatestNewsArticles(limit: number): Promise<NewsArticle[]> {
  return client.fetch<NewsArticle[]>(
    latestNewsArticlesQuery,
    { limit },
    { next: { revalidate: 3600, tags: ['news'] } },
  )
}

export type EmailSpot = {
  name: string
  slug: string
  area: string
  cuisine?: string
  photo: string
  mustEats: { dish: string; cardPhoto: string }[]
}

// Curated spots for the magic-link email — restaurant photo + one Must-Eat card.
export async function getEmailSpots(limit: number): Promise<EmailSpot[]> {
  return client.fetch<EmailSpot[]>(
    emailSpotsQuery,
    { limit },
    { next: { revalidate: 3600, tags: ['restaurant'] } }
  )
}

// One spot for the composed email card image (/api/email/spot-card).
export async function getEmailSpotCard(
  slug: string
): Promise<Omit<EmailSpot, 'slug'> | null> {
  return client.fetch<Omit<EmailSpot, 'slug'> | null>(
    emailSpotCardQuery,
    { slug },
    { next: { revalidate: 3600, tags: ['restaurant'] } }
  )
}


