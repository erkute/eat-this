import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import NewsSection from '@/app/components/NewsSection';
import { getAllNewsArticles } from '@/lib/sanity.server';
import { OG_CARD_VERSION, SITE_URL } from '@/lib/constants';
import { INDEXABLE_ROBOTS, buildHreflangAlternates, toOgLocale } from '@/lib/seo/metadata';
import { serializeJsonLd } from '@/lib/json-ld';
import { localeUrl } from '@/lib/locale-url';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const activeLocale = locale === 'en' ? 'en' : 'de';
  const description = activeLocale === 'de'
    ? 'Aktuelle Restaurant-News, Empfehlungen und Storys aus Berlins Food-Szene.'
    : "Latest restaurant news, recommendations and stories from Berlin's food scene.";
  const alternates = buildHreflangAlternates('/news', activeLocale);
  return {
    title: 'News', description, robots: INDEXABLE_ROBOTS, alternates,
    openGraph: {
      title: 'News', description, url: alternates.canonical, type: 'website',
      images: [{ url: `${SITE_URL}/pics/og-card.png?v=${OG_CARD_VERSION}`, width: 1200, height: 630, alt: 'EAT THIS – We tell you what to eat' }],
      locale: toOgLocale(activeLocale),
    },
  };
}

// A concrete segment keeps News client references out of the homepage's
// catch-all manifest group, so its footer does not load the homepage bundle.
export default async function NewsPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const articles = await getAllNewsArticles();
  const activeLocale = locale === 'en' ? 'en' : 'de';
  const de = activeLocale === 'de';
  const jsonLd = serializeJsonLd({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Eat This Berlin',
            item: localeUrl(activeLocale, '/'),
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: de ? 'Auf dem Teller' : 'On the plate',
            item: localeUrl(activeLocale, '/news'),
          },
        ],
      },
      {
        '@type': 'ItemList',
        name: de ? 'Restaurant-News aus Berlin' : 'Berlin restaurant news',
        numberOfItems: articles.length,
        itemListElement: articles.map((article, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: de ? article.titleDe || article.title : article.title,
          url: localeUrl(activeLocale, `/news/${article.slug}`),
        })),
      },
    ],
  });
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <NewsSection articles={articles} locale={activeLocale} />
    </>
  );
}
