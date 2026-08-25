import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import Image from 'next/image';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import {
  getBezirkBySlug,
  getRestaurantsByBezirk,
  getAllBezirkeWithStats,
} from '@/lib/sanity.server';
import { buildBezirkJsonLd } from '@/lib/json-ld';
import { OG_CARD_VERSION, SITE_URL } from '@/lib/constants';
import { localizedCuisine } from '@/lib/cuisineLabels';
import { INDEXABLE_ROBOTS, buildHreflangAlternates, toOgLocale } from '@/lib/seo/metadata';
import { buildPlainTitle, truncateMetadataDescription } from '@/lib/seo/metadata-text';
import { pickLocale, hasEnContent } from '@/lib/i18n/pickLocale';
import { routing } from '@/i18n/routing';
import { formatPriceLabel } from '@/app/components/map/restaurantDetail.helpers';
import {
  buildBezirkFAQEntries,
  buildBezirkBestOfHeading,
  buildBezirkDirectoryHeading,
} from '@/lib/bezirk-prose';
import { rankCurated } from '@/lib/curated-ranking';
import { bezirkCategoryLinks } from '@/lib/seo/crossLinks';
import type { RestaurantCard } from '@/lib/types';
import { sanitySrcSet } from '@/lib/sanity-image-presets';
import styles from '../Bezirk.module.css';
import MapPromoCTA from '@/app/components/MapPromoCTA';
import Breadcrumbs, { type BreadcrumbItem } from '@/app/components/Breadcrumbs';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
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
    <div className={`${styles.grid} ${restaurants.length <= 2 ? styles.gridCompact : ''}`}>
      {restaurants.map((r, i) => {
        const priceLabel = formatPriceLabel(r);
        const cardLine =
          pickLocale(r.shortDescription, r.shortDescriptionEn, locale) ||
          pickLocale(r.tip, r.tipEn, locale);
        return (
          <Link key={r._id} href={`/restaurant/${r.slug}`} className={styles.card}>
            {r.photo && (
              <div className={styles.cardPhoto}>
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
                {ranked && <span className={styles.rankBadge}>{i + 1}</span>}
              </div>
            )}
            <div className={styles.cardBody}>
              <h3 className={styles.cardName}>
                {ranked && !r.photo && <span className={styles.rankInline}>{i + 1}.</span>}
                {r.name}
              </h3>
              <div className={styles.cardMeta}>
                {r.cuisineType && (
                  <span className={styles.chipYellow}>
                    {localizedCuisine(r.cuisineType, locale)}
                  </span>
                )}
                {priceLabel && <span className={styles.price}>{priceLabel}</span>}
              </div>
              {cardLine && <p className={styles.cardTip}>{cardLine}</p>}
            </div>
          </Link>
        );
      })}
    </div>
  );
}

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

