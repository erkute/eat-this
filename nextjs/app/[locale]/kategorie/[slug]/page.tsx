import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import {
  getRestaurantsByCategory,
  getCategoryBySlug,
  getAllCategories,
  getGuideTeaser,
} from '@/lib/sanity.server';
import { localizedCategoryName, localizedCategoryBlurb } from '@/lib/categories';
import { localizedCuisine } from '@/lib/cuisineLabels';
import {
  buildCategoryTitle,
  buildCategoryDescription,
  buildCategorySectionHeading,
  buildCategoryDirectoryHeading,
} from '@/lib/seo/categoryMeta';
import { rankCurated } from '@/lib/curated-ranking';
import type { RestaurantCard } from '@/lib/types';
import { buildKategorieFAQEntries } from '@/lib/kategorie-prose';
import { categoryDistrictLinks, categoryGuideSlugs } from '@/lib/seo/crossLinks';
import { formatPriceLabel } from '@/app/components/map/restaurantDetail.helpers';
import { buildWebPageNodes, serializeJsonLd } from '@/lib/json-ld';
import { schemaImageUrl } from '@/lib/sanity-image-presets';
import { OG_CARD_VERSION, OG_PACK_VERSION, SITE_URL } from '@/lib/constants';
import { localeUrl } from '@/lib/locale-url';
import { buildHreflangAlternates, toOgLocale } from '@/lib/seo/metadata';
import { buildBrandedTitle } from '@/lib/seo/metadata-text';
import { routing } from '@/i18n/routing';
import { pickLocale } from '@/lib/i18n/pickLocale';
import { sanitySrcSet } from '@/lib/sanity-image-presets';
import sharedStyles from '../../bezirk/Bezirk.module.css';
import styles from '../Kategorie.module.css';
import HubSiblings from '@/app/components/HubSiblings';
import GuideCrossLinks from '@/app/components/GuideCrossLinks';
import {
  HubFilterProvider,
  HubFilterBar,
  HubFilterCard,
  HubFilterGroup,
  HubFilterUnfiltered,
  SPOT_LIST_ID,
  type HubFacet,
} from '@/app/components/HubFilter';
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

// 24 Stunden. Die Frist ist nicht der Weg, auf dem Inhalte live gehen — das ist
// der Sanity-Webhook auf /api/revalidate. Hintergrund und Bedingung an dieser
// Zahl: SANITY_REVALIDATE_SECONDS in lib/constants.ts. Next verlangt hier einen
// statisch lesbaren Wert, deshalb die Zahl statt der Konstante.
export const revalidate = 86400;

/**
 * Das Bild, das diese Seite nach außen vertritt — Pack-Card plus Wortmarke auf
 * Markengelb. Eine Quelle für Open Graph *und* `primaryImageOfPage`: beide
 * beschreiben dieselbe Sache, und solange sie auseinanderliefen, zeigte die
 * Link-Vorschau das Pack und Googles Seitenbild ein beliebiges Restaurantfoto.
 */
function categorySocialImage(slug: string): string {
  return PACK_OG_SLUGS.has(slug)
    ? `${SITE_URL}/pics/og/og_${slug}.png?v=${OG_PACK_VERSION}`
    : `${SITE_URL}/pics/og-card.png?v=${OG_CARD_VERSION}`;
}

/**
 * Ein Kartenraster. `ranked` blendet die Platzziffer ein — nur die kuratierte
 * Bestenliste trägt sie, das A–Z-Verzeichnis darunter nicht. `eagerFirst`
 * nimmt dem ersten Foto das Lazy-Loading: auf einer Seite ohne eigenes
 * Bannerbild ist es das Leitbild, und ein Bild, das erst beim Scrollen lädt,
 * liest sich weder für den LCP noch für Googles Thumbnail-Wahl als eines.
 */
