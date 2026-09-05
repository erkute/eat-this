import type { Metadata } from 'next';
import Image from 'next/image';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getAllBezirkeWithStats } from '@/lib/sanity.server';
import { normalizeName } from '@/lib/normalizeName';
import { localizedCuisine } from '@/lib/cuisineLabels';
import { pickShelf } from '@/lib/curated-ranking';
import { pickLocale } from '@/lib/i18n/pickLocale';
import { serializeJsonLd } from '@/lib/json-ld';
import { localeUrl } from '@/lib/locale-url';
import { buildHreflangAlternates, toOgLocale } from '@/lib/seo/metadata';
import { OG_CARD_VERSION, SITE_URL } from '@/lib/constants';
import { formatPriceLabel } from '@/app/components/map/restaurantDetail.helpers';
import {
  BEZIRK_LIST_ID,
  BezirkFilterBar,
  BezirkFilterProvider,
  BezirkRow,
  type BezirkChip,
} from './BezirkFilter';
import styles from './Bezirk.module.css';

interface PageProps {
  params: Promise<{ locale: string }>;
}

// 24 Stunden. Die Frist ist nicht der Weg, auf dem Inhalte live gehen — das ist
// der Sanity-Webhook auf /api/revalidate. Hintergrund und Bedingung an dieser
// Zahl: SANITY_REVALIDATE_SECONDS in lib/constants.ts. Next verlangt hier einen
// statisch lesbaren Wert, deshalb die Zahl statt der Konstante.
export const revalidate = 86400;

/**
 * „Alle 45 Spots ansehen" — die Zahl gehört auf den Knopf, nicht daneben.
 * Friedenau hat genau einen Spot, deshalb die eigene Einzahl-Variante statt
 * eines „Alle 1 Spots".
 */
function moreLabel(count: number, de: boolean): string {
  if (count === 1) return de ? 'Zum Spot' : 'See the spot';
  // Keine Zahl im Label mehr („keine Zahlen") — der Parameter bleibt, damit
  // der Aufruf mit dem Kategorie-Index gleich bleibt.
  void count;
  return de ? 'Alle Spots ansehen' : 'See all spots';
}

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
          <BezirkFilterProvider slugs={chips.map((c) => c.slug)}>
            {/* Keine Zwischenüberschrift „Bezirk wählen" mehr: die H1 sagt
                „Berlin nach Bezirk", und die Chips darunter SIND die Wahl —
                „da steht zweimal Bezirk". */}
            <BezirkFilterBar districts={chips} locale={loc} />

            <div className={styles.districtRows} id={BEZIRK_LIST_ID}>
              {bezirke.map((b) => {
                // Kuratierte Spots führen das Regal an; aufgefüllt wird mit der
                // alphabetischen Auswahl. Die Karte ist ganz Foto, also fliegt
                // raus, was kein publizierbares Bild hat — sonst stünde da ein
                // schwarzes Rechteck.
                const curated = (b.topSpotCards ?? []).filter((r) => r.photo);
                const spots = pickShelf(curated, b.exampleRestaurants, 4);
                const count = b.restaurantCount ?? 0;
                const blurb = pickLocale(b.description, b.descriptionEn, loc);

                return (
                  <BezirkRow key={b._id} slug={b.slug}>
                    <h3 id={`bezirk-${b.slug}-title`} className={styles.districtName}>
                      <Link href={`/bezirk/${b.slug}`} className={styles.districtLink}>
                        {b.name}
                      </Link>
                    </h3>

                    {/* Die Bezirksbeschreibung stand bisher nur auf der
                        Detailseite. Auf dem Index erklärt sie, warum man den
                        Bezirk anklicken sollte — vier Restaurantnamen tun das
                        nicht. */}
                    {blurb && <p className={styles.districtBlurb}>{blurb}</p>}

                    {spots.length > 0 && (
                      <div className={styles.spotGrid}>
                        {spots.map((restaurant) => {
                          // Gleiche Zeile wie auf der Detailseite: Küche als
                          // Chip, Preisspanne daneben. Rund ein Viertel der
                          // Spots hat keine gepflegte Spanne — dort fällt sie
                          // weg statt als leere Hülse dazustehen.
                          const priceLabel = formatPriceLabel(restaurant, locale);
                          return (
                            <Link
                              key={restaurant._id}
                              href={`/restaurant/${restaurant.slug}`}
                              className={styles.card}
                            >
                              {restaurant.photo && (
                                <div className={styles.cardPhoto}>
                                  <Image
                                    src={restaurant.photo}
                                    alt=""
                                    fill
                                    sizes="(max-width: 1099px) 46vw, 248px"
                                  />
                                </div>
                              )}
                              <div className={styles.cardBody}>
                                <h4 className={styles.cardName}>
                                  {normalizeName(restaurant.name)}
                                </h4>
                                {(restaurant.cuisineType || priceLabel) && (
                                  <div className={styles.cardMeta}>
                                    {restaurant.cuisineType && (
                                      <span className={styles.chipYellow}>
                                        {localizedCuisine(restaurant.cuisineType, loc)}
                                      </span>
                                    )}
                                    {priceLabel && (
                                      <span className={styles.price}>{priceLabel}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}

                    <Link href={`/bezirk/${b.slug}`} className={styles.districtMore}>
                      {moreLabel(count, de)}
                    </Link>
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
