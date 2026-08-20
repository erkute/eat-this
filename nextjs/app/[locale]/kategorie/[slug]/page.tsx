import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getRestaurantsByCategory, getCategoryBySlug, getAllCategories } from '@/lib/sanity.server';
import { localizedCategoryName, localizedCategoryBlurb } from '@/lib/categories';
import {
  buildCategoryTitle,
  buildCategoryDescription,
  buildCategorySectionHeading,
  buildCategoryDirectoryHeading,
} from '@/lib/seo/categoryMeta';
import { rankCurated } from '@/lib/curated-ranking';
import type { RestaurantCard } from '@/lib/types';
import { buildKategorieQuickFacts, buildKategorieFAQEntries } from '@/lib/kategorie-prose';
import { categoryDistrictLinks } from '@/lib/seo/crossLinks';
import { formatPriceLabel } from '@/app/components/map/restaurantDetail.helpers';
import { serializeJsonLd } from '@/lib/json-ld';
import { SITE_URL } from '@/lib/constants';
import { localeUrl } from '@/lib/locale-url';
import { buildHreflangAlternates, toOgLocale } from '@/lib/seo/metadata';
import { buildBrandedTitle } from '@/lib/seo/metadata-text';
import { routing } from '@/i18n/routing';
import { pickLocale } from '@/lib/i18n/pickLocale';
import { sanitySrcSet } from '@/lib/sanity-image-presets';
import sharedStyles from '../../bezirk/Bezirk.module.css';
import styles from '../Kategorie.module.css';
import Breadcrumbs, { type BreadcrumbItem } from '@/app/components/Breadcrumbs';
import MapPromoCTA from '@/app/components/MapPromoCTA';
import KategorieBoost from '@/app/components/KategorieBoost';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

// Square (1:1) pack-card social images so Google's square SERP thumbnail
// shows the FULL packet (padded on brand yellow) instead of center-cropping
// the portrait booster art and cutting off the bottom. One per category slug;
// bump the version to force re-fetch by Google/social caches.
const PACK_OG_SLUGS = new Set([
  'breakfast',
  'coffee',
  'dinner',
  'drinks',
  'fast-food',
  'fine-dining',
  'lunch',
  'pizza',
  'sweets',
]);
const PACK_OG_VERSION = 2;

export const revalidate = 3600;

/**
 * Ein Kartenraster. `ranked` blendet die Platzziffer ein — nur die kuratierte
 * Bestenliste trägt sie, das A–Z-Verzeichnis darunter nicht.
 */
