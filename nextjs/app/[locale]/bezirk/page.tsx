import type { Metadata } from 'next';
import Image from 'next/image';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getAllBezirkeWithStats } from '@/lib/sanity.server';
import { normalizeName } from '@/lib/normalizeName';
import { serializeJsonLd } from '@/lib/json-ld';
import { localeUrl } from '@/lib/locale-url';
import { buildHreflangAlternates, toOgLocale } from '@/lib/seo/metadata';
import { SITE_URL } from '@/lib/constants';
import Breadcrumbs, { type BreadcrumbItem } from '@/app/components/Breadcrumbs';
import styles from './Bezirk.module.css';

interface PageProps {
  params: Promise<{ locale: string }>;
}

export const revalidate = 3600;

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
          url: `${SITE_URL}/pics/og-card.png?v=4`,
          width: 1200,
          height: 1200,
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
  // Empty districts (no open spots) are hidden — an empty grid page is a
  // dead end for users and thin content for Google. Same rule as the Hub chips.
  const bezirke = (await getAllBezirkeWithStats()).filter((b) => (b.restaurantCount ?? 0) > 0);

  const breadcrumbItems: BreadcrumbItem[] = [
    { name: de ? 'Start' : 'Home', href: '/', logo: 'eat-this' },
    { name: de ? 'Bezirke' : 'Districts' },
  ];

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
        <div className={styles.breadcrumbWrap}>
          <Breadcrumbs
            items={breadcrumbItems}
            ariaLabel={de ? 'Brotkrumen-Navigation' : 'Breadcrumb'}
          />
        </div>

        <header className={`${styles.hero} ${styles.indexHero}`}>
          <h1 className={styles.h1}>{de ? 'Berlin nach Bezirk' : 'Berlin by district'}</h1>
          <p className={styles.sub}>
            {de
              ? 'Jeder Bezirk isst anders. Such dir einen aus – wir haben überall die Adressen gesammelt, für die wir geradestehen.'
              : "Every district eats differently. Pick one – we've gathered the addresses we vouch for, right across the city."}
          </p>
        </header>

        <section
          className={styles.districtsBlock}
          aria-label={de ? 'Alle Bezirke' : 'All districts'}
        >
          <div className={styles.districtsIntro}>
            <h2>{de ? 'Alle Bezirke' : 'All districts'}</h2>
          </div>
          <div className={styles.districtRows}>
            {bezirke.map((b) => {
              const spots = b.exampleRestaurants ?? [];
              const count = b.restaurantCount ?? 0;
              const moreLabel =
                count === 1
                  ? de
                    ? 'Zum Spot'
                    : 'See the spot'
                  : de
                    ? `Alle ${count} Spots`
                    : `All ${count} spots`;

              return (
                <section
                  key={b._id}
                  className={styles.districtRow}
                  aria-labelledby={`bezirk-${b.slug}`}
                >
                  <div className={styles.districtHead}>
                    <h3 id={`bezirk-${b.slug}`} className={styles.districtName}>
                      <Link href={`/bezirk/${b.slug}`} className={styles.districtLink}>
                        {b.name}
                      </Link>
                    </h3>
                    <Link href={`/bezirk/${b.slug}`} className={styles.districtMore}>
                      {moreLabel}
                      <span aria-hidden="true">→</span>
                    </Link>
                  </div>

                  {spots.length > 0 && (
                    <div className={styles.spotGrid}>
                      {spots.map((restaurant) => (
                        <Link
                          key={restaurant._id}
                          href={`/restaurant/${restaurant.slug}`}
                          className={styles.spotCard}
                        >
                          {restaurant.photo && (
                            <span className={styles.spotPhoto}>
                              <Image
                                src={restaurant.photo}
                                alt=""
                                fill
                                sizes="(max-width: 719px) 46vw, (max-width: 1099px) 31vw, 248px"
                              />
                            </span>
                          )}
                          <span className={styles.spotOverlay}>
                            <span className={styles.spotName}>{normalizeName(restaurant.name)}</span>
                            {restaurant.cuisineType && (
                              <span className={styles.spotMeta}>{restaurant.cuisineType}</span>
                            )}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}
