import { client } from './sanity';
import { SANITY_REVALIDATE_SECONDS } from './constants';
import {
  restaurantBySlugQuery,
  allRestaurantSlugsQuery,
  articleBySlugQuery,
  allArticleSlugsQuery,
  allNewsArticlesQuery,
  latestNewsArticlesQuery,
  staticPageBySlugQuery,
  mustEatsByRestaurantQuery,
  allBezirkeWithStatsQuery,
  bezirkBySlugQuery,
  restaurantsByBezirkQuery,
  restaurantsByCategoryQuery,
  restaurantSiblingCandidatesQuery,
  allCategoriesQuery,
  allCategoriesWithStatsQuery,
  categoryBySlugQuery,
  emailSpotsQuery,
  packContentsQuery,
} from './queries';
import type { Restaurant, NewsArticle, StaticPageDoc, BezirkDoc, RestaurantCard } from './types';
import type { CategoryDef, CategoryWithStats } from './categories';
import type { PackContents, PackContentsIndex } from './pack/packDetail';

export async function getRestaurantBySlug(slug: string): Promise<Restaurant | null> {
  return client.fetch<Restaurant | null>(
    restaurantBySlugQuery,
    { slug },
    { next: { revalidate: SANITY_REVALIDATE_SECONDS, tags: [`restaurant:${slug}`] } }
  );
}

export async function getAllRestaurantSlugs(): Promise<string[]> {
  const results = await client.fetch<{ slug: string }[]>(
    allRestaurantSlugsQuery,
    {},
    { next: { revalidate: SANITY_REVALIDATE_SECONDS } }
  );
  return results.map((r) => r.slug);
}

// Lightweight name+slug+bezirk list, used by the legacy-slug resolver to map
// post-rebuild 404 URLs to their current slug. See lib/seo/legacyRedirects.ts.
export async function getAllRestaurantsLite(): Promise<
  { name: string; slug: string; bezirk: string | null }[]
> {
  return client.fetch(
    `*[_type == "restaurant" && defined(slug.current) && !(_id in path("drafts.**"))]{ name, "slug": slug.current, "bezirk": bezirkRef->slug.current }`,
    {},
    { next: { revalidate: SANITY_REVALIDATE_SECONDS, tags: ['restaurants-lite'] } }
  );
}

export async function getArticleBySlug(slug: string): Promise<NewsArticle | null> {
  return client.fetch<NewsArticle | null>(
    articleBySlugQuery,
    { slug },
    { next: { revalidate: SANITY_REVALIDATE_SECONDS, tags: [`article:${slug}`] } }
  );
}

export async function getAllArticleSlugs(): Promise<string[]> {
  const results = await client.fetch<{ slug: string }[]>(
    allArticleSlugsQuery,
    {},
    { next: { revalidate: SANITY_REVALIDATE_SECONDS } }
  );
  return results.map((a) => a.slug);
}

export async function getAllNewsArticles(): Promise<NewsArticle[]> {
  return client.fetch<NewsArticle[]>(
    allNewsArticlesQuery,
    {},
    { next: { revalidate: SANITY_REVALIDATE_SECONDS, tags: ['news'] } }
  );
}

export async function getStaticPage(
  slug: string,
  locale: 'de' | 'en'
): Promise<StaticPageDoc | null> {
  return client.fetch<StaticPageDoc | null>(
    staticPageBySlugQuery,
    { slug, locale },
    { next: { revalidate: SANITY_REVALIDATE_SECONDS, tags: [`staticPage:${slug}`, 'staticPage'] } }
  );
}

// Card-back teaser data only — never add content fields (dish/photo/price)
// here; they would leak through the public restaurant page's RSC payload.
export interface MustEatPreview {
  _id: string;
  order?: number;
}

export async function getMustEatsByRestaurant(restaurantId: string): Promise<MustEatPreview[]> {
  return client.fetch<MustEatPreview[]>(
    mustEatsByRestaurantQuery,
    { restaurantId },
    { next: { revalidate: SANITY_REVALIDATE_SECONDS, tags: ['mustEat'] } }
  );
}

export async function getAllBezirkeWithStats(): Promise<BezirkDoc[]> {
  return client.fetch<BezirkDoc[]>(
    allBezirkeWithStatsQuery,
    {},
    { next: { revalidate: SANITY_REVALIDATE_SECONDS, tags: ['bezirk', 'sitemap-bezirke'] } }
  );
}

export async function getBezirkBySlug(slug: string): Promise<BezirkDoc | null> {
  return client.fetch<BezirkDoc | null>(
    bezirkBySlugQuery,
    { slug },
    // `bezirk` (generic) catches restaurant publishes — the webhook can't
    // resolve the restaurant's bezirk slug, so it fires the generic tag.
    { next: { revalidate: SANITY_REVALIDATE_SECONDS, tags: [`bezirk:${slug}`, 'bezirk'] } }
  );
}

