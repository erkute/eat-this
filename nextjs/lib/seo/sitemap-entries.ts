import { client } from '@/lib/sanity';
import { localeUrl } from '@/lib/locale-url';
import { routing } from '@/i18n/routing';
import { hasEnContent } from '@/lib/i18n/pickLocale';
import { isStaging } from '@/lib/env';
import { GONE_SLUGS } from '@/lib/seo/legacyRedirects';
import { SANITY_REVALIDATE_SECONDS, TEMPLATE_REVISED } from '@/lib/constants';
import { liveRestaurant } from '@/lib/sanity-filters';

export type ChangeFrequency = 'daily' | 'weekly' | 'monthly';

/** One `<url>` block. Narrower than Next's `MetadataRoute.Sitemap`: every
 *  entry here carries a `lastModified`, and it is always an ISO string —
 *  app/sitemap.xml/route.ts serializes these fields verbatim. */
export interface SitemapEntry {
  url: string;
  lastModified: string;
  changeFrequency: ChangeFrequency;
  priority: number;
  /** hreflang siblings, keyed by locale (plus `x-default`). Absent for
   *  DE-only pages — see `deOnly()`. */
  alternates?: Record<string, string>;
}

// `/contact`, `/impressum`, `/datenschutz`, `/agb` are marked
// `noindex,follow` in [...slug]/page.tsx — listing them in the sitemap
// would send a conflicting signal, so they're omitted.
// `''` (root) is the Hub home page — `index,follow`, self-canonical — so it
// leads the sitemap at top priority.
// `/map` is the product itself and, seit dem 01.09.2026, indexierbar (vorher
// `noindex,follow`, deshalb stand es hier nicht). Es steht direkt hinter der
// Startseite: die beiden sind die einzigen Seiten, die für sich die ganze
// Stadt beanspruchen.
const STATIC_PATHS = ['', '/map', '/news', '/bezirk', '/kategorie', '/about'] as const;

function withAlternates(
  path: string,
  lastModified: string,
  priority = 0.5,
  changeFrequency: ChangeFrequency = 'monthly'
): SitemapEntry {
  return {
    url: localeUrl('de', path),
    lastModified,
    priority,
    changeFrequency,
    alternates: {
      ...Object.fromEntries(routing.locales.map((loc) => [loc, localeUrl(loc, path)])),
      'x-default': localeUrl('de', path),
    },
  };
}

// DE-only entries: same content has no per-locale variant in Sanity (e.g.
// /restaurant/x renders identical body for /en/restaurant/x), so don't
// declare an EN alternate — that's what makes Google treat the EN URL as
// a duplicate and pick its own canonical.
function deOnly(
  path: string,
  lastModified: string,
  priority = 0.5,
  changeFrequency: ChangeFrequency = 'monthly'
): SitemapEntry {
  return {
    url: localeUrl('de', path),
    lastModified,
    priority,
    changeFrequency,
  };
}

/** The later of two ISO dates. Both start `YYYY-MM-DD`, so a string compare
 *  is the date compare — no Date parsing needed, and none wanted: `new Date()`
 *  has no business anywhere near a `lastmod`. */
function laterOf(a: string, b: string): string {
  return a > b ? a : b;
}

