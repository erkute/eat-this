import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { getAllBezirkeWithStats } from '@/lib/sanity.server';
import { serializeJsonLd } from '@/lib/json-ld';
import { localeUrl } from '@/lib/locale-url';
import { buildHreflangAlternates, toOgLocale } from '@/lib/seo/metadata';
import { OG_CARD_VERSION, SITE_URL } from '@/lib/constants';
import styles from '@/app/components/HubIssue.module.css';
import DiscoveryExplorer from '@/app/components/DiscoveryExplorer';

interface PageProps {
  params: Promise<{ locale: string }>;
}

// 24 Stunden. Die Frist ist nicht der Weg, auf dem Inhalte live gehen — das ist
// der Sanity-Webhook auf /api/revalidate. Hintergrund und Bedingung an dieser
// Zahl: SANITY_REVALIDATE_SECONDS in lib/constants.ts. Next verlangt hier einen
// statisch lesbaren Wert, deshalb die Zahl statt der Konstante.
export const revalidate = 86400;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const de = locale === 'de';
  const title = de ? 'Restaurants nach Bezirk' : 'Restaurants by district';
  const description = de
    ? 'Kuratierte Restaurant-Empfehlungen für jeden Berliner Bezirk — Mitte, Kreuzberg, Prenzlauer Berg, Neukölln, Schöneberg und mehr.'
    : 'Curated restaurant picks for every Berlin district — Mitte, Kreuzberg, Prenzlauer Berg, Neukölln, Schöneberg, and beyond.';
  const alternates = buildHreflangAlternates('/bezirk', de ? 'de' : 'en');
  return {
    title,
    description,
    alternates,
    openGraph: {
      title,
      description,
      url: alternates.canonical,
      type: 'website',
      locale: toOgLocale(de ? 'de' : 'en'),
      images: [
        {
          url: `${SITE_URL}/pics/og-card.png?v=${OG_CARD_VERSION}`,
          width: 1200,
          height: 630,
          alt: 'EAT THIS – We tell you what to eat',
        },
      ],
    },
  };
}

export default async function BezirkIndexPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const de = locale === 'de';
  const loc = de ? 'de' : 'en';
  // Empty districts (no open spots) are hidden — an empty grid page is a
  // dead end for users and thin content for Google. Same rule as the Hub chips.
  const allBezirke = await getAllBezirkeWithStats();
  const bezirke = allBezirke.filter((b) => (b.restaurantCount ?? 0) > 0);

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
            item: localeUrl(locale, '/'),
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: de ? 'Bezirke' : 'Districts',
            item: localeUrl(locale, '/bezirk'),
          },
        ],
      },
      {
        '@type': 'ItemList',
        itemListElement: bezirke.map((b, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: b.name,
          url: localeUrl(locale, `/bezirk/${b.slug}`),
        })),
      },
    ],
  });

  return (
    <>
      <script
        id="schema-bezirk-index"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <main className={`${styles.page} ${styles.discoveryPage}`}>
        <DiscoveryExplorer
          locale={loc}
          entries={bezirke.map((b) => ({
            slug: b.slug,
            href: `/bezirk/${b.slug}`,
            name: b.name,

          }))}
        />


      </main>
    </>
  );
}
