import { notFound } from 'next/navigation';
import Image from '@/app/components/SiteImage';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import {
  getRestaurantsByCategory,
  getCategoryBySlug,
  getAllCategories,
  getAllCategoriesWithStats,
  getGuideTeaser,
} from '@/lib/sanity.server';
import { localizedCategoryName, localizedCategoryBlurb } from '@/lib/categories';
import {
  buildCategoryTitle,
  buildCategoryDescription,
  buildCategorySectionHeading,
  buildCategoryDirectoryHeading,
} from '@/lib/seo/categoryMeta';
import { rankCurated, shelfPhoto } from '@/lib/curated-ranking';
import type { RestaurantCard } from '@/lib/types';
import { buildKategorieFAQEntries } from '@/lib/kategorie-prose';
import { categoryDistrictLinks, categoryGuideSlugs } from '@/lib/seo/crossLinks';
import { formatPriceLabel } from '@/app/components/map/restaurantDetail.helpers';
import { buildWebPageNodes, serializeJsonLd } from '@/lib/json-ld';
import { schemaImageUrl } from '@/lib/sanity-image-presets';
import { BRAND_LOGO_SRC, OG_CARD_VERSION, OG_PACK_VERSION, SITE_URL } from '@/lib/constants';
import { localeUrl } from '@/lib/locale-url';
import { buildHreflangAlternates, toOgLocale } from '@/lib/seo/metadata';
import { metadataSource } from '@/lib/seo/metadataSource';
import { buildBrandedTitle } from '@/lib/seo/metadata-text';
import { routing } from '@/i18n/routing';
import styles from '@/app/components/HubIssue.module.css';
import {
  IssueContents,
  IssueFaq,
  IssueGuides,
  IssueRegister,
  IssueSiblings,
  IssueSpots,
  latestMonth,
} from '@/app/components/HubIssue';
import MapIntentLink from '@/app/components/MapIntentLink';
import {
  HubFilterProvider,
  HubFilterBar,
  HubFilterGroup,
  HubFilterUnfiltered,
  SPOT_LIST_ID,
  type HubFacet,
} from '@/app/components/HubFilter';
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

/** Siehe CARD_LIMIT auf der Bezirksseite: ohne Bestenliste Karten nur bis zu
 *  so vielen Spots, darüber Zeilen. */
const CARD_LIMIT = 12;

/** Der Bezirks-Slug eines Spots — seine Facette im Chip-Filter. */
const districtSlugsOf = (r: RestaurantCard) => (r.bezirk?.slug ? [r.bezirk.slug] : []);

