import { client } from '@/lib/sanity'
import { localeUrl } from '@/lib/locale-url'
import { isStaging } from '@/lib/env'

// llms.txt — a curated, machine-readable map of the site for AI answer engines
// (ChatGPT, Perplexity, …). The content depth (Was-bestellen blocks, FAQs) is
// already AEO-friendly; this is the cheap entry point that points crawlers at
// the best hubs. Markdown per the llms.txt convention. Referenced implicitly
// at /llms.txt (root, dotted path bypasses the locale middleware).
export const revalidate = 86400

interface NamedSlug {
  slug: string
  name: string
}

export async function GET(): Promise<Response> {
  if (isStaging) {
    return new Response('# Eat This (staging)\n', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  }

  const [categories, bezirke, articles] = await Promise.all([
    client.fetch<NamedSlug[]>(
      `*[_type == "category" && defined(slug.current)] | order(name asc) { "slug": slug.current, name }`,
      {},
      { next: { revalidate: 86400, tags: ['category-list'] } },
    ),
    client.fetch<NamedSlug[]>(
      `*[_type == "bezirk" && defined(slug.current) && count(*[_type == "restaurant" && bezirkRef._ref == ^._id && isOpen != false]) > 0] | order(name asc) { "slug": slug.current, name }`,
      {},
      { next: { revalidate: 86400, tags: ['sitemap-bezirke'] } },
    ),
    client.fetch<NamedSlug[]>(
      `*[_type == "newsArticle" && defined(slug.current) && !(_id in path("drafts.**"))] | order(date desc)[0...15] { "slug": slug.current, "name": coalesce(titleDe, title) }`,
      {},
      { next: { revalidate: 86400, tags: ['sitemap-articles'] } },
    ),
  ])

  const link = (name: string, path: string) => `- [${name}](${localeUrl('de', path)})`

  const lines = [
    '# Eat This Berlin',
    '',
    '> Kuratierte Restaurant-Empfehlungen für Berlin — pro Restaurant das eine Gericht, das du bestellen musst ("Must Eat"), mit Karte, Bezirks- und Kategorie-Guides sowie einem Food-Magazin. Deutsch unter eatthisdot.com, Englisch unter eatthisdot.com/en.',
    '',
    '## Haupt-Einstiege',
    link('Startseite — Hub', '/'),
    link('Karte aller Spots', '/map'),
    link('Bezirke', '/bezirk'),
    link('Kategorien', '/kategorie'),
    link('Magazin / News', '/news'),
    link('Über uns', '/about'),
    '',
    '## Kategorien',
    ...categories.map(c => link(c.name, `/kategorie/${c.slug}`)),
    '',
    '## Bezirke',
    ...bezirke.map(b => link(b.name, `/bezirk/${b.slug}`)),
    '',
    '## Aktuelle Artikel',
    ...articles.map(a => link(a.name, `/news/${a.slug}`)),
    '',
  ]

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  })
}
