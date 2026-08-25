import type { Metadata } from 'next';
import Image from 'next/image';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getAllCategoriesWithStats } from '@/lib/sanity.server';
import { localizedCategoryBlurb, localizedCategoryName } from '@/lib/categories';
import { localizedCuisine } from '@/lib/cuisineLabels';
import { normalizeName } from '@/lib/normalizeName';
import { pickShelf } from '@/lib/curated-ranking';
import { serializeJsonLd } from '@/lib/json-ld';
import { localeUrl } from '@/lib/locale-url';
import { buildHreflangAlternates, toOgLocale } from '@/lib/seo/metadata';
import { OG_CARD_VERSION, SITE_URL } from '@/lib/constants';
import Breadcrumbs, { type BreadcrumbItem } from '@/app/components/Breadcrumbs';
import { formatPriceLabel } from '@/app/components/map/restaurantDetail.helpers';
import sharedStyles from '../bezirk/Bezirk.module.css';
import styles from './Kategorie.module.css';

interface PageProps {
  params: Promise<{ locale: string }>;
}

// 24 Stunden. Die Frist ist nicht der Weg, auf dem Inhalte live gehen — das ist
// der Sanity-Webhook auf /api/revalidate. Hintergrund und Bedingung an dieser
// Zahl: SANITY_REVALIDATE_SECONDS in lib/constants.ts. Next verlangt hier einen
// statisch lesbaren Wert, deshalb die Zahl statt der Konstante.
export const revalidate = 86400;

/**
 * Bewusst ohne Zahl — anders als auf dem Bezirks-Index. Neun Knöpfe
 * untereinander, die von „Alle 9" bis „Alle 224" springen, lesen sich als
 * Rangliste: die große Kategorie gewinnt, obwohl die Zahl nur sagt, wie breit
 * Berlin dort isst. Die Einzahl-Variante bleibt für den Fall, dass eine
 * Kategorie auf einen Spot zusammenschrumpft.
 */
