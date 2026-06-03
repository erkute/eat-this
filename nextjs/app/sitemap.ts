import { MetadataRoute } from 'next'
import { client } from '@/lib/sanity'
import { localeUrl } from '@/lib/locale-url'
import { routing } from '@/i18n/routing'
import { hasEnContent } from '@/lib/i18n/pickLocale'
import { isStaging } from '@/lib/env'

export const revalidate = 0

// `/contact`, `/impressum`, `/datenschutz`, `/agb` are marked
// `noindex,follow` in [...slug]/page.tsx — listing them in the sitemap
// would send a conflicting signal, so they're omitted.
// `''` (root) is the Hub home page — `index,follow`, self-canonical — so it
// leads the sitemap at top priority.
const STATIC_PATHS = ['', '/news', '/bezirk', '/kategorie', '/about'] as const

function withAlternates(path: string, lastModified?: string, priority = 0.5, changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] = 'monthly'): MetadataRoute.Sitemap[number] {
  return {
    url: localeUrl('de', path),
    lastModified,
    priority,
    changeFrequency,
    alternates: {
      languages: {
        ...Object.fromEntries(routing.locales.map(loc => [loc, localeUrl(loc, path)])),
        'x-default': localeUrl('de', path),
      },
    },
  }
}

// DE-only entries: same content has no per-locale variant in Sanity (e.g.
// /restaurant/x renders identical body for /en/restaurant/x), so don't
// declare an EN alternate — that's what makes Google treat the EN URL as
// a duplicate and pick its own canonical.
function deOnly(path: string, lastModified?: string, priority = 0.5, changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] = 'monthly'): MetadataRoute.Sitemap[number] {
  return {
    url: localeUrl('de', path),
    lastModified,
    priority,
    changeFrequency,
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (isStaging) return []

  const [restaurants, articles, bezirke, categorySlugs] = await Promise.all([
    client.fetch<{ slug: string; descriptionEn?: string }[]>(
      `*[_type == "restaurant" && defined(slug.current) && !(_id in path("drafts.**"))] { "slug": slug.current, descriptionEn }`,
      {},
      { next: { revalidate: 3600, tags: ['sitemap-restaurants'] } },
    ),
    client.fetch<{ slug: string; updatedAt: string }[]>(
      `*[_type == "newsArticle" && defined(slug.current) && !(_id in path("drafts.**"))] { "slug": slug.current, "updatedAt": _updatedAt }`,
      {},
      { next: { revalidate: 3600, tags: ['sitemap-articles'] } },
    ),
    client.fetch<{ slug: string; descriptionEn?: string }[]>(
      `*[_type == "bezirk" && defined(slug.current) && !(_id in path("drafts.**"))] { "slug": slug.current, descriptionEn }`,
      {},
      { next: { revalidate: 3600, tags: ['sitemap-bezirke'] } },
    ),
    client.fetch<{ slug: string }[]>(
      `*[_type == "category" && defined(slug.current)] { "slug": slug.current }`,
      {},
      { next: { revalidate: 3600, tags: ['sitemap-categories', 'category-list'] } },
    ),
  ])

  const staticEntries = STATIC_PATHS.map(p => {
    const priority = p === '' ? 1.0 : p === '/news' || p === '/bezirk' || p === '/kategorie' ? 0.7 : 0.5
    const changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] =
      p === '' ? 'daily' : p === '/news' ? 'weekly' : 'monthly'
    return withAlternates(p, undefined, priority, changeFrequency)
  })

  // Restaurants/Bezirke: no `lastmod` — Sanity's `_updatedAt` reflects every
  // batch script touch (Places enrichment etc.), which clusters timestamps
  // and Google then ignores `lastmod` site-wide. Better to omit than lie.
  const restaurantEntries = restaurants.map(({ slug, descriptionEn }) =>
    hasEnContent({ descriptionEn })
      ? withAlternates(`/restaurant/${slug}`, undefined, 0.8, 'monthly')
      : deOnly(`/restaurant/${slug}`, undefined, 0.8, 'monthly'),
  )

  // News keeps `lastmod` — articles are individually edited by humans, so
  // `_updatedAt` is a meaningful "content changed" signal.
  const articleEntries = articles.map(({ slug, updatedAt }) =>
    withAlternates(`/news/${slug}`, updatedAt, 0.7, 'monthly'),
  )

  const bezirkEntries = bezirke.map(({ slug, descriptionEn }) =>
    hasEnContent({ descriptionEn })
      ? withAlternates(`/bezirk/${slug}`, undefined, 0.7, 'monthly')
      : deOnly(`/bezirk/${slug}`, undefined, 0.7, 'monthly'),
  )

  const kategorieEntries = categorySlugs.map(({ slug }) =>
    withAlternates(`/kategorie/${slug}`, undefined, 0.7, 'weekly'),
  )

  return [...staticEntries, ...restaurantEntries, ...articleEntries, ...bezirkEntries, ...kategorieEntries]
}
