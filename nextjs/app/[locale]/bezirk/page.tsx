import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getAllBezirkeWithStats } from '@/lib/sanity.server';
import { pickShelf } from '@/lib/curated-ranking';
import { pickLocale } from '@/lib/i18n/pickLocale';
import { serializeJsonLd } from '@/lib/json-ld';
import { localeUrl } from '@/lib/locale-url';
import { buildHreflangAlternates, toOgLocale } from '@/lib/seo/metadata';
import { OG_CARD_VERSION, SITE_URL } from '@/lib/constants';
import {
  BEZIRK_LIST_ID,
  BezirkFilterBar,
  BezirkFilterProvider,
  BezirkRow,
  type BezirkChip,
} from './BezirkFilter';
import styles from '@/app/components/HubPage.module.css';
import { HubSpotShelf, hubTitleStyle } from '@/app/components/HubSpots';

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
  const bezirke = (await getAllBezirkeWithStats()).filter((b) => (b.restaurantCount ?? 0) > 0);

  const chips: BezirkChip[] = bezirke.map((b) => ({
    slug: b.slug,
    name: b.name,
    count: b.restaurantCount ?? 0,
  }));

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
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <h1 className={styles.title} style={hubTitleStyle(title)}>
              {title}
            </h1>
            <p className={styles.lede}>
              {de
                ? 'Jeder Bezirk isst anders. Such dir einen aus – wir haben überall die Adressen gesammelt, für die wir geradestehen.'
                : "Every district eats differently. Pick one – we've gathered the addresses we vouch for, right across the city."}
            </p>
          </div>
        </header>

        <section aria-label={de ? 'Alle Bezirke' : 'All districts'}>
          <BezirkFilterProvider slugs={chips.map((c) => c.slug)}>
            {/* Keine Zwischenüberschrift „Bezirk wählen": die H1 sagt „Berlin
                nach Bezirk", die Chips darunter SIND die Wahl. */}
            <BezirkFilterBar districts={chips} locale={loc} />

            <div id={BEZIRK_LIST_ID} className={styles.spotList}>
              {bezirke.map((b) => {
                // Kuratierte Spots führen das Regal an; aufgefüllt wird mit der
                // alphabetischen Auswahl. Ohne publizierbares Bild fliegt ein
                // Spot raus — die Regal-Karte ist ganz Foto.
                const curated = (b.topSpotCards ?? []).filter((r) => r.photo);
                const spots = pickShelf(curated, b.exampleRestaurants, 4);
                const count = b.restaurantCount ?? 0;
                const blurb = pickLocale(b.description, b.descriptionEn, loc);

                return (
                  <BezirkRow key={b._id} slug={b.slug}>
                    <div className={styles.shelfHead}>
                      <h2 id={`bezirk-${b.slug}-title`} className={styles.shelfTitle}>
                        <Link href={`/bezirk/${b.slug}`}>{b.name}</Link>
                      </h2>
                      <Link
                        href={`/bezirk/${b.slug}`}
                        className={styles.shelfAll}
                        aria-label={de ? `Alle Spots in ${b.name}` : `All spots in ${b.name}`}
                      >
                        {/* Friedenau hat genau einen Spot — dort kein „Alle". */}
                        {count === 1 ? (de ? 'Zum Spot' : 'Open') : de ? 'Alle' : 'All'}
                      </Link>
                    </div>
                    {/* Die Beschreibung erklärt, warum man den Bezirk anklicken
                        sollte — vier Restaurantnamen tun das nicht. */}
                    {blurb && <p className={styles.shelfBlurb}>{blurb}</p>}
                    <HubSpotShelf
                      restaurants={spots}
                      locale={loc}
                      label={de ? `Spots in ${b.name}` : `Spots in ${b.name}`}
                    />
                  </BezirkRow>
                );
              })}
            </div>
          </BezirkFilterProvider>
        </section>
      </main>
    </>
  );
}
