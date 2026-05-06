import { MetadataRoute } from 'next'
import { client } from '@/lib/sanity'
import { SITE_URL } from '@/lib/constants'
import { routing } from '@/i18n/routing'
import { CATEGORIES } from '@/lib/categories'
import { hasEnContent } from '@/lib/i18n/pickLocale'

export const revalidate = 0

const STATIC_PATHS = ['', '/news', '/bezirk', '/kategorie', '/about', '/contact', '/press', '/impressum', '/datenschutz'] as const

function localeUrl(locale: string, path: string): string {
  return locale === 'de' ? `${SITE_URL}${path || '/'}` : `${SITE_URL}/${locale}${path}`
}

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
  const [restaurants, articles, bezirke] = await Promise.all([
    client.fetch<{ slug: string; updatedAt: string; descriptionEn?: string }[]>(
      `*[_type == "restaurant" && defined(slug.current) && !(_id in path("drafts.**"))] { "slug": slug.current, "updatedAt": _updatedAt, descriptionEn }`,
      {},
      { next: { revalidate: 3600, tags: ['sitemap-restaurants'] } },
    ),
    client.fetch<{ slug: string; updatedAt: string }[]>(
      `*[_type == "newsArticle" && defined(slug.current) && !(_id in path("drafts.**"))] { "slug": slug.current, "updatedAt": _updatedAt }`,
      {},
      { next: { revalidate: 3600, tags: ['sitemap-articles'] } },
    ),
    client.fetch<{ slug: string; updatedAt: string; descriptionEn?: string }[]>(
      `*[_type == "bezirk" && defined(slug.current) && !(_id in path("drafts.**"))] { "slug": slug.current, "updatedAt": _updatedAt, descriptionEn }`,
      {},
      { next: { revalidate: 3600, tags: ['sitemap-bezirke'] } },
    ),
  ])

  const staticEntries = STATIC_PATHS.map(p => {
    const priority = p === '' ? 1.0 : p === '/news' || p === '/bezirk' || p === '/kategorie' ? 0.7 : p === '/impressum' || p === '/datenschutz' ? 0.2 : 0.5
    const changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] =
      p === '' ? 'weekly' : p === '/news' ? 'weekly' : p === '/impressum' || p === '/datenschutz' ? 'yearly' : 'monthly'
    return withAlternates(p, undefined, priority, changeFrequency)
  })

  const restaurantEntries = restaurants.map(({ slug, updatedAt, descriptionEn }) =>
    hasEnContent({ descriptionEn })
      ? withAlternates(`/restaurant/${slug}`, updatedAt, 0.8, 'monthly')
      : deOnly(`/restaurant/${slug}`, updatedAt, 0.8, 'monthly'),
  )

  const articleEntries = articles.map(({ slug, updatedAt }) =>
    withAlternates(`/news/${slug}`, updatedAt, 0.7, 'monthly'),
  )

  const bezirkEntries = bezirke.map(({ slug, updatedAt, descriptionEn }) =>
    hasEnContent({ descriptionEn })
      ? withAlternates(`/bezirk/${slug}`, updatedAt, 0.7, 'monthly')
      : deOnly(`/bezirk/${slug}`, updatedAt, 0.7, 'monthly'),
  )

  const kategorieEntries = CATEGORIES.map(c =>
    withAlternates(`/kategorie/${c.slug}`, undefined, 0.7, 'weekly'),
  )

  return [...staticEntries, ...restaurantEntries, ...articleEntries, ...bezirkEntries, ...kategorieEntries]
}
