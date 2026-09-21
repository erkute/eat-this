import { client } from '@/lib/sanity';
import { localeUrl } from '@/lib/locale-url';
import { isStaging } from '@/lib/env';
import { liveRestaurant } from '@/lib/sanity-filters';

// llms.txt — a curated, machine-readable map of the site for AI answer engines
// (ChatGPT, Perplexity, …). The content depth (Was-bestellen blocks, FAQs) is
// already AEO-friendly; this is the cheap entry point that points crawlers at
// the best hubs. Markdown per the llms.txt convention. Referenced implicitly
// at /llms.txt (root, dotted path bypasses the locale middleware).
export const revalidate = 86400;

interface NamedSlug {
  slug: string;
  name: string;
}

interface Article {
  slug: string;
  /** Deutscher Titel — Sanity-Feld `titleDe`. */
  nameDe: string;
  /** Englischer Titel — in Sanity heißt das Feld schlicht `title`. */
  nameEn: string;
}

interface Category extends NamedSlug {
  nameEn: string;
}

// Deckel gegen unbegrenztes Wachstum. Bei 24 Artikeln (Stand 09/2026) greift er
// nicht — er verhindert nur, dass die Datei irgendwann zur Volltext-Sitemap
// wird. Vorher stand hier [0...15] „die 15 neuesten": damit fehlten neun
// Artikel, darunter /news/restaurants-prenzlauer-berg, einer der meistbesuchten
// Einstiege aus KI-Assistenten überhaupt.
const ARTICLE_LIMIT = 60;

export async function GET(): Promise<Response> {
  if (isStaging) {
    return new Response('# Eat This (staging)\n', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  const [categories, bezirke, articles] = await Promise.all([
    client.fetch<Category[]>(
      `*[_type == "category" && defined(slug.current)] | order(name asc) { "slug": slug.current, name, "nameEn": coalesce(nameEn, name) }`,
      {},
      { next: { revalidate: 86400, tags: ['category-list'] } }
    ),
    client.fetch<NamedSlug[]>(
      `*[_type == "bezirk" && defined(slug.current) && count(*[_type == "restaurant" && bezirkRef._ref == ^._id && ${liveRestaurant()}]) > 0] | order(name asc) { "slug": slug.current, name }`,
      {},
      { next: { revalidate: 86400, tags: ['sitemap-bezirke'] } }
    ),
    client.fetch<Article[]>(
      `*[_type == "newsArticle" && defined(slug.current) && !(_id in path("drafts.**"))] | order(date desc)[0...${ARTICLE_LIMIT}] { "slug": slug.current, "nameDe": coalesce(titleDe, title), "nameEn": coalesce(titleEn, title, titleDe) }`,
      {},
      { next: { revalidate: 86400, tags: ['sitemap-articles'] } }
    ),
  ]);

  const de = (name: string, path: string) => `- [${name}](${localeUrl('de', path)})`;
  const en = (name: string, path: string) => `- [${name}](${localeUrl('en', path)})`;

  const lines = [
    '# Eat This Berlin',
    '',
    '> Kuratierte Restaurant-Empfehlungen für Berlin — und pro Spot, was du dort bestellen solltest ("Must Eats"), mit Karte, Bezirks- und Kategorie-Guides sowie einem Food-Magazin. Deutsch unter eatthisdot.com, Englisch unter eatthisdot.com/en.',
    '',
    '## Haupt-Einstiege',
    de('Startseite — Hub', '/'),
    de('Berlin Food Map — alle Spots', '/map'),
    de('Bezirke', '/bezirk'),
    de('Kategorien', '/kategorie'),
    de('Magazin / News', '/news'),
    de('Über uns', '/about'),
    '',
    '## Kategorien',
    ...categories.map((c) => de(c.name, `/kategorie/${c.slug}`)),
    '',
    '## Bezirke',
    ...bezirke.map((b) => de(b.name, `/bezirk/${b.slug}`)),
    '',
    '## Magazin',
    ...articles.map((a) => de(a.nameDe, `/news/${a.slug}`)),
    '',
    '## English',
    '',
    'Every page below also exists in German without the `/en` prefix.',
    '',
    en('Home — hub', '/'),
    en('Berlin Food Map — every spot', '/map'),
    en('Districts', '/bezirk'),
    en('Categories', '/kategorie'),
    en('Magazine', '/news'),
    en('About', '/about'),
    '',
    '### Categories',
    // Die GROQ-Sortierung ist die deutsche (`order(name asc)`); fuer die
    // englische Liste nach dem englischen Namen neu sortieren, sonst stuende
    // "Breakfast" hinter "Fine Dining".
    ...[...categories]
      .sort((a, b) => a.nameEn.localeCompare(b.nameEn, 'en'))
      .map((c) => en(c.nameEn, `/kategorie/${c.slug}`)),
    '',
    // Die Bezirksnamen sind in beiden Sprachen identisch (Mitte, Kreuzberg, …),
    // eine zweite Liste wäre 20 Zeilen gleicher Linktext. Eine Zeile reicht.
    `### Districts`,
    `Same districts as above, at \`${localeUrl('en', '/bezirk')}/<slug>\`: ${bezirke.map((b) => b.slug).join(', ')}.`,
    '',
    '### Magazine',
    ...articles.map((a) => en(a.nameEn, `/news/${a.slug}`)),
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