function RestaurantGrid({
  restaurants,
  locale,
  ranked = false,
}: {
  restaurants: RestaurantCard[];
  locale: 'de' | 'en';
  ranked?: boolean;
}) {
  return (
    <div
      className={`${sharedStyles.grid} ${restaurants.length <= 2 ? sharedStyles.gridCompact : ''}`}
    >
      {restaurants.map((r, i) => {
        const priceLabel = formatPriceLabel(r);
        const cardLine =
          pickLocale(r.shortDescription, r.shortDescriptionEn, locale) ||
          pickLocale(r.tip, r.tipEn, locale);
        return (
          <Link key={r._id} href={`/restaurant/${r.slug}`} className={sharedStyles.card}>
            {r.photo && (
              <div className={sharedStyles.cardPhoto}>
                {/* Sanity already serves transformed WebP/AVIF. A compact
                    three-width srcset avoids Next serialising its large
                    global candidate list for every card on long pages. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={r.photo}
                  alt={r.name}
                  srcSet={sanitySrcSet(r.photo, [480, 800, 1200])}
                  sizes="(max-width: 719px) 100vw, (max-width: 959px) 50vw, 34vw"
                  loading="lazy"
                  decoding="async"
                />
                {ranked && (
                  <span className={sharedStyles.rankBadge} aria-hidden="true">
                    {i + 1}
                  </span>
                )}
              </div>
            )}
            <div className={sharedStyles.cardBody}>
              <h3 className={sharedStyles.cardName}>
                {/* Ohne Foto gibt es keinen Badge — dann trägt die Ziffer der Name. */}
                {ranked && !r.photo && <span className={sharedStyles.rankInline}>{i + 1}.</span>}
                {r.name}
              </h3>
              <div className={sharedStyles.cardMeta}>
                {r.cuisineType && <span className={sharedStyles.chipYellow}>{r.cuisineType}</span>}
                {r.district && <span className={styles.districtLabel}>{r.district}</span>}
                {priceLabel && <span className={sharedStyles.price}>{priceLabel}</span>}
              </div>
              {cardLine && <p className={sharedStyles.cardTip}>{cardLine}</p>}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export async function generateStaticParams() {
  const cats = await getAllCategories();
  return routing.locales.flatMap((locale) => cats.map((c) => ({ locale, slug: c.slug })));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const [c, restaurants] = await Promise.all([
    getCategoryBySlug(slug),
    getRestaurantsByCategory(slug),
  ]);
  if (!c) return {};
  const de = locale === 'de';
  const loc = de ? 'de' : 'en';
  const label = localizedCategoryName(c, loc);
  // Brandloser Suchbegriff; buildBrandedTitle ergänzt den kompakten Brand.
  // Suchsprache statt Katalog-Label: „Die beste Pizza in Berlin".
  const title = buildCategoryTitle(slug, label, loc);
  const description = buildCategoryDescription({
    blurb: localizedCategoryBlurb(c, loc),
    restaurants,
    locale: loc,
  });
  const brandedTitle = buildBrandedTitle(title);
  const image = PACK_OG_SLUGS.has(slug)
    ? `${SITE_URL}/pics/og/og_${slug}.png?v=${PACK_OG_VERSION}`
    : `${SITE_URL}/pics/og-card.png?v=4`;
  const alternates = buildHreflangAlternates(`/kategorie/${slug}`, de ? 'de' : 'en');
  return {
    title: { absolute: brandedTitle },
    description,
    alternates,
    openGraph: {
      title: brandedTitle,
      description,
      url: alternates.canonical,
      type: 'website',
      locale: toOgLocale(de ? 'de' : 'en'),
      images: [
        {
          url: image,
          width: 1200,
          height: 1200,
          alt: `${label} Pack — Eat This Berlin`,
        },
      ],
    },
  };
}

export default async function KategorieDetailPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const de = locale === 'de';
  const loc = de ? 'de' : 'en';

  const [c, restaurants] = await Promise.all([
    getCategoryBySlug(slug),
    getRestaurantsByCategory(slug),
  ]);
  if (!c) notFound();
  const label = localizedCategoryName(c, loc);
  const blurb = localizedCategoryBlurb(c, loc);
  // Kuratierte Bestenliste oben, vollständiges A–Z darunter. Ohne gepflegte
  // `topSpots` ist `top` leer und die Seite rendert wie bisher eine Liste.
  const { top, rest } = rankCurated(restaurants, c.topSpots);
  // Anzeigereihenfolge = JSON-LD-Reihenfolge: `position` ist eine
  // Rangbehauptung, Schema und Seite dürfen sich nicht widersprechen.
  const orderedRestaurants = [...top, ...rest];
  const quickFacts = buildKategorieQuickFacts({ slug, label, restaurants, locale: loc });
  const districtLinks = categoryDistrictLinks(restaurants);
  // `curated: top` statt der Slugs: die FAQ nennt damit exakt die Namen der
  // Bestenliste über ihr — auseinanderlaufen können sie nicht mehr.
  const faqEntries = buildKategorieFAQEntries({
    slug,
    label,
    restaurants,
    locale: loc,
    curated: top,
  });

  const breadcrumbItems: BreadcrumbItem[] = [
    { name: de ? 'Start' : 'Home', href: '/', logo: 'eat-this' },
    { name: de ? 'Kategorien' : 'Categories', href: '/kategorie' },
    { name: label },
  ];

  const restaurantUrl = (rSlug: string) => `/restaurant/${rSlug}`;
  const bezirkUrl = (bSlug: string) => `/bezirk/${bSlug}`;

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
          {
            '@type': 'ListItem',
            position: 3,
            name: label,
            item: localeUrl(locale, `/kategorie/${slug}`),
          },
        ],
      },
      ...(faqEntries.length > 0
        ? [
            {
              '@type': 'FAQPage',
              mainEntity: faqEntries.map((entry) => ({
                '@type': 'Question',
                name: entry.question,
                acceptedAnswer: { '@type': 'Answer', text: entry.answer },
              })),
            },
          ]
        : []),
      {
        '@type': 'ItemList',
        name: buildCategoryTitle(slug, label, loc),
        numberOfItems: orderedRestaurants.length,
        itemListElement: orderedRestaurants.map((r, i) => {
          const priceLabel = formatPriceLabel(r);
          return {
            '@type': 'ListItem',
            position: i + 1,
            item: {
              '@type': 'Restaurant',
              name: r.name,
              url: localeUrl(locale, restaurantUrl(r.slug)),
              ...(r.cuisineType && { servesCuisine: r.cuisineType }),
              ...(priceLabel && { priceRange: priceLabel }),
            },
          };
        }),
      },
    ],
  });

  return (
    <>
      <script
        id={`schema-kategorie-${slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <main className={`${sharedStyles.page} ${sharedStyles.bezirkDetail} ${styles.detailPage}`}>
        <div className={styles.breadcrumbWrap}>
          <Breadcrumbs
            items={breadcrumbItems}
            ariaLabel={de ? 'Brotkrumen-Navigation' : 'Breadcrumb'}
          />
        </div>

        <header className={styles.detailHero}>
          <div className={styles.detailHeroCopy}>
            <div className={styles.kicker}>{de ? 'Kategorie' : 'Category'}</div>
            <h1 className={styles.detailTitle}>{label}</h1>
            <p className={styles.detailLead}>
              {blurb || (de ? 'Die besten Spots in Berlin.' : 'The best spots in Berlin.')}
            </p>
            {quickFacts && <p className={styles.quickFacts}>{quickFacts}</p>}
            <div className={sharedStyles.detailHeroActions}>
              <MapPromoCTA
                variant="chip"
                kind="kategorie"
                name={label}
                mapHref={`/map?cat=${slug}`}
                locale={loc}
              />
            </div>
          </div>
        </header>

        <KategorieBoost categorySlug={c.slug} categoryName={label} locale={loc} />

        {districtLinks.length > 0 && (
          <nav
            className={sharedStyles.crossLinks}
            aria-label={de ? `${label} nach Bezirk` : `${label} by district`}
          >
            <span className={sharedStyles.crossLinksHead}>
              {de ? `${label} nach Bezirk:` : `${label} by district:`}
            </span>
            {districtLinks.map((b) => (
              <Link key={b.slug} href={bezirkUrl(b.slug)} className={sharedStyles.crossLink}>
                {b.label}
              </Link>
            ))}
          </nav>
        )}

        <section id="restaurants" className={sharedStyles.restaurantSection}>
          <div className={sharedStyles.sectionHead}>
            {/* Trägt die Ziel-Query im Klartext — die H1 darüber ist auf ein
                einzelnes Display-Wort designt („LUNCH") und kann das nicht. */}
            <h2>{buildCategorySectionHeading(slug, label, loc)}</h2>
            <p>
              {top.length > 0
                ? de
                  ? `Die ${top.length} besten, ausgewählt vom Eat-This-Team.`
                  : `The top ${top.length}, picked by the Eat This team.`
                : de
                  ? 'Kuratiert vom Eat-This-Team.'
                  : 'Curated by the Eat This team.'}
            </p>
          </div>

          <RestaurantGrid
            restaurants={top.length > 0 ? top : rest}
            locale={loc}
            ranked={top.length > 0}
          />
        </section>

        {/* Vollständiges Verzeichnis — nur als eigene Sektion, wenn oben eine
            Bestenliste steht. Bewusst nicht paginiert: die internen Links sind
            der Crawl-Pfad zu den Restaurant-Detailseiten. */}
        {top.length > 0 && rest.length > 0 && (
          <section
            id="alle"
            className={`${sharedStyles.restaurantSection} ${sharedStyles.directorySection}`}
          >
            <div className={sharedStyles.sectionHead}>
              {/* Kein Unterzeilen-Text: Linie und Abstand darüber machen den
                  Schnitt schon deutlich, und die Zeile stand rechts oben in
                  der Luft. */}
              <h2>{buildCategoryDirectoryHeading(loc)}</h2>
            </div>

            <RestaurantGrid restaurants={rest} locale={loc} />
          </section>
        )}

        <div className={sharedStyles.detailMapCta}>
          <MapPromoCTA kind="kategorie" name={label} mapHref={`/map?cat=${slug}`} locale={loc} />
        </div>

        {faqEntries.length > 0 && (
          <section className={sharedStyles.faq} aria-label={de ? 'Häufige Fragen' : 'FAQ'}>
            <h2 className={sharedStyles.faqTitle}>{de ? 'Häufige Fragen' : 'Frequently asked'}</h2>
            <div className={sharedStyles.faqList}>
              {faqEntries.map((entry, i) => (
                <details key={i} className={sharedStyles.faqRow}>
                  <summary>
                    <span className={sharedStyles.faqQ}>{entry.question}</span>
                    <span className={sharedStyles.faqPlus} aria-hidden="true" />
                  </summary>
                  <p className={sharedStyles.faqA}>{entry.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
