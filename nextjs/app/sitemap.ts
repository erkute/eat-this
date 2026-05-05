import { MetadataRoute } from 'next'
import { client } from '@/lib/sanity'
import { SITE_URL } from '@/lib/constants'
import { routing } from '@/i18n/routing'

export const revalidate = 0

const STATIC_PATHS = ['', '/news', '/about', '/contact', '/press', '/impressum', '/datenschutz'] as const

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

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [restaurants, articles] = await Promise.all([
    client.fetch<{ slug: string; updatedAt: string }[]>(
      `*[_type == "restaurant" && defined(slug.current) && !(_id in path("drafts.**"))] { "slug": slug.current, "updatedAt": _updatedAt }`,
      {},
      { next: { revalidate: 3600, tags: ['sitemap-restaurants'] } },
    ),
    client.fetch<{ slug: string; updatedAt: string }[]>(
      `*[_type == "newsArticle" && defined(slug.current) && !(_id in path("drafts.**"))] { "slug": slug.current, "updatedAt": _updatedAt }`,
      {},
      { next: { revalidate: 3600, tags: ['sitemap-articles'] } },
    ),
  ])

  const staticEntries = STATIC_PATHS.map(p => {
    const priority = p === '' ? 1.0 : p === '/news' ? 0.7 : p === '/impressum' || p === '/datenschutz' ? 0.2 : 0.5
    const changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] =
      p === '' ? 'weekly' : p === '/news' ? 'weekly' : p === '/impressum' || p === '/datenschutz' ? 'yearly' : 'monthly'
    return withAlternates(p, undefined, priority, changeFrequency)
  })

  const restaurantEntries = restaurants.map(({ slug, updatedAt }) =>
    withAlternates(`/restaurant/${slug}`, updatedAt, 0.8, 'monthly'),
  )

  const articleEntries = articles.map(({ slug, updatedAt }) =>
    withAlternates(`/news/${slug}`, updatedAt, 0.7, 'monthly'),
  )

  return [...staticEntries, ...restaurantEntries, ...articleEntries]
}