function RestaurantGrid({
  restaurants,
  locale,
  ranked = false,
  eagerFirst = false,
}: {
  restaurants: RestaurantCard[];
  locale: 'de' | 'en';
  ranked?: boolean;
  eagerFirst?: boolean;
}) {
  // Not simply index 0: the first spot may have no publishable photo, and
  // then the lead picture is the next card that does have one.
  const leadPhotoIndex = eagerFirst ? restaurants.findIndex((r) => r.photo) : -1;
  return (
    <div
      className={`${sharedStyles.grid} ${restaurants.length <= 2 ? sharedStyles.gridCompact : ''}`}
    >
      {restaurants.map((r, i) => {
        const priceLabel = formatPriceLabel(r, locale);
        const cardLine =
          pickLocale(r.shortDescription, r.shortDescriptionEn, locale) ||
          pickLocale(r.tip, r.tipEn, locale);
        return (
          <HubFilterCard key={r._id} slugs={r.bezirk?.slug ? [r.bezirk.slug] : []}>
            <Link href={`/restaurant/${r.slug}`} className={sharedStyles.card}>
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
                    loading={i === leadPhotoIndex ? 'eager' : 'lazy'}
                    fetchPriority={i === leadPhotoIndex ? 'high' : undefined}
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
                  {r.cuisineType && (
                    <span className={sharedStyles.chipYellow}>
                      {localizedCuisine(r.cuisineType, locale)}
                    </span>
                  )}
                  {r.district && <span className={styles.districtLabel}>{r.district}</span>}
                  {priceLabel && <span className={sharedStyles.price}>{priceLabel}</span>}
                </div>
                {cardLine && <p className={sharedStyles.cardTip}>{cardLine}</p>}
              </div>
            </Link>
          </HubFilterCard>
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
  const image = categorySocialImage(slug);
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
          height: 630,
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

  const guideSlugs = categoryGuideSlugs(slug);
  // `getAllCategories` läuft für diese Route schon in `generateStaticParams`
  // — derselbe Aufruf trifft den Data-Cache-Eintrag und kostet keine
  // zusätzliche Sanity-Anfrage.
  const [c, restaurants, guides, alleKategorien] = await Promise.all([
    getCategoryBySlug(slug),
    getRestaurantsByCategory(slug),
    Promise.all(guideSlugs.map((s) => getGuideTeaser(s, loc))),
    getAllCategories(),
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
  // Ohne Limit: die Chip-Leiste braucht *jeden* vertretenen Bezirk, sonst wären
  // Karten hinter keinem Chip erreichbar. Der Satz läuft hier andersherum als
  // auf den Bezirksseiten — die Facette ist der Bezirk, benannt wird trotzdem
  // „Kategorie in Bezirk".
  const spotWord = (n: number) => (de ? (n === 1 ? 'Spot' : 'Spots') : n === 1 ? 'spot' : 'spots');
  const districtFilters: HubFacet[] = categoryDistrictLinks(restaurants, Infinity).map((b) => ({
    slug: b.slug,
    label: b.label,
    status: `${label} in ${b.label} · ${b.count} ${spotWord(b.count)}`,
  }));
  /** Die Bezirks-Slugs einer Teilliste — entscheidet, ob ihre Sektion beim
   *  aktiven Filter überhaupt noch etwas zeigt. */
  const districtSlugsIn = (list: RestaurantCard[]) => [
    ...new Set(list.map((r) => r.bezirk?.slug).filter((s): s is string => Boolean(s))),
  ];
  // `curated: top` statt der Slugs: die FAQ nennt damit exakt die Namen der
  // Bestenliste über ihr — auseinanderlaufen können sie nicht mehr.
  const faqEntries = buildKategorieFAQEntries({
    slug,
    label,
    restaurants,
    locale: loc,
    curated: top,
  });

  const nachbarKategorien = alleKategorien
    .filter((x) => x.slug && x.slug !== slug)
    .map((x) => ({ slug: x.slug, label: localizedCategoryName(x, loc) }));

  const restaurantUrl = (rSlug: string) => `/restaurant/${rSlug}`;

  const jsonLd = serializeJsonLd({
    '@context': 'https://schema.org',
    '@graph': [
      // Die Pack-Card, nicht das erste Restaurantfoto. Bis hierher war das
      // Seitenbild ein beliebiger Spot aus der Liste — bei jedem Re-Crawl
      // potenziell ein anderer, und keiner davon stellt die Kategorie dar.
      // Dieselbe Grafik liegt schon auf Open Graph; die Seite vertritt sich
      // damit überall gleich.
      ...buildWebPageNodes({
        pageUrl: localeUrl(locale, `/kategorie/${slug}`),
        locale: loc,
        image: categorySocialImage(slug),
        caption: buildCategoryTitle(slug, label, loc),
      }),
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
          const priceLabel = formatPriceLabel(r, loc);
          return {
            '@type': 'ListItem',
            position: i + 1,
            item: {
              '@type': 'Restaurant',
              name: r.name,
              url: localeUrl(locale, restaurantUrl(r.slug)),
              // Licence-gated like the bezirk list — see lib/json-ld/bezirk.ts.
              ...(r.photo && { image: schemaImageUrl(r.photo) }),
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
        <header className={styles.detailHero}>
          <div className={styles.detailHeroCopy}>
            <div className={styles.kicker}>{de ? 'Kategorie' : 'Category'}</div>
            {/* "Lunch" alone was no match for "lunch berlin" / "mittagessen
                berlin". The suffix rides inside the h1 so the heading reads
                "Lunch in Berlin" while the label stays the big display word. */}
            <h1 className={styles.detailTitle}>
              {label}
              <span className={styles.detailTitleSuffix}>in Berlin</span>
            </h1>
            <p className={styles.detailLead}>
              {blurb || (de ? 'Die besten Spots in Berlin.' : 'The best spots in Berlin.')}
            </p>
          </div>
        </header>

        <KategorieBoost categorySlug={c.slug} categoryName={label} locale={loc} />

        <HubFilterProvider queryKey="bezirk" slugs={districtFilters.map((b) => b.slug)}>
          {/* Spiegelbild der Kategorie-Leiste auf den Bezirksseiten. Bis
              25.08.2026 stand hier eine Reihe Links auf die Bezirks-Hubs — sie
              versprach „Frühstück in Mitte" und lieferte „alle Spots in Mitte",
              von wo aus die Kategorie-Leiste wieder hierher zurückwies. */}
          {districtFilters.length > 1 && (
            <HubFilterBar
              facets={districtFilters}
              allLabel={de ? 'Alle' : 'All'}
              allStatus={
                de
                  ? `Alle ${restaurants.length} Spots in Berlin`
                  : `All ${restaurants.length} spots across Berlin`
              }
              groupLabel={de ? `${label} nach Bezirk filtern` : `Filter ${label} by district`}
            />
          )}

          <HubFilterGroup slugs={districtSlugsIn(top.length > 0 ? top : rest)}>
            <section id={SPOT_LIST_ID} className={sharedStyles.restaurantSection}>
              <div className={sharedStyles.sectionHead}>
                {/* Trägt die Ziel-Query im Klartext — die H1 darüber ist auf ein
                    einzelnes Display-Wort designt („LUNCH") und kann das nicht. */}
                <h2>{buildCategorySectionHeading(slug, label, loc)}</h2>
                {/* Die Marke steht hier als Logo, nicht als gesetzter Text — die
                    Wortmarke ist gezeichnet, jede Nachbildung in Providence bleibt
                    eine Näherung. `alt` trägt den Namen weiter, Vorleser und
                    Suchmaschinen lesen den Satz also unverändert. */}
                {/* „Die 6 besten" zählt die ganze Kategorie. Sobald ein
                    Bezirksfilter davon zwei übrig lässt, stimmt die Zahl nicht
                    mehr — die Zeile fällt dann weg statt zu lügen. */}
                <HubFilterUnfiltered>
                  <p>
                    {top.length > 0
                      ? de
                        ? `Die ${top.length} besten, ausgewählt von `
                        : `The top ${top.length}, picked by `
                      : de
                        ? 'Kuratiert von '
                        : 'Curated by '}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/pics/eat-this-logo.webp?v=6"
                      alt="Eat This"
                      className={styles.inlineLogo}
                    />
                  </p>
                </HubFilterUnfiltered>
              </div>

              <RestaurantGrid
                restaurants={top.length > 0 ? top : rest}
                locale={loc}
                ranked={top.length > 0}
                // Die Kategorieseite hat kein Bannerbild — das erste Kartenfoto
                // ist das größte Bild im ersten Viewport und damit der LCP-
                // Kandidat. (Das Seitenbild im JSON-LD ist es nicht, das ist die
                // Pack-Card.)
                eagerFirst
              />
            </section>
          </HubFilterGroup>

          {/* Vollständiges Verzeichnis — nur als eigene Sektion, wenn oben eine
              Bestenliste steht. Bewusst nicht paginiert: die internen Links sind
              der Crawl-Pfad zu den Restaurant-Detailseiten. */}
          {top.length > 0 && rest.length > 0 && (
            <HubFilterGroup slugs={districtSlugsIn(rest)}>
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
            </HubFilterGroup>
          )}
        </HubFilterProvider>

        {/* Siehe categoryGuideSlugs — die Zuordnung Hub → Guide. */}
        <GuideCrossLinks guides={guides} locale={loc} />

        <div className={sharedStyles.detailMapCta}>
          <MapPromoCTA kind="kategorie" name={label} mapHref={`/map?cat=${slug}`} locale={loc} />
        </div>

        <HubSiblings
          items={nachbarKategorien}
          base="/kategorie"
          heading={de ? 'Andere Kategorien' : 'Other categories'}
          ariaLabel={de ? 'Weitere Kategorien' : 'More categories'}
        />

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
