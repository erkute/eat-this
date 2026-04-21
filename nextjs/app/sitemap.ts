import { MetadataRoute } from 'next'

export const revalidate = 0
import { client } from '@/lib/sanity'
import { SITE_URL } from '@/lib/constants'

const STATIC_PAGES: MetadataRoute.Sitemap = [
  { url: SITE_URL, priority: 1.0, changeFrequency: 'weekly' },
  { url: `${SITE_URL}/about`, priority: 0.5, changeFrequency: 'monthly' },
  { url: `${SITE_URL}/contact`, priority: 0.4, changeFrequency: 'monthly' },
  { url: `${SITE_URL}/press`, priority: 0.4, changeFrequency: 'monthly' },
  { url: `${SITE_URL}/impressum`, priority: 0.2, changeFrequency: 'yearly' },
  { url: `${SITE_URL}/datenschutz`, priority: 0.2, changeFrequency: 'yearly' },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [restaurants, articles] = await Promise.all([
    client.fetch<{ slug: string; updatedAt: string }[]>(
      `*[_type == "restaurant" && defined(slug.current) && !(_id in path("drafts.**"))] { "slug": slug.current, "updatedAt": _updatedAt }`,
      {},
      { next: { revalidate: 3600 } }
    ),
    client.fetch<{ slug: string; updatedAt: string }[]>(
      `*[_type == "newsArticle" && defined(slug.current) && !(_id in path("drafts.**"))] { "slug": slug.current, "updatedAt": _updatedAt }`,
      {},
      { next: { revalidate: 3600 } }
    ),
  ])

  const restaurantUrls: MetadataRoute.Sitemap = restaurants.map(({ slug, updatedAt }) => ({
    url: `${SITE_URL}/restaurant/${slug}`,
    lastModified: updatedAt,
    priority: 0.8,
    changeFrequency: 'monthly',
  }))

  const articleUrls: MetadataRoute.Sitemap = articles.map(({ slug, updatedAt }) => ({
    url: `${SITE_URL}/news/${slug}`,
    lastModified: updatedAt,
    priority: 0.7,
    changeFrequency: 'monthly',
  }))

  return [...STATIC_PAGES, ...restaurantUrls, ...articleUrls]
}
