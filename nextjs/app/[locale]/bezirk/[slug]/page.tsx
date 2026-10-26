import { BRAND_WORDMARK } from '@/lib/constants';
import { notFound, permanentRedirect } from 'next/navigation';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import {
  getBezirkBySlug,
  getRestaurantsByBezirk,
  getAllBezirkeWithStats,
  getGuideTeaser,
} from '@/lib/sanity.server';
import { buildBezirkJsonLd } from '@/lib/json-ld';
import { OG_CARD_VERSION, SITE_URL } from '@/lib/constants';
import { INDEXABLE_ROBOTS, buildHreflangAlternates, toOgLocale } from '@/lib/seo/metadata';
import { buildPlainTitle, truncateMetadataDescription } from '@/lib/seo/metadata-text';
import { pickLocale, hasEnContent } from '@/lib/i18n/pickLocale';
import { routing } from '@/i18n/routing';
import { rankCurated } from '@/lib/curated-ranking';
import { bezirkCategoryLinks, bezirkGuideSlugs } from '@/lib/seo/crossLinks';
import type { RestaurantCard } from '@/lib/types';
import styles from '@/app/components/HubIssue.module.css';
import {
  IssueGuides,
  IssueSpots,
} from '@/app/components/HubIssue';
import DistrictHeader from '@/app/components/DistrictHeader';
import DistrictMapReturn from '@/app/components/DistrictMapReturn';
import DistrictPaperFooter from '@/app/components/DistrictPaperFooter';
import Image from '@/app/components/SiteImage';
import {
  HubFilterProvider,
  HubFilterBar,
  HubFilterGroup,
  HubFilterUnfiltered,
  SPOT_LIST_ID,
  type HubFacet,
} from '@/app/components/HubFilter';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

/** Die Kategorie-Slugs eines Spots — seine Facetten im Chip-Filter. */
const categorySlugsOf = (r: RestaurantCard) =>
  (r.categories ?? []).map((c) => c.slug).filter((s): s is string => Boolean(s));

// 24 Stunden. Die Frist ist nicht der Weg, auf dem Inhalte live gehen — das ist
// der Sanity-Webhook auf /api/revalidate. Hintergrund und Bedingung an dieser
// Zahl: SANITY_REVALIDATE_SECONDS in lib/constants.ts. Next verlangt hier einen
// statisch lesbaren Wert, deshalb die Zahl statt der Konstante.
export const revalidate = 86400;

export async function generateStaticParams() {
  const bezirke = await getAllBezirkeWithStats();
  // Empty districts too, although their page only redirects (see below): a
  // redirect Next renders on demand sends `location` twice on EN (Next 15.5),
  // which App Hosting joins to `/en/bezirk,/en/bezirk` — a 404. Prerendered,
  // the first request is a cache hit and carries one; so does every later
  // background revalidation (measured with revalidate=15, 07.10.2026).
  return routing.locales.flatMap((locale) => bezirke.map((b) => ({ locale, slug: b.slug })));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const b = await getBezirkBySlug(slug);
  if (!b) return {};
  const de = locale === 'de';
  const loc = de ? 'de' : 'en';

  // Brandlos in Sanity wie hier: die Bezirksseiten hängen keinen Marken-Suffix
  // an, siehe buildPlainTitle. Die 11 Zeichen gehen an den Titel selbst, damit
  // „Berlin" neben den Bezirksnamen passt — 491 der 506 Impressionen dieser
  // Seiten kommen auf Anfragen, die „Berlin" enthalten.
  const fallbackTitleDe = `Restaurants in Berlin-${b.name}`;
  const fallbackTitleEn = `Restaurants in Berlin-${b.name}`;
  const title = pickLocale(
    b.seo?.metaTitle || fallbackTitleDe,
    b.seo?.metaTitleEn || fallbackTitleEn,
    loc
  );

  const fallbackDescriptionDe = `Kuratierte Restaurant-Empfehlungen in ${b.name} (Berlin) — von Frühstück bis Dinner.`;
  const rawDescription = pickLocale(
    b.seo?.metaDescription || b.description || fallbackDescriptionDe,
    b.seo?.metaDescriptionEn || b.descriptionEn || undefined,
    loc
  );
  const description = rawDescription ? truncateMetadataDescription(rawDescription) : undefined;
  const pageTitle = buildPlainTitle(title ?? fallbackTitleDe);

  const image = `${SITE_URL}/pics/og-card.png?v=${OG_CARD_VERSION}`;

  const alternates = buildHreflangAlternates(`/bezirk/${slug}`, loc, {
    hasEnContent: hasEnContent(b),
  });

  return {
    title: { absolute: pageTitle },
    description,
    robots: b.seo?.noIndex ? 'noindex,nofollow' : INDEXABLE_ROBOTS,
    alternates,
    openGraph: {
      title: pageTitle,
      description,
      url: alternates.canonical,
      images: [{ url: image, width: 1200, height: 630, alt: b.name }],
      type: 'website',
      locale: toOgLocale(loc),
    },
  };
}

/** Erster Satz samt Satzzeichen; ohne Satzzeichen der ganze Text. */
function firstSentence(text: string): string {
  const match = text.match(/^.*?[.!?](?=\s|$)/);
  return (match ? match[0] : text).trim();
}

