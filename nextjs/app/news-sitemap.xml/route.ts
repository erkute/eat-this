import { client } from '@/lib/sanity'
import { SITE_URL } from '@/lib/constants'

export const revalidate = 3600

export async function GET() {
  const articles = await client.fetch<{ slug: string; title: string; titleDe: string; date: string }[]>(
    `*[_type == "newsArticle" && defined(slug.current) && !(_id in path("drafts.**"))] | order(date desc) {
      "slug": slug.current,
      title,
      titleDe,
      date
    }`,
    {},
    { next: { revalidate: 3600, tags: ['sitemap-articles'] } }
  )

  const urls = articles
    .filter(a => a.slug && a.title && a.date)
    .map(({ slug, title, date }) => `
  <url>
    <loc>${SITE_URL}/news/${slug}</loc>
    <news:news>
      <news:publication>
        <news:name>Eat This Berlin</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${new Date(date).toISOString()}</news:publication_date>
      <news:title>${title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</news:title>
    </news:news>
  </url>`)
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  })
}