function moreLabel(count: number, de: boolean): string {
  if (count === 1) return de ? 'Zum Spot' : 'See the spot';
  return de ? 'Alle Spots ansehen' : 'See all spots';
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const de = locale === 'de';
  const title = de ? 'Restaurants nach Kategorie' : 'Restaurants by category';
  const description = de
    ? 'Berliner Restaurants nach Anlass — Frühstück, Lunch, Dinner, Café, Süßes und Pizza.'
    : 'Berlin restaurants by occasion — breakfast, lunch, dinner, coffee, sweets, and pizza.';
  const alternates = buildHreflangAlternates('/kategorie', de ? 'de' : 'en');
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

export default async function KategorieIndexPage({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const de = locale === 'de';
  const loc = de ? 'de' : 'en';
  // Leere Kategorien fliegen raus — dieselbe Regel wie auf dem Bezirks-Index:
  // eine Zeile ohne Spots ist eine Sackgasse für Leser und dünner Inhalt für
  // Google.
  const categories = (await getAllCategoriesWithStats()).filter(
    (c) => (c.restaurantCount ?? 0) > 0
  );

  const breadcrumbItems: BreadcrumbItem[] = [
    { name: de ? 'Start' : 'Home', href: '/', logo: 'eat-this' },
    { name: de ? 'Kategorien' : 'Categories' },
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
            name: de ? 'Kategorien' : 'Categories',
            item: localeUrl(locale, '/kategorie'),
          },
        ],
      },
      {
        '@type': 'ItemList',
        itemListElement: categories.map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: localizedCategoryName(c, loc),
          url: localeUrl(locale, `/kategorie/${c.slug}`),
        })),
      },
    ],
  });

  return (
    <>
      <script
        id="schema-kategorie-index"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <main className={`${sharedStyles.page} ${styles.indexPage}`}>
        <div className={sharedStyles.breadcrumbWrap}>
          <Breadcrumbs
            items={breadcrumbItems}
            ariaLabel={de ? 'Brotkrumen-Navigation' : 'Breadcrumb'}
          />
        </div>

        {/* Der Hero war bis 24.08.2026 drei Booster-Pack-Tüten. Die sind
            Produktfotos, keine Kategoriebilder — genau die Lesart „Shop", die
            auf der Startseite schon aus der Kategorien-Rail geflogen ist (siehe
            CategoriesRail.tsx). Hier trägt jetzt ebenfalls die Type. */}
        <header className={styles.indexHero}>
          <h1 className={styles.indexTitle}>{de ? 'Wonach ist dir?' : 'What are you craving?'}</h1>
          {/* Die Zahl kommt aus der Liste, nicht aus der Copy: sobald im Studio
              eine Kategorie dazukommt oder leerläuft, stand hier sonst eine
              falsche Behauptung. */}
          <p className={styles.indexLead}>
            {de
              ? `${categories.length} Richtungen, ein Prinzip: nur Adressen, für die wir geradestehen. Such dir eine aus.`
              : `${categories.length} directions, one rule: only addresses we vouch for. Take your pick.`}
          </p>
        </header>

        <section className={styles.categoriesBlock} aria-labelledby="category-catalog-title">
          <div className={styles.categoriesIntro}>
            <h2 id="category-catalog-title">{de ? 'Kategorie wählen' : 'Choose a category'}</h2>
          </div>

          <div className={styles.categoryRows}>
            {categories.map((c) => {
              // Kuratierte Spots führen das Regal an, aufgefüllt wird mit der
              // alphabetischen Auswahl. Vier von neun Kategorien sind im Studio
              // kuratiert; für die übrigen ist das Ergebnis exakt die
              // alphabetische Auswahl.
              const curated = (c.topSpotCards ?? []).filter((r) => r.isOpen !== false && r.photo);
              const spots = pickShelf(curated, c.exampleRestaurants, 4);
              const count = c.restaurantCount ?? 0;
              const label = localizedCategoryName(c, loc);
              const blurb = localizedCategoryBlurb(c, loc);

              return (
                <article key={c._id ?? c.slug} className={styles.categoryRow}>
                  <h3 className={styles.categoryName}>
                    <Link href={`/kategorie/${c.slug}`} className={styles.categoryLink}>
                      {label}
                    </Link>
                  </h3>

                  {blurb && <p className={styles.categoryBlurb}>{blurb}</p>}

                  {spots.length > 0 && (
                    <div className={sharedStyles.spotGrid}>
                      {spots.map((restaurant) => {
                        // Gleiche Karte wie auf dem Bezirks-Index: Küche als
                        // Chip, Preisspanne daneben. Rund ein Viertel der Spots
                        // hat keine gepflegte Spanne — dort fällt sie weg statt
                        // als leere Hülse dazustehen.
                        const priceLabel = formatPriceLabel(restaurant, locale);
                        return (
                          <Link
                            key={restaurant._id}
                            href={`/restaurant/${restaurant.slug}`}
                            className={sharedStyles.card}
                          >
                            {restaurant.photo && (
                              <div className={sharedStyles.cardPhoto}>
                                <Image
                                  src={restaurant.photo}
                                  alt=""
                                  fill
                                  sizes="(max-width: 1099px) 46vw, 248px"
                                />
                              </div>
                            )}
                            <div className={sharedStyles.cardBody}>
                              <h4 className={sharedStyles.cardName}>
                                {normalizeName(restaurant.name)}
                              </h4>
                              {(restaurant.cuisineType || priceLabel) && (
                                <div className={sharedStyles.cardMeta}>
                                  {restaurant.cuisineType && (
                                    <span className={sharedStyles.chipYellow}>
                                      {localizedCuisine(restaurant.cuisineType, loc)}
                                    </span>
                                  )}
                                  {priceLabel && (
                                    <span className={sharedStyles.price}>{priceLabel}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}

                  <Link href={`/kategorie/${c.slug}`} className={styles.categoryMore}>
                    {moreLabel(count, de)}
                    <span aria-hidden="true">→</span>
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}
