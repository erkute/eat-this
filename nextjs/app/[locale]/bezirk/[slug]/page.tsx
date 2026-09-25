import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from '@/app/components/SiteImage';
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
import {
  buildBezirkFAQEntries,
  buildBezirkBestOfHeading,
  buildBezirkDirectoryHeading,
} from '@/lib/bezirk-prose';
import { rankCurated } from '@/lib/curated-ranking';
import { bezirkCategoryLinks, bezirkGuideSlugs } from '@/lib/seo/crossLinks';
import type { RestaurantCard } from '@/lib/types';
import styles from '@/app/components/HubPage.module.css';
import { HubSpotCards, HubSpotRows, hubTitleStyle } from '@/app/components/HubSpots';
import MapPromoCTA from '@/app/components/MapPromoCTA';
import HubSiblings from '@/app/components/HubSiblings';
import GuideCrossLinks from '@/app/components/GuideCrossLinks';
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
 * Bis zu so vielen Spots trägt auch eine Seite ohne Bestenliste große Karten;
 * darüber wird das Verzeichnis zu Zeilen, sonst scrollt man an Dutzenden
 * Fotos vorbei, um einen Namen zu finden.
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
  // Skip districts without open spots — their detail page 404s (see below).
  return routing.locales.flatMap((locale) =>
    bezirke.filter((b) => (b.restaurantCount ?? 0) > 0).map((b) => ({ locale, slug: b.slug }))
  );
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
  // A district without spots renders hero + FAQ around an empty grid —
  // dead end + thin content. 404 until the first spot is curated; the page
  // reappears automatically via ISR once a restaurant references the bezirk.
  if (!b || restaurants.length === 0) notFound();

  const bezirkDescription = pickLocale(b.description, b.descriptionEn, loc);
  // Nur der erste Satz auf der Kopf-Tafel („zu viel Info"): der ganze
  // Absatz steht auf dem Bezirks-Index, hier trägt ein Satz die Ansage.
  const heroLede = bezirkDescription ? firstSentence(bezirkDescription) : '';
  // Kuratierte Bestenliste aus dem Studio; ohne Pflege (oder unter
  // MIN_CURATED) fällt `top` leer aus und die Seite bleibt rein alphabetisch.
  // Steht vor der FAQ, weil die sie als Antwortquelle bekommt.
  const { top, rest } = rankCurated(restaurants, b.topSpots);
  // Der erste Abschnitt: die Bestenliste, oder ohne sie das ganze Verzeichnis —
  // als Karten nur, solange es kurz genug ist.
  const lead = top.length > 0 ? top : rest;
  const leadAsCards = top.length > 0 || rest.length <= CARD_LIMIT;
  // `curated: top` statt der Slugs: die FAQ nennt damit exakt die Namen der
  // Bestenliste, die auf derselben Seite darüber steht.
  const faqEntries = buildBezirkFAQEntries({
    bezirk: b,
    restaurants,
    locale: loc,
    curated: top,
  });
  // Only the district's own picture. Falling back to a restaurant photo put a
  // spot in the banner that the grid below lists again — and captioned it,
  // so the banner read as a recommendation of its own.
  const heroImage = b.imageUrl;
  const heroImageAlt = de ? `Essen in ${b.name}` : `Food in ${b.name}`;
  const titleStyle = hubTitleStyle(b.name);

  // Nur Bezirke, die auch etwas zu zeigen haben — ein Link auf einen leeren
  // Hub läuft in denselben notFound() wie diese Seite ihn oben wirft.
  const nachbarBezirke = alleBezirke
    .filter((x) => x.slug && x.slug !== slug && (x.restaurantCount ?? 0) > 0)
    .map((x) => ({ slug: x.slug, label: x.name }));

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
    faqs: faqEntries,
  });

  return (
    <>
      <script
        id={`schema-bezirk-${slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <main className={styles.page}>
        <header className={`${styles.hero} ${heroImage ? styles.heroWithMedia : ''}`}>
          <div className={styles.heroCopy}>
            {/* „Restaurants in" ist Teil der H1 — die Suchen lauten
                „restaurants berlin mitte", nicht „mitte". Optisch die gelbe
                Einordnung über dem Namen. Gleiche Phrase in beiden Sprachen. */}
            <h1 className={styles.title} style={titleStyle}>
              <span className={styles.kicker}>Restaurants in</span>
              {b.name}
            </h1>
            <p className={styles.lede}>
              {heroLede ||
                (de ? `Die besten Restaurants in ${b.name}` : `The best restaurants in ${b.name}`)}
            </p>
            <div className={styles.heroActions}>
              <MapPromoCTA
                variant="band"
                kind="bezirk"
                name={b.name}
                mapHref={`/map?bezirk=${slug}`}
                locale={loc}
              />
            </div>
          </div>
          {heroImage && (
            <figure className={styles.heroMedia}>
              <Image
                src={heroImage}
                alt={heroImageAlt}
                fill
                priority
                sizes="(max-width: 899px) 100vw, 46vw"
              />
            </figure>
          )}
        </header>

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
              <section className={styles.section}>
                <div className={styles.sectionHead}>
                  <h2 className={styles.sectionTitle}>
                    {top.length > 0
                      ? buildBezirkBestOfHeading(b.name, loc)
                      : de
                        ? 'Wo du essen solltest'
                        : 'Where to eat'}
                  </h2>
                </div>
                {leadAsCards ? (
                  <HubSpotCards
                    restaurants={lead}
                    locale={loc}
                    facetsOf={categorySlugsOf}
                    ranked={top.length > 0}
                    // Nur ohne Bezirksbild: sonst führt der Banner (priority), und
                    // ein zweites eiliges Bild nähme ihm die Bandbreite.
                    eagerFirst={!heroImage}
                  />
                ) : (
                  <HubSpotRows restaurants={lead} locale={loc} facetsOf={categorySlugsOf} />
                )}
              </section>
            </HubFilterGroup>

            {/* Das Verzeichnis bleibt vollständig und wird nicht paginiert: die
              internen Links sind der Weg, auf dem die Restaurant-Detailseiten
              gecrawlt werden. */}
            {top.length > 0 && rest.length > 0 && (
              <HubFilterGroup slugs={slugsIn(rest)}>
                <section className={`${styles.section} ${styles.sectionGap}`}>
                  <div className={styles.sectionHead}>
                    <h2 className={styles.sectionTitle}>{buildBezirkDirectoryHeading(loc)}</h2>
                  </div>
                  <HubSpotRows restaurants={rest} locale={loc} facetsOf={categorySlugsOf} />
                </section>
              </HubFilterGroup>
            )}
          </div>
        </HubFilterProvider>

        {/* Siehe bezirkGuideSlugs — die Zuordnung Hub → Guide. */}
        <GuideCrossLinks guides={guides} locale={loc} />

        <div className={styles.promo}>
          <MapPromoCTA kind="bezirk" name={b.name} mapHref={`/map?bezirk=${slug}`} locale={loc} />
        </div>

        {faqEntries.length > 0 && (
          <section className={styles.faq} aria-labelledby="faq-title">
            <div className={styles.sectionHead}>
              <h2 id="faq-title" className={styles.sectionTitle}>
                {de ? 'Häufige Fragen' : 'Frequently asked'}
              </h2>
            </div>
            <div className={styles.faqList}>
              {faqEntries.map((entry, i) => (
                <details key={i} className={styles.faqRow}>
                  <summary>{entry.question}</summary>
                  <p className={styles.faqAnswer}>{entry.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Zuletzt der Ausgang: wer unten ankommt, fragt „und wo noch?". */}
        <HubSiblings
          items={nachbarBezirke}
          base="/bezirk"
          heading={de ? 'Auch in Berlin' : 'Elsewhere in Berlin'}
          ariaLabel={de ? 'Weitere Bezirke' : 'More districts'}
        />
      </main>
    </>
  );
}
