import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { getAllBezirkeWithStats } from '@/lib/sanity.server';
import { pickShelf } from '@/lib/curated-ranking';
import { pickLocale } from '@/lib/i18n/pickLocale';
import { serializeJsonLd } from '@/lib/json-ld';
import { localeUrl } from '@/lib/locale-url';
import { buildHreflangAlternates, toOgLocale } from '@/lib/seo/metadata';
import { OG_CARD_VERSION, SITE_URL } from '@/lib/constants';
import styles from '@/app/components/HubIssue.module.css';
import { IssueDirectory, IssueMagazine } from '@/app/components/HubIssue';
import { latestIssues } from '@/lib/home/getHomeData';

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
  const title = de ? 'Berlin nach Bezirk' : 'Berlin by district';
  // Empty districts (no open spots) are hidden — an empty grid page is a
  // dead end for users and thin content for Google. Same rule as the Hub chips.
  const [allBezirke, magazine] = await Promise.all([
    getAllBezirkeWithStats(),
    latestIssues(3, loc),
  ]);
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
      <main className={styles.page}>
        <header className={styles.head}>
          <p className={styles.kicker}>{de ? 'Bezirke' : 'Districts'}</p>
          <h1 className={styles.title}>
            <span className={styles.indexTitle}>{title}</span>
          </h1>
        </header>
        <p className={styles.lede}>
          {de
            ? 'Entdecke Restaurants, Cafés und Bars in deinem Bezirk.'
            : 'Discover restaurants, cafés and bars in your neighbourhood.'}
        </p>

        {/* Das Register ersetzt die Regale und die Bezirks-Leiste darüber
            (bis 03.10.2026): jeder Name ist selbst der Weg, ein Filter vor
            15 Namen doppelte nur die Liste. */}
        <IssueDirectory
          label={de ? 'Alle Bezirke' : 'All districts'}
          entries={bezirke.map((b) => {
            // Kuratierte Spots führen die Bildleiste an; aufgefüllt wird mit
            // der alphabetischen Auswahl. Ohne publizierbares Bild fliegt ein
            // Spot raus — die Leiste ist ganz Foto.
            const curated = (b.topSpotCards ?? []).filter((r) => r.photo);
            const count = b.restaurantCount ?? 0;
            return {
              slug: b.slug,
              href: `/bezirk/${b.slug}`,
              name: b.name,
              // Die Beschreibung erklärt, warum man den Bezirk anklicken
              // sollte — vier Restaurantnamen tun das nicht.
              blurb: pickLocale(b.description, b.descriptionEn, loc),
              spots: pickShelf(curated, b.exampleRestaurants, 4),
              // Friedenau hat genau einen Spot — dort kein „Alle".
              cta: count === 1 ? (de ? 'Zum Spot' : 'Open') : de ? 'Alle' : 'All',
              ctaLabel: de ? `Alle Spots in ${b.name}` : `All spots in ${b.name}`,
            };
          })}
        />

        {/* Der Schluss: wer unten ankommt, liest weiter. */}
        <IssueMagazine
          issues={magazine}
          locale={loc}
          heading={de ? 'Aus dem Magazin' : 'From the magazine'}
        />
      </main>
    </>
  );
}