export async function getRestaurantsByBezirk(slug: string): Promise<RestaurantCard[]> {
  return client.fetch<RestaurantCard[]>(
    restaurantsByBezirkQuery,
    { bezirkSlug: slug },
    {
      next: {
        revalidate: SANITY_REVALIDATE_SECONDS,
        tags: [`bezirk:${slug}`, 'bezirk', 'sitemap-restaurants'],
      },
    }
  );
}

export async function getRestaurantsByCategory(categorySlug: string): Promise<RestaurantCard[]> {
  return client.fetch<RestaurantCard[]>(
    restaurantsByCategoryQuery,
    { categorySlug },
    {
      next: {
        revalidate: SANITY_REVALIDATE_SECONDS,
        tags: [`category:${categorySlug}`, 'category-list'],
      },
    }
  );
}

interface RestaurantSiblingCandidates {
  bezirk: RestaurantCard[];
}

interface RestaurantSiblingRows {
  bezirkAfter: RestaurantCard[];
  bezirkWrap: RestaurantCard[];
}

export async function getRestaurantSiblingCandidates({
  selfSlug,
  selfName,
  bezirkSlug,
  bezirkLimit = 3,
}: {
  selfSlug: string;
  selfName: string;
  bezirkSlug?: string;
  bezirkLimit?: number;
}): Promise<RestaurantSiblingCandidates> {
  const rows = await client.fetch<RestaurantSiblingRows>(
    restaurantSiblingCandidatesQuery,
    {
      selfSlug,
      selfName,
      bezirkSlug: bezirkSlug ?? '',
      bezirkLimit,
    },
    {
      next: {
        revalidate: SANITY_REVALIDATE_SECONDS,
        tags: ['restaurant-siblings', ...(bezirkSlug ? [`bezirk:${bezirkSlug}`] : [])],
      },
    }
  );

  return {
    bezirk: [...(rows.bezirkAfter ?? []), ...(rows.bezirkWrap ?? [])].slice(0, bezirkLimit),
  };
}

export async function getAllCategories(): Promise<CategoryDef[]> {
  return client.fetch<CategoryDef[]>(
    allCategoriesQuery,
    {},
    { next: { revalidate: SANITY_REVALIDATE_SECONDS, tags: ['category', 'category-list'] } }
  );
}

/**
 * Kategorien mit Spot-Zahl und Beispielkarten — nur für den /kategorie-Index.
 *
 * `category-list` ist die Aggregations-Marke, die der Revalidate-Webhook auch
 * bei jeder *Restaurant*-Publikation feuert (siehe api/revalidate/route.ts,
 * case 'restaurant'). Genau das braucht diese Query: Anzahl und Beispielkarten
 * ändern sich, sobald ein Restaurant die Kategorie wechselt oder schließt.
 */
export async function getAllCategoriesWithStats(): Promise<CategoryWithStats[]> {
  return client.fetch<CategoryWithStats[]>(
    allCategoriesWithStatsQuery,
    {},
    { next: { revalidate: SANITY_REVALIDATE_SECONDS, tags: ['category', 'category-list'] } }
  );
}

export async function getCategoryBySlug(slug: string): Promise<CategoryDef | null> {
  return client.fetch<CategoryDef | null>(
    categoryBySlugQuery,
    { slug },
    { next: { revalidate: SANITY_REVALIDATE_SECONDS, tags: [`category:${slug}`] } }
  );
}

export async function getLatestNewsArticles(limit: number): Promise<NewsArticle[]> {
  return client.fetch<NewsArticle[]>(
    latestNewsArticlesQuery,
    { limit },
    { next: { revalidate: SANITY_REVALIDATE_SECONDS, tags: ['news'] } }
  );
}

type EmailSpot = {
  name: string;
  slug: string;
  area: string;
  cuisine?: string;
  photo: string;
};

// Curated spots for the magic-link email — public restaurant data only.
export async function getEmailSpots(limit: number): Promise<EmailSpot[]> {
  return client.fetch<EmailSpot[]>(
    emailSpotsQuery,
    { limit },
    { next: { revalidate: SANITY_REVALIDATE_SECONDS, tags: ['restaurant'] } }
  );
}

/** Spot + Must-Eat counts for every pack, keyed by category slug. */
export async function getPackContents(): Promise<PackContentsIndex> {
  const raw = await client.fetch<{
    categories: ({ slug: string } & PackContents)[];
    allBerlin: PackContents;
  }>(
    packContentsQuery,
    {},
    { next: { revalidate: SANITY_REVALIDATE_SECONDS, tags: ['pack-contents'] } }
  );
  return {
    byCategory: Object.fromEntries(raw.categories.map(({ slug, ...counts }) => [slug, counts])),
    allBerlin: raw.allBerlin,
  };
}
