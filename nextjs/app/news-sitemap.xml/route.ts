import { client } from '@/lib/sanity'
import { localeUrl } from '@/lib/locale-url'
import { isStaging } from '@/lib/env'

// Google News sitemap: a dedicated feed of *recent* articles in the
// <news:news> format, the standard lever for fast indexing of fresh news.
// Per Google's spec it lists only articles from the last 2 days — older ones
// live in the regular /sitemap.xml. Referenced from robots.ts.
export const revalidate = 1800 // 30 min — news freshness without hammering Sanity

const PUBLICATION_NAME = 'Eat This Berlin'
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

interface NewsRow {
  slug: string
  title: string
  date: string
}

export async function GET(): Promise<Response> {
  // Staging is noindex — don't expose a news feed crawlers might follow.
  if (isStaging) {
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>',
      { headers: { 'Content-Type': 'application/xml' } },
    )
  }

  const rows = await client.fetch<NewsRow[]>(
    `*[_type == "newsArticle" && defined(slug.current) && defined(date) && !(_id in path("drafts.**"))]
      | order(date desc)[0...100] {
        "slug": slug.current,
        "title": coalesce(titleDe, title),
        date
      }`,
    {},
    { next: { revalidate: 1800, tags: ['sitemap-articles'] } },
  )

  const cutoff = Date.now() - TWO_DAYS_MS
  const recent = rows.filter(r => {
    const t = Date.parse(r.date)
    return Number.isFinite(t) && t >= cutoff
  })

  const urls = recent
    .map(r => {
      const loc = xmlEscape(localeUrl('de', `/news/${r.slug}`))
      const pubDate = new Date(r.date).toISOString()
      return `  <url>
    <loc>${loc}</loc>
    <news:news>
      <news:publication>
        <news:name>${PUBLICATION_NAME}</news:name>
        <news:language>de</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title>${xmlEscape(r.title)}</news:title>
    </news:news>
  </url>`
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${urls}
</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=1800, s-maxage=1800',
    },
  })
}
