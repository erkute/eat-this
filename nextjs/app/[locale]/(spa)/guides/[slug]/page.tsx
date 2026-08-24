import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import SiteFooter from '@/app/components/SiteFooter';
import { NEWS_GUIDES, getNewsGuide } from '@/lib/news-guides';
import { getRestaurantsByCategory } from '@/lib/sanity.server';
import { localizedCuisine } from '@/lib/cuisineLabels';
import { formatPriceLabel } from '@/app/components/map/restaurantDetail.helpers';
import { pickLocale } from '@/lib/i18n/pickLocale';
import { buildHreflangAlternates, toOgLocale } from '@/lib/seo/metadata';
import { buildBrandedTitle } from '@/lib/seo/metadata-text';
import { OG_PACK_VERSION, SITE_URL } from '@/lib/constants';
import { buildWebPageNodes, serializeJsonLd } from '@/lib/json-ld';
import { schemaImageUrl } from '@/lib/sanity-image-presets';
import { localeUrl } from '@/lib/locale-url';
import { routing } from '@/i18n/routing';
import styles from './GuidePage.module.css';

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export const revalidate = 3600;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    NEWS_GUIDES.map((guide) => ({ locale, slug: guide.slug }))
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const guide = getNewsGuide(slug);
  if (!guide) return {};
  const loc = locale === 'en' ? 'en' : 'de';
  const title = guide.title[loc];
  const description = guide.intro[loc];
  const brandedTitle = buildBrandedTitle(title);
  const image = `${SITE_URL}/pics/og/og_${guide.categorySlug}.png?v=${OG_PACK_VERSION}`;
  const alternates = buildHreflangAlternates(`/guides/${slug}`, loc);
  return {
    title: { absolute: brandedTitle },
    description,
    alternates,
    openGraph: {
      title: brandedTitle,
      description,
      url: alternates.canonical,
      type: 'website',
      locale: toOgLocale(loc),
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: brandedTitle,
      description,
      images: [image],
    },
  };
}

export default async function GuidePage({ params }: PageProps) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const guide = getNewsGuide(slug);
  if (!guide) notFound();

  const loc = locale === 'en' ? 'en' : 'de';
  const de = loc === 'de';
  const restaurants = await getRestaurantsByCategory(guide.categorySlug);
  const listedRestaurants = restaurants.slice(0, 12);
  const categoryHref = `/kategorie/${guide.categorySlug}`;
  const mapHref = `/map?cat=${guide.mapQuery}`;
  const restaurantHref = (rSlug: string) => `/restaurant/${rSlug}`;
  const jsonLd = serializeJsonLd({
    '@context': 'https://schema.org',
    '@graph': [
      // Der Hero trägt die Pack-Illustration — Markenkunst, `aria-hidden`,
      // als Thumbnail wertlos. Leitbild ist deshalb das erste gelistete Foto.
      ...buildWebPageNodes({
        pageUrl: localeUrl(loc, `/guides/${slug}`),
        locale: loc,
        image: schemaImageUrl(listedRestaurants.find((r) => r.photo)?.photo),
        caption: guide.title[loc],
      }),
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Eat This Berlin',
            item: localeUrl(loc, '/'),
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: de ? 'Auf dem Teller' : 'Food News',
            item: localeUrl(loc, '/news'),
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: guide.shortTitle[loc],
            item: localeUrl(loc, `/guides/${slug}`),
          },
        ],
      },
      {
        '@type': 'ItemList',
        name: guide.title[loc],
        numberOfItems: listedRestaurants.length,
        itemListElement: listedRestaurants.map((restaurant, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'Restaurant',
            name: restaurant.name,
            url: localeUrl(loc, `/restaurant/${restaurant.slug}`),
            // Licence-gated like the bezirk list — see lib/json-ld/bezirk.ts.
            ...(restaurant.photo && { image: schemaImageUrl(restaurant.photo) }),
            ...(restaurant.cuisineType && { servesCuisine: restaurant.cuisineType }),
          },
        })),
      },
    ],
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <div className={`app-page active ${styles.page}`} data-page="guides">
        <main className={styles.shell}>
          <nav className={styles.breadcrumb} aria-label={de ? 'Navigation' : 'Navigation'}>
            <Link href="/news">{de ? 'Auf dem Teller' : 'Food News'}</Link>
            <span aria-hidden="true">/</span>
            <span>{guide.shortTitle[loc]}</span>
          </nav>

          <header className={`${styles.hero} ${styles[`hero_${guide.accent}`]}`}>
            <div className={styles.heroCopy}>
              <h1>{guide.title[loc]}</h1>
              <p>{guide.intro[loc]}</p>
              <div className={styles.heroActions}>
                <Link href={mapHref} className={styles.primary}>
                  {de ? 'Auf der Map öffnen' : 'Open on the map'}
                </Link>
                <Link href={categoryHref} className={styles.secondary}>
                  {de ? 'Alle Spots der Kategorie' : 'All spots in this category'}
                </Link>
              </div>
            </div>
            <div className={styles.heroPack} aria-hidden="true">
              <Image
                src={guide.art}
                alt=""
                width={420}
                height={560}
                // Renders at most 270px wide (GuidePage.module.css:150
                // `min(100%, 270px)`). Without sizes, a numeric width makes
                // Next emit x-descriptors — 640w @1x, 1080w @2x — so retina
                // fetched 169 kB for a 540px slot. With sizes it picks 640w.
                sizes="(max-width: 400px) 54vw, (max-width: 900px) 220px, 270px"
                priority
              />
            </div>
          </header>

          <section className={styles.listHead}>
            <h2>{de ? 'Unsere aktuelle Auswahl' : 'Our current picks'}</h2>
            <p>{guide.promise[loc]}</p>
          </section>

          {listedRestaurants.length > 0 ? (
            <section className={styles.grid}>
              {listedRestaurants.map((r, index) => {
                // Das erste Foto der Liste ist das Leitbild der Seite — kein
                // `priority`, das gehört dem Pack-Hero, aber auch nicht lazy.
                const isLeadPhoto = index === listedRestaurants.findIndex((x) => x.photo);
                const line =
                  pickLocale(r.shortDescription, r.shortDescriptionEn, loc) ||
                  pickLocale(r.tip, r.tipEn, loc);
                const priceLabel = formatPriceLabel(r);
                return (
                  <Link key={r._id} href={restaurantHref(r.slug)} className={styles.card}>
                    <span className={styles.index}>{String(index + 1).padStart(2, '0')}</span>
                    {r.photo && (
                      <div className={styles.photo}>
                        <Image
                          src={r.photo}
                          alt={r.name}
                          fill
                          sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 360px"
                          loading={isLeadPhoto ? 'eager' : 'lazy'}
                        />
                      </div>
                    )}
                    <div className={styles.cardBody}>
                      <h3>{r.name}</h3>
                      <p className={styles.meta}>
                        {[
                          r.district,
                          r.cuisineType ? localizedCuisine(r.cuisineType, loc) : null,
                          priceLabel,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      {line && <p className={styles.line}>{line}</p>}
                    </div>
                  </Link>
                );
              })}
            </section>
          ) : (
            <p className={styles.empty}>
              {de
                ? 'Diese Liste wird gerade befüllt. Auf der Map findest du schon passende Spots.'
                : 'This list is being filled. The map already has matching spots.'}
            </p>
          )}
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
