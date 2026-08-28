import { client } from './sanity';
import { SANITY_REVALIDATE_SECONDS } from './constants';
import {
  restaurantPageQuery,
  allRestaurantSlugsQuery,
  articleBySlugQuery,
  allArticleSlugsQuery,
  allNewsArticlesQuery,
  latestNewsArticlesQuery,
  guideTeaserBySlugQuery,
  staticPageBySlugQuery,
  allBezirkeWithStatsQuery,
  bezirkBySlugQuery,
  restaurantsByBezirkQuery,
  restaurantsByCategoryQuery,
  allCategoriesQuery,
  allCategoriesWithStatsQuery,
  categoryBySlugQuery,
  emailSpotsQuery,
  packContentsQuery,
} from './queries';
import type {
  Restaurant,
  NewsArticle,
  StaticPageDoc,
  BezirkDoc,
  RestaurantCard,
  RestaurantArticleCard,
} from './types';
import type { CategoryDef, CategoryWithStats } from './categories';
import type { PackContents, PackContentsIndex } from './pack/packDetail';

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

/**
 * Vier, nicht drei: das Raster ist auf Mobil zweispaltig und auf Desktop
 * vierspaltig — eine Dreiergruppe lässt in beiden Fällen eine Karte allein in
 * der letzten Zeile stehen. Gleiche Regel wie im Bezirks-Regal.
 *
 * Bewusst KEIN Parameter: der Wert geht als GROQ-Variable in die Query und ist
 * damit Teil des Cache-Keys. Könnten Aufrufer ihn setzen, ergäben
 * `generateMetadata` und der Seitenrumpf zwei verschiedene Einträge — also zwei
 * Anfragen statt einer, und der ganze Sinn der Zusammenlegung wäre weg.
 */
const RESTAURANT_SIBLING_LIMIT = 4;
// Drei reichen: darüber wiederholen sich die Hub-Guides, in denen der Spot nur
// einer von vielen ist — siehe die Sortierung in `articlesAboutRestaurant`.
const RESTAURANT_ARTICLE_LIMIT = 3;

interface RestaurantPageRow extends Restaurant {
  mustEats?: MustEatPreview[];
  articles?: RestaurantArticleCard[];
  siblingsAfter?: RestaurantCard[];
  siblingsWrap?: RestaurantCard[];
}

export interface RestaurantPageData {
  restaurant: Restaurant;
  mustEats: MustEatPreview[];
  articles: RestaurantArticleCard[];
  siblings: RestaurantCard[];
}

/**
 * Das Datenpaket der Restaurant-Seite in EINER Anfrage.
 *
 * Vorher waren es drei, und zwei davon konnten erst starten, wenn das Dokument
 * da war (sie brauchten `_id` und den Bezirk) — also zwei Roundtrips
 * hintereinander. Bei 932 vorgerenderten Restaurant-Seiten, die täglich
 * revalidieren, sind das rund 930 vermeidbare Sanity-Anfragen pro Zyklus.
 *
 * Die Tags sind die Vereinigung der drei alten Sätze. `bezirk:<slug>` fehlt
 * darin bewusst — den Slug kennt man vor dem Fetch nicht, und der Webhook
 * feuert bei Bezirks-Publishes ohnehin `restaurant-siblings` (siehe
 * api/revalidate/route.ts).
 */
export async function getRestaurantPageData(slug: string): Promise<RestaurantPageData | null> {
  const row = await client.fetch<RestaurantPageRow | null>(
    restaurantPageQuery,
    {
      slug,
      siblingLimit: RESTAURANT_SIBLING_LIMIT,
      articleLimit: RESTAURANT_ARTICLE_LIMIT,
    },
    {
      next: {
        revalidate: SANITY_REVALIDATE_SECONDS,
        // `newsArticle`, weil ein neuer oder umgeschriebener Artikel den
        // „Wir waren da"-Block auf JEDER darin verlinkten Restaurant-Seite
        // ändert — ohne den Tag bliebe er bis zum Revalidate-Intervall leer.
        tags: [
          `restaurant:${slug}`,
          'restaurant',
          'mustEat',
          'newsArticle',
          'restaurant-siblings',
        ],
      },
    }
  );
  if (!row) return null;

  const { mustEats, articles, siblingsAfter, siblingsWrap, ...restaurant } = row;
  return {
    restaurant: restaurant as Restaurant,
    mustEats: mustEats ?? [],
    articles: articles ?? [],
    siblings: [...(siblingsAfter ?? []), ...(siblingsWrap ?? [])].slice(
      0,
      RESTAURANT_SIBLING_LIMIT
    ),
  };
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

export interface GuideTeaser {
  slug: string;
  title: string;
  excerpt?: string;
  noIndex: boolean;
}

/**
 * Überschrift und Anrisstext eines Guides, ohne seinen Fließtext. Der
 * Revalidate-Tag ist derselbe, den /api/revalidate beim Publish eines Artikels
 * feuert (`article:<slug>`) — der Querverweis auf der Kategorieseite zieht die
 * neue Überschrift damit im selben Moment nach wie der Artikel selbst.
 */
export async function getGuideTeaser(
  slug: string,
  locale: 'de' | 'en'
): Promise<GuideTeaser | null> {
  return client.fetch<GuideTeaser | null>(
    guideTeaserBySlugQuery,
    { slug, locale },
    { next: { revalidate: SANITY_REVALIDATE_SECONDS, tags: [`article:${slug}`] } }
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