export default async function BezirkDetailPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const de = locale === 'de';
  const loc = de ? 'de' : 'en';

  const [b, restaurants, guides] = await Promise.all([
    getBezirkBySlug(slug),
    getRestaurantsByBezirk(slug),
    Promise.all(bezirkGuideSlugs(slug).map((s) => getGuideTeaser(s, loc))),
  ]);
  if (!b) notFound();
  // A district without spots renders the head around an empty grid —
  // dead end + thin content. Google knew nine such pages after the curation
  // of 27.09.2026, so they 301 to the district index rather than 404; the
  // page reappears automatically via ISR once a restaurant references the
  // bezirk (the sitemap drops it meanwhile, see sitemap-entries.ts).
  if (restaurants.length === 0) {
    permanentRedirect(locale === 'de' ? '/bezirk' : `/${locale}/bezirk`);
  }

  const bezirkDescription = pickLocale(b.description, b.descriptionEn, loc);
  // A concise Sanity introduction keeps the first recommendations close to the title.
  const heroLede = bezirkDescription ? firstSentence(bezirkDescription) : '';
  // Kuratierte Bestenliste aus dem Studio; ohne Pflege (oder unter
  // MIN_CURATED) fällt `top` leer aus und die Seite bleibt rein alphabetisch.
  const { top, rest } = rankCurated(restaurants, b.topSpots);
  const opening = top.length > 0 ? top : rest.slice(0, 3);
  const directory = top.length > 0 ? rest : rest.slice(3);

  // Ohne Limit: die Chip-Leiste braucht *jede* vertretene Kategorie, sonst
  // wären Karten hinter keinem Chip erreichbar. Die Statuszeilen entstehen
  // hier, weil nur die Seite weiß, wie der Satz herum läuft — „Kaffee in
  // Schöneberg", auf der Kategorieseite dagegen „Frühstück in Mitte".
  const categoryFilters: HubFacet[] = bezirkCategoryLinks(restaurants, loc, Infinity).map((c) => ({
    slug: c.slug,
    label: c.label,
    status: `${c.label} in ${b.name}`,
  }));
  /** Die Kategorie-Slugs einer Teilliste — entscheidet, ob ihre Sektion beim
   *  aktiven Filter überhaupt noch etwas zeigt. */
  const slugsIn = (list: RestaurantCard[]) => [...new Set(list.flatMap(categorySlugsOf))];

  const jsonLd = buildBezirkJsonLd({
    bezirk: b,
    // `position` im ItemList ist eine Rangbehauptung — Schema und Seite dürfen
    // sich nicht widersprechen, also exakt die Anzeigereihenfolge.
    restaurants: [...top, ...rest],
    locale,
    districtsLabel: de ? 'Bezirke' : 'Districts',
  });

  return (
    <>
      <script
        id={`schema-bezirk-${slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <main className={`${styles.page} ${styles.districtPage}`}>
        <DistrictHeader
          slug={slug}
          name={b.name}
          description={heroLede || ''}
          locale={loc}
        />

        <HubFilterProvider queryKey="cat" slugs={categoryFilters.map((c) => c.slug)}>
          {/* Filtert die Liste an Ort und Stelle. Bis 25.08.2026 stand hier
              eine Leiste aus Links auf die Kategorie-Hubs — die Geste versprach
              „Kaffee in Schöneberg" und lieferte „Kaffee in ganz Berlin". */}
          {categoryFilters.length > 1 && (
            <HubFilterBar
              facets={categoryFilters}
              allLabel={de ? 'Alle' : 'All'}
              allStatus={
                de
                  ? `Alle Spots in ${b.name}`
                  : `All spots in ${b.name}`
              }
              groupLabel={
                de ? `In ${b.name} nach Kategorie filtern` : `Filter ${b.name} by category`
              }
            />
          )}

          {/* Der Sprunganker nach einem Filterwechsel sitzt auf dieser Hülle,
              nicht auf einer Sektion: die Bestenliste kann komplett
              wegfiltern, und ein Anker in einer versteckten Gruppe scrollt
              nirgendwohin. */}
          <div id={SPOT_LIST_ID} className={styles.spotList}>
            <HubFilterGroup slugs={slugsIn(opening)}>
              <section>
                <h2 className={`${styles.secTitle} ${styles.favoritesTitle}`}>
                  {top.length > 0
                    ? <><Image {...BRAND_WORDMARK} alt="Eat This" sizes="(max-width: 767px) 124px, 150px" /><span>Favorites</span></>
                    : de
                      ? 'Wo du essen solltest'
                      : 'Where to eat'}
                </h2>
                <IssueSpots restaurants={opening} locale={loc} facetsOf={categorySlugsOf}
                  layout="district" />
              </section>
            </HubFilterGroup>

            <HubFilterUnfiltered>
              <IssueGuides guides={guides} locale={loc} interlude
                heading={de ? 'Ausführlich im Magazin' : 'In depth in the magazine'} />
            </HubFilterUnfiltered>

            {directory.length > 0 && (
              <HubFilterGroup slugs={slugsIn(directory)}>
                {/* Ohne eigene Überschrift: die übrigen Spots laufen als dieselben
                    grossen Karten weiter wie die Favorites. */}
                <section className={styles.moreSpots} aria-label={de ? 'Weitere Spots' : 'More spots'}>
                  <IssueSpots restaurants={directory} locale={loc} facetsOf={categorySlugsOf}
                    layout="district" />
                </section>
              </HubFilterGroup>
            )}
          </div>
        </HubFilterProvider>

      </main>
      <DistrictPaperFooter paperId={`district-paper-${loc}-${slug}`}>
        <DistrictMapReturn locale={loc} />
      </DistrictPaperFooter>
    </>
  );
}
