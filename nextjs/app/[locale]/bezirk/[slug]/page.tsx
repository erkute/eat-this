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
import { buildBezirkBestOfHeading, buildBezirkDirectoryHeading } from '@/lib/bezirk-prose';
import { rankCurated, shelfPhoto } from '@/lib/curated-ranking';
import { bezirkCategoryLinks, bezirkGuideSlugs } from '@/lib/seo/crossLinks';
import type { RestaurantCard } from '@/lib/types';
import styles from '@/app/components/HubIssue.module.css';
import {
  IssueContents,
  latestMonth,
  IssueGuides,
  IssueRegister,
  IssueSiblings,
  IssueSpots,
} from '@/app/components/HubIssue';
import MapIntentLink from '@/app/components/MapIntentLink';
import {
  HubFilterProvider,
  HubFilterBar,
  HubFilterGroup,
  SPOT_LIST_ID,
  type HubFacet,
} from '@/app/components/HubFilter';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

/**
 * Bis zu so vielen Spots trägt auch eine Seite ohne Bestenliste Kapitel;
 * darüber wird alles zum Register, sonst scrollt man an Dutzenden Fotos
 * vorbei, um einen Namen zu finden.
 */
const CARD_LIMIT = 12;

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

  const baseImage = b.seo?.ogImageUrl || b.imageUrl;
  const image = baseImage || `${SITE_URL}/pics/og-card.png?v=${OG_CARD_VERSION}`;

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

  // `getAllBezirkeWithStats` läuft für diese Route schon in
  // `generateStaticParams` — derselbe Aufruf trifft den Data-Cache-Eintrag und
  // kostet keine zusätzliche Sanity-Anfrage (dasselbe Muster wie die OG-Route
  // auf der Restaurant-Seite).
  const [b, restaurants, alleBezirke, guides] = await Promise.all([
    getBezirkBySlug(slug),
    getRestaurantsByBezirk(slug),
    getAllBezirkeWithStats(),
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
  // Nur der erste Satz auf der Kopf-Tafel („zu viel Info"): der ganze
  // Absatz steht auf dem Bezirks-Index, hier trägt ein Satz die Ansage.
  const heroLede = bezirkDescription ? firstSentence(bezirkDescription) : '';
  // Kuratierte Bestenliste aus dem Studio; ohne Pflege (oder unter
  // MIN_CURATED) fällt `top` leer aus und die Seite bleibt rein alphabetisch.
  const { top, rest } = rankCurated(restaurants, b.topSpots);
  // Der erste Abschnitt: die Bestenliste, oder ohne sie das ganze Verzeichnis —
  // als Karten nur, solange es kurz genug ist.
  const lead = top.length > 0 ? top : rest;
  const leadAsCards = top.length > 0 || rest.length <= CARD_LIMIT;
  // Kein Bezirk hat in Sanity ein eigenes Foto (Stand 03.10.2026); statt
  // eines Banners zeigt der Kopf die Kapitel als Bildleiste. Ein Spotfoto als
  // Banner las sich früher wie eine eigene Empfehlung.
  const updated = latestMonth(restaurants, loc);

  // Nur Bezirke, die auch etwas zu zeigen haben — ein Link auf einen leeren
  // Hub liefe in dieselbe Weiterleitung zur Übersicht wie diese Seite oben.
  const nachbarBezirke = alleBezirke
    .filter((x) => x.slug && x.slug !== slug && (x.restaurantCount ?? 0) > 0)
    .map((x) => ({ slug: x.slug, label: x.name, photo: shelfPhoto(x) }));

  // Ohne Limit: die Chip-Leiste braucht *jede* vertretene Kategorie, sonst
  // wären Karten hinter keinem Chip erreichbar. Die Statuszeilen entstehen
  // hier, weil nur die Seite weiß, wie der Satz herum läuft — „Kaffee in
  // Schöneberg", auf der Kategorieseite dagegen „Frühstück in Mitte".
  const spotWord = (n: number) => (de ? (n === 1 ? 'Spot' : 'Spots') : n === 1 ? 'spot' : 'spots');
  const categoryFilters: HubFacet[] = bezirkCategoryLinks(restaurants, loc, Infinity).map((c) => ({
    slug: c.slug,
    label: c.label,
    status: `${c.label} in ${b.name} · ${c.count} ${spotWord(c.count)}`,
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
      <main className={styles.page}>
        <header className={styles.head}>
          <p className={styles.kicker}>{de ? 'Bezirk' : 'District'}</p>
          {/* „Restaurants in" ist Teil der H1 — die Suchen lauten
              „restaurants berlin mitte", nicht „mitte". Gleiche Phrase in
              beiden Sprachen. */}
          <h1 className={styles.title}>
            {/* Das Leerzeichen trennt die beiden Zeilen im Text der H1 —
                ohne es lesen Suchmaschinen und Vorleser „inKreuzberg". */}
            <span className={styles.pre}>Restaurants in</span>{' '}
            <span className={styles.name}>{b.name}</span>
          </h1>
          <p className={styles.credits}>
            <span>{de ? 'Von Eat This kuratiert' : 'Curated by Eat This'}</span>
            {updated && <span>{de ? `Stand ${updated}` : `Updated ${updated}`}</span>}
          </p>
        </header>

        {leadAsCards && <IssueContents restaurants={lead} label={de ? 'Die Spots' : 'The spots'} />}

        <p className={styles.lede}>
          {heroLede ||
            (de ? `Die besten Restaurants in ${b.name}` : `The best restaurants in ${b.name}`)}
        </p>
        <div className={styles.actions}>
          <MapIntentLink
            href={`/map?bezirk=${slug}`}
            rel="nofollow"
            className={styles.btn}
            aria-label={de ? `${b.name} auf der Map öffnen` : `Open ${b.name} on the map`}
          >
            {de ? 'Zur Map' : 'On the map'}
          </MapIntentLink>
        </div>

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
                  ? `Alle ${restaurants.length} Spots in ${b.name}`
                  : `All ${restaurants.length} spots in ${b.name}`
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
            <HubFilterGroup slugs={slugsIn(lead)}>
              <section>
                <h2 className={styles.secTitle}>
                  {top.length > 0
                    ? buildBezirkBestOfHeading(b.name, loc)
                    : de
                      ? 'Wo du essen solltest'
                      : 'Where to eat'}
                </h2>
                {leadAsCards ? (
                  <IssueSpots restaurants={lead} locale={loc} facetsOf={categorySlugsOf} />
                ) : (
                  <IssueRegister restaurants={lead} locale={loc} facetsOf={categorySlugsOf} />
                )}
              </section>
            </HubFilterGroup>

            {/* Das Verzeichnis bleibt vollständig und wird nicht paginiert: die
              internen Links sind der Weg, auf dem die Restaurant-Detailseiten
              gecrawlt werden. */}
            {top.length > 0 && rest.length > 0 && (
              <HubFilterGroup slugs={slugsIn(rest)}>
                <section>
                  <h2 className={styles.secTitle}>{buildBezirkDirectoryHeading(loc)}</h2>
                  <IssueRegister restaurants={rest} locale={loc} facetsOf={categorySlugsOf} />
                </section>
              </HubFilterGroup>
            )}
          </div>
        </HubFilterProvider>

        {/* Siehe bezirkGuideSlugs — die Zuordnung Hub → Guide. */}
        <IssueGuides
          guides={guides}
          locale={loc}
          heading={de ? 'Ausführlich im Magazin' : 'In depth in the magazine'}
        />

        {/* Zuletzt der Ausgang: wer unten ankommt, fragt „und wo noch?". */}
        <IssueSiblings
          items={nachbarBezirke}
          base="/bezirk"
          heading={de ? 'Andere Bezirke' : 'Other districts'}
          label={de ? 'Weitere Bezirke' : 'More districts'}
        />
      </main>
    </>
  );
}