export async function generateStaticParams() {
  const cats = await getAllCategories();
  return routing.locales.flatMap((locale) => cats.map((c) => ({ locale, slug: c.slug })));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  // Beide Lesevorgänge zusammen absichern: die Beschreibung zählt die Spots,
  // eine halbe Antwort wäre eine falsche Zahl statt einer fehlenden.
  const data = await metadataSource(() =>
    Promise.all([getCategoryBySlug(slug), getRestaurantsByCategory(slug)])
  );
  if (!data) return {};
  const [c, restaurants] = data;
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
  // Mit Zahlen und Regal wie auf /kategorie: der Ausgang unten zeigt je
  // Kategorie ein Foto und lässt leere weg. Derselbe Data-Cache-Eintrag wie
  // die Übersicht.
  const [c, restaurants, guides, alleKategorien] = await Promise.all([
    getCategoryBySlug(slug),
    getRestaurantsByCategory(slug),
    Promise.all(guideSlugs.map((s) => getGuideTeaser(s, loc))),
    getAllCategoriesWithStats(),
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
  const districtSlugsIn = (list: RestaurantCard[]) => [...new Set(list.flatMap(districtSlugsOf))];
  const lead = top.length > 0 ? top : rest;
  const leadAsCards = top.length > 0 || rest.length <= CARD_LIMIT;
  const updated = latestMonth(restaurants, loc);
  // `curated: top` statt der Slugs: die FAQ nennt damit exakt die Namen der
  // Bestenliste über ihr — auseinanderlaufen können sie nicht mehr.
  const faqEntries = buildKategorieFAQEntries({
    slug,
    label,
    restaurants,
    locale: loc,
    curated: top,
  });

  const takenPhotos = new Set<string>();
  const nachbarKategorien = alleKategorien
    .filter((x) => x.slug && x.slug !== slug && (x.restaurantCount ?? 0) > 0)
    .map((x) => ({
      slug: x.slug,
      label: localizedCategoryName(x, loc),
      photo: shelfPhoto(x, takenPhotos),
    }));

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
      <main className={styles.page}>
        <header className={styles.head}>
          <p className={styles.kicker}>{de ? 'Kategorie' : 'Category'}</p>
          {/* „Lunch" allein trifft weder „lunch berlin" noch „mittagessen
              berlin". Der Zusatz steht in der H1, optisch klein unter dem
              Namen; das Leerzeichen trennt beide im Text der H1. */}
          <h1 className={styles.title}>
            <span className={styles.name}>{label}</span>{' '}
            <span className={styles.post}>in Berlin</span>
          </h1>
          <p className={styles.credits}>
            <span>{de ? 'Von Eat This kuratiert' : 'Curated by Eat This'}</span>
            {updated && <span>{de ? `Stand ${updated}` : `Updated ${updated}`}</span>}
          </p>
        </header>

        {leadAsCards && <IssueContents restaurants={lead} label={de ? 'Die Spots' : 'The spots'} />}

        <p className={styles.lede}>
          {blurb || (de ? 'Die besten Spots in Berlin.' : 'The best spots in Berlin.')}
        </p>
        <div className={styles.actions}>
          <MapIntentLink
            href={`/map?cat=${slug}`}
            rel="nofollow"
            className={styles.btn}
            aria-label={de ? `${label} auf der Map öffnen` : `Open ${label} on the map`}
          >
            {de ? 'Zur Map' : 'On the map'}
          </MapIntentLink>
        </div>

        <HubFilterProvider queryKey="bezirk" slugs={districtFilters.map((b) => b.slug)}>
          {/* Spiegelbild der Kategorie-Zeile auf den Bezirksseiten. Bis
              25.08.2026 stand hier eine Reihe Links auf die Bezirks-Hubs — sie
              versprach „Frühstück in Mitte" und lieferte „alle Spots in Mitte". */}
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

          {/* Der Sprunganker nach einem Filterwechsel sitzt auf dieser Hülle,
              nicht auf einer Sektion: die Bestenliste kann komplett
              wegfiltern, und ein Anker in einer versteckten Gruppe scrollt
              nirgendwohin. */}
          <div id={SPOT_LIST_ID} className={styles.spotList}>
            <HubFilterGroup slugs={districtSlugsIn(lead)}>
              <section>
                {/* Trägt die Ziel-Query im Klartext — die H1 ist auf den
                    Kategorienamen gebaut. */}
                <h2 className={styles.secTitle}>{buildCategorySectionHeading(slug, label, loc)}</h2>
                {/* „Die 6 besten" zählt die ganze Kategorie. Sobald ein
                    Bezirksfilter zwei davon übrig lässt, stimmt die Zahl nicht
                    mehr — die Zeile fällt dann weg statt zu lügen. Die Marke
                    als Logo, nicht als gesetzter Text; `alt` trägt den Namen. */}
                <HubFilterUnfiltered>
                  <p className={styles.secNote}>
                    {top.length > 0
                      ? de
                        ? `Die ${top.length} besten, ausgewählt von`
                        : `The top ${top.length}, picked by`
                      : de
                        ? 'Kuratiert von'
                        : 'Curated by'}
                    {/* Rund 20px hoch; `sizes` trifft dieselbe 256er-Stufe wie
                        das Logo in der SiteNav, die schon im Cache liegt. */}
                    <Image
                      src={BRAND_LOGO_SRC}
                      alt="Eat This"
                      width={1660}
                      height={667}
                      sizes="64px"
                      className={styles.inlineLogo}
                    />
                  </p>
                </HubFilterUnfiltered>
                {leadAsCards ? (
                  <IssueSpots
                    restaurants={lead}
                    locale={loc}
                    facetsOf={districtSlugsOf}
                    showDistrict
                  />
                ) : (
                  <IssueRegister
                    restaurants={lead}
                    locale={loc}
                    facetsOf={districtSlugsOf}
                    showDistrict
                  />
                )}
              </section>
            </HubFilterGroup>

            {/* Das Pack NACH der Bestenliste, nicht davor: auf dem Telefon schob
              es den ersten Spot bis 25.09.2026 unter die Falz — die Seite
              begann mit einer Werbung statt mit ihrer Antwort. Gefiltert tritt
              es ab: dann zählen nur die Treffer. */}
            <HubFilterUnfiltered>
              <div className={styles.boost}>
                <KategorieBoost categorySlug={c.slug} categoryName={label} locale={loc} />
              </div>
            </HubFilterUnfiltered>

            {/* Vollständiges Verzeichnis — nur als eigene Sektion, wenn oben eine
              Bestenliste steht. Bewusst nicht paginiert: die internen Links sind
              der Crawl-Pfad zu den Restaurant-Detailseiten. */}
            {top.length > 0 && rest.length > 0 && (
              <HubFilterGroup slugs={districtSlugsIn(rest)}>
                <section id="alle">
                  <h2 className={styles.secTitle}>{buildCategoryDirectoryHeading(loc)}</h2>
                  <IssueRegister
                    restaurants={rest}
                    locale={loc}
                    facetsOf={districtSlugsOf}
                    showDistrict
                  />
                </section>
              </HubFilterGroup>
            )}
          </div>
        </HubFilterProvider>

        {/* Siehe categoryGuideSlugs — die Zuordnung Hub → Guide. */}
        <IssueGuides
          guides={guides}
          locale={loc}
          heading={de ? 'Ausführlich im Magazin' : 'In depth in the magazine'}
        />

        <IssueFaq entries={faqEntries} heading={de ? 'Häufige Fragen' : 'Frequently asked'} />

        {/* Zuletzt der Ausgang: wer unten ankommt, fragt „und was noch?". */}
        <IssueSiblings
          items={nachbarKategorien}
          base="/kategorie"
          heading={de ? 'Andere Kategorien' : 'Other categories'}
          label={de ? 'Weitere Kategorien' : 'More categories'}
        />
      </main>
    </>
  );
}