export async function sitemapEntries(): Promise<SitemapEntry[]> {
  if (isStaging) return [];

  const [restaurants, articles, bezirke, categorySlugs] = await Promise.all([
    client.fetch<{ slug: string; descriptionEn?: string }[]>(
      // `seo.noIndex` ist der Schalter, mit dem die Redaktion eine Seite aus
      // dem Index nimmt (restaurantRobots setzt daraufhin `noindex,nofollow`).
      // Stünde sie trotzdem in der Sitemap, widersprächen sich zwei Signale —
      // dieselbe Falle wie bei den geschlossenen Spots. Heute trifft es null
      // Dokumente; die Regel steht hier, bevor es das erste tut.
      `*[_type == "restaurant" && defined(slug.current) && !(_id in path("drafts.**")) && ${liveRestaurant()} && seo.noIndex != true] { "slug": slug.current, descriptionEn }`,
      {},
      { next: { revalidate: SANITY_REVALIDATE_SECONDS, tags: ['sitemap-restaurants'] } }
    ),
    client.fetch<{ slug: string; updatedAt: string; hasEnContent: boolean }[]>(
      `*[_type == "newsArticle" && defined(slug.current) && !(_id in path("drafts.**")) && seo.noIndex != true] { "slug": slug.current, "updatedAt": _updatedAt, "hasEnContent": defined(title) && count(content) > 0 }`,
      {},
      { next: { revalidate: SANITY_REVALIDATE_SECONDS, tags: ['sitemap-articles'] } }
    ),
    client.fetch<{ slug: string; descriptionEn?: string }[]>(
      // Districts without open spots 404 (bezirk/[slug]/page.tsx) — keep them
      // out of the sitemap too.
      `*[_type == "bezirk" && defined(slug.current) && !(_id in path("drafts.**")) && seo.noIndex != true && count(*[_type == "restaurant" && bezirkRef._ref == ^._id && ${liveRestaurant()}]) > 0] { "slug": slug.current, descriptionEn }`,
      {},
      { next: { revalidate: SANITY_REVALIDATE_SECONDS, tags: ['sitemap-bezirke'] } }
    ),
    client.fetch<{ slug: string }[]>(
      // Kein `seo.noIndex` wie oben: das Kategorie-Schema (studio/schemaTypes/
      // category.js) hat kein seo-Objekt. Kommt eins dazu, gehört der Filter
      // auch hierher.
      `*[_type == "category" && defined(slug.current)] { "slug": slug.current }`,
      {},
      {
        next: {
          revalidate: SANITY_REVALIDATE_SECONDS,
          tags: ['sitemap-categories', 'category-list'],
        },
      }
    ),
  ]);

  const staticEntries = STATIC_PATHS.map((p) => {
    const priority =
      p === '' || p === '/map'
        ? 1.0
        : p === '/news' || p === '/bezirk' || p === '/kategorie'
          ? 0.7
          : 0.5;
    const changeFrequency: ChangeFrequency =
      p === '' || p === '/map' ? 'daily' : p === '/news' ? 'weekly' : 'monthly';
    return withAlternates(p, TEMPLATE_REVISED, priority, changeFrequency);
  });

  // Restaurants/Bezirke/Kategorien have no per-document date worth trusting:
  // Sanity's `_updatedAt` moves on every batch-script touch (Places
  // enrichment etc.), so it would claim a change that never reached the page.
  // They get the template date instead — the last time their rendered output
  // actually changed, which is a claim we can stand behind.
  const restaurantEntries = restaurants
    .filter(({ slug }) => !GONE_SLUGS.has(slug))
    .map(({ slug, descriptionEn }) =>
      hasEnContent({ descriptionEn })
        ? withAlternates(`/restaurant/${slug}`, TEMPLATE_REVISED, 0.8, 'monthly')
        : deOnly(`/restaurant/${slug}`, TEMPLATE_REVISED, 0.8, 'monthly')
    );

  // News articles are individually edited by humans, so `_updatedAt` is a
  // meaningful signal — but the template changed under them too. The page
  // changed on whichever came last.
  const articleEntries = articles.map(({ slug, updatedAt, hasEnContent: hasEnglishArticle }) => {
    const lastModified = laterOf(updatedAt, TEMPLATE_REVISED);
    return hasEnglishArticle
      ? withAlternates(`/news/${slug}`, lastModified, 0.7, 'monthly')
      : deOnly(`/news/${slug}`, lastModified, 0.7, 'monthly');
  });

  const bezirkEntries = bezirke.map(({ slug, descriptionEn }) =>
    hasEnContent({ descriptionEn })
      ? withAlternates(`/bezirk/${slug}`, TEMPLATE_REVISED, 0.7, 'monthly')
      : deOnly(`/bezirk/${slug}`, TEMPLATE_REVISED, 0.7, 'monthly')
  );

  const kategorieEntries = categorySlugs.map(({ slug }) =>
    withAlternates(`/kategorie/${slug}`, TEMPLATE_REVISED, 0.7, 'weekly')
  );

  return [
    ...staticEntries,
    ...restaurantEntries,
    ...articleEntries,
    ...bezirkEntries,
    ...kategorieEntries,
  ];
}