export default async function BezirkDetailPage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const de = locale === 'de';
  const loc = de ? 'de' : 'en';

  const [b, restaurants] = await Promise.all([getBezirkBySlug(slug), getRestaurantsByBezirk(slug)]);
  // A district without spots renders hero + FAQ around an empty grid —
  // dead end + thin content. 404 until the first spot is curated; the page
  // reappears automatically via ISR once a restaurant references the bezirk.
  if (!b || restaurants.length === 0) notFound();

  const bezirkDescription = pickLocale(b.description, b.descriptionEn, loc);
  const faqEntries = buildBezirkFAQEntries({ bezirk: b, restaurants, locale: loc });
  // Only the district's own picture. Falling back to a restaurant photo put a
  // spot in the banner that the grid below lists again — and captioned it,
  // so the banner read as a recommendation of its own.
  const heroImage = b.imageUrl;
  const heroImageAlt = de ? `Essen in ${b.name}` : `Food in ${b.name}`;
  const districtTitleStyle = {
    '--district-title-size': `${Math.min(19, 150 / Math.max(b.name.length, 1))}cqi`,
  } as CSSProperties;

  const breadcrumbItems: BreadcrumbItem[] = [
    { name: de ? 'Start' : 'Home', href: '/', logo: 'eat-this' },
    { name: de ? 'Bezirke' : 'Districts', href: '/bezirk' },
    { name: b.name },
  ];

  // Kuratierte Bestenliste aus dem Studio; ohne Pflege (oder unter
  // MIN_CURATED) fällt `top` leer aus und die Seite bleibt rein alphabetisch.
  const { top, rest } = rankCurated(restaurants, b.topSpots);
  const categoryLinks = bezirkCategoryLinks(restaurants, loc);

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
      <main className={`${styles.page} ${styles.bezirkDetail}`}>
        <div className={styles.breadcrumbWrap}>
          <Breadcrumbs
            items={breadcrumbItems}
            ariaLabel={de ? 'Brotkrumen-Navigation' : 'Breadcrumb'}
          />
        </div>

        <header className={`${styles.hero} ${styles.detailHero}`}>
          <div className={styles.detailHeroCopy}>
            <h1 className={styles.h1} style={districtTitleStyle}>
              {/* The lead line used to be a separate "Bezirk" kicker above the
                  name, which left the h1 reading just "Mitte" — no match for
                  what people actually search ("restaurants berlin mitte").
                  Folding it into the h1 keeps the two-line look and gives the
                  heading the phrase. */}
              {/* Same phrase in both locales — no ternary to fake a difference. */}
              <span className={styles.h1Lead}>Restaurants in</span>
              {b.name}
            </h1>
            <p className={styles.detailHeroDescription}>
              {bezirkDescription ||
                (de ? `Die besten Restaurants in ${b.name}` : `The best restaurants in ${b.name}`)}
            </p>
            <div className={styles.detailHeroActions}>
              <MapPromoCTA
                variant="chip"
                kind="bezirk"
                name={b.name}
                mapHref={`/map?bezirk=${slug}`}
                locale={loc}
              />
            </div>
          </div>
          {heroImage && (
            <figure className={styles.detailHeroMedia}>
              <div className={styles.detailHeroImage}>
                <Image
                  src={heroImage}
                  alt={heroImageAlt}
                  fill
                  priority
                  sizes="(max-width: 839px) 100vw, 48vw"
                />
              </div>
            </figure>
          )}
        </header>

        {/* Spiegelbild der Bezirks-Leiste auf den Kategorie-Seiten. Dieselben
            Klassen, damit beide Hub-Typen dieselbe Geste zeigen. */}
        {categoryLinks.length > 0 && (
          <nav
            className={styles.crossLinks}
            aria-label={de ? `Kategorien in ${b.name}` : `Categories in ${b.name}`}
          >
            <span className={styles.crossLinksHead}>
              {de ? `In ${b.name} nach Kategorie:` : `${b.name} by category:`}
            </span>
            {categoryLinks.map((c) => (
              <Link key={c.slug} href={`/kategorie/${c.slug}`} className={styles.crossLink}>
                {c.label}
              </Link>
            ))}
          </nav>
        )}

        <section id="restaurants" className={styles.restaurantSection}>
          <div className={styles.sectionHead}>
            <h2>
              {top.length > 0
                ? buildBezirkBestOfHeading(b.name, loc)
                : de
                  ? 'Wo du essen solltest'
                  : 'Where to eat'}
            </h2>
          </div>

          <RestaurantGrid
            restaurants={top.length > 0 ? top : rest}
            locale={loc}
            ranked={top.length > 0}
            // Nur ohne Bezirksbild: sonst führt der Banner-Hero (priority)
            // und ein zweites eiliges Bild nähme ihm die Bandbreite.
            eagerFirst={!heroImage}
          />

          {/* Das Verzeichnis bleibt vollständig und wird nicht paginiert: die
              internen Links sind der Weg, auf dem die Restaurant-Detailseiten
              gecrawlt werden. Die Trennung ist visuell, nicht datenseitig. */}
          {top.length > 0 && rest.length > 0 && (
            <div className={styles.directorySection}>
              <div className={styles.sectionHead}>
                <h2>{buildBezirkDirectoryHeading(loc)}</h2>
              </div>
              <RestaurantGrid restaurants={rest} locale={loc} />
            </div>
          )}
        </section>

        <div className={styles.detailMapCta}>
          <MapPromoCTA kind="bezirk" name={b.name} mapHref={`/map?bezirk=${slug}`} locale={loc} />
        </div>

        {faqEntries.length > 0 && (
          <section className={styles.faq} aria-label={de ? 'Häufige Fragen' : 'FAQ'}>
            <h2 className={styles.faqTitle}>{de ? 'Häufige Fragen' : 'Frequently asked'}</h2>
            <div className={styles.faqList}>
              {faqEntries.map((entry, i) => (
                <details key={i} className={styles.faqRow}>
                  <summary>
                    <span className={styles.faqQ}>{entry.question}</span>
                    <span className={styles.faqPlus} aria-hidden="true" />
                  </summary>
                  <p className={styles.faqA}>{entry.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
