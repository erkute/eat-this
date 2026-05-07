import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import { setRequestLocale } from 'next-intl/server'
import { getRestaurantBySlug, getAllRestaurantSlugs, getLatestNewsArticles, getMustEatsByRestaurant } from '@/lib/sanity.server'
import { serializeJsonLd } from '@/lib/json-ld'
import { SITE_URL } from '@/lib/constants'
import { routing } from '@/i18n/routing'
import { pickLocale, hasEnContent } from '@/lib/i18n/pickLocale'
import DetailPageOutro from '@/app/components/DetailPageOutro'
import MustEatTeaserSection from '@/app/components/MustEatTeaserSection'
import { Link as IntlLink } from '@/i18n/navigation'
import styles from './RestaurantDetail.module.css'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateStaticParams() {
  const slugs = await getAllRestaurantSlugs()
  return routing.locales.flatMap(locale =>
    slugs.map(slug => ({ locale, slug })),
  )
}

export const revalidate = 3600

function localeUrl(locale: string, path: string): string {
  return locale === 'de' ? `${SITE_URL}${path}` : `${SITE_URL}/${locale}${path}`
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const r = await getRestaurantBySlug(slug)
  if (!r) return {}
  const loc = locale === 'de' ? 'de' : 'en'

  const description = pickLocale(
    r.seo?.metaDescription ||
      r.shortDescription ||
      r.description ||
      r.tip ||
      `${r.name} in Berlin${r.district ? `, ${r.district}` : ''}.`,
    r.seo?.metaDescriptionEn ||
      r.shortDescriptionEn ||
      r.descriptionEn ||
      r.tipEn ||
      undefined,
    loc,
  )
  const title = pickLocale(
    r.seo?.metaTitle || `${r.name} — Eat This Berlin`,
    r.seo?.metaTitleEn || undefined,
    loc,
  )

  const baseImage = r.seo?.ogImageUrl || r.photo?.split('?')[0]
  const image = baseImage
    ? `${baseImage}?w=1200&h=630&fit=crop&auto=format`
    : `${SITE_URL}/pics/hero_desktop1.webp`

  // When EN content exists, restore self-canonical + reciprocal hreflang.
  // Without EN content, keep the deOnly workaround (both canonicals → DE,
  // no EN alternate) so Google doesn't see /en as a duplicate.
  const hasEn = hasEnContent(r)
  const canonical = hasEn
    ? localeUrl(loc, `/restaurant/${slug}`)
    : localeUrl('de', `/restaurant/${slug}`)

  const languages: Record<string, string> = {
    de: localeUrl('de', `/restaurant/${slug}`),
    'x-default': localeUrl('de', `/restaurant/${slug}`),
  }
  if (hasEn) languages.en = localeUrl('en', `/restaurant/${slug}`)

  return {
    title,
    description,
    robots: r.seo?.noIndex ? 'noindex,nofollow' : undefined,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      images: [{ url: image, width: 1200, height: 630, alt: r.name }],
      type: 'website',
      locale: loc === 'de' ? 'de_DE' : 'en_US',
    },
  }
}

export default async function RestaurantPage({ params }: PageProps) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const r = await getRestaurantBySlug(slug)
  if (!r) notFound()
  const [latestNews, mustEats] = await Promise.all([
    getLatestNewsArticles(2),
    getMustEatsByRestaurant(r._id),
  ])

  const loc = locale === 'de' ? 'de' : 'en'

  const description = pickLocale(r.description, r.descriptionEn, loc)
  const shortDescription = pickLocale(r.shortDescription, r.shortDescriptionEn, loc)
  const tip = pickLocale(r.tip, r.tipEn, loc)

  // serializeJsonLd escapes </ sequences, making this safe for inline JSON-LD
  const jsonLd = serializeJsonLd({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Restaurant',
        name: r.name,
        description: shortDescription || description || tip,
        image: r.photo,
        priceRange: r.price,
        servesCuisine: r.categories,
        url: r.website,
        hasMap: r.mapsUrl,
        ...(r.address && {
          address: {
            '@type': 'PostalAddress',
            streetAddress: r.address,
            addressLocality: 'Berlin',
            addressCountry: 'DE',
          },
        }),
        ...(r.lat != null && r.lng != null && {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: r.lat,
            longitude: r.lng,
          },
        }),
      },
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
            name: r.name,
            item: localeUrl(locale, `/restaurant/${slug}`),
          },
        ],
      },
    ],
  })

  return (
    <>
      {/* JSON-LD: serializeJsonLd sanitizes output — safe inline structured data */}
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <main className={styles.page}>
        <div className={styles.hero}>
          {r.photo && (
            <Image
              src={r.photo}
              alt={r.name}
              fill
              priority
              sizes="(max-width: 720px) 100vw, 720px"
              className={styles.heroImage}
            />
          )}
          {r.photo && (
            <span className={styles.heroCredit} aria-label="Photo credit">
              via Instagram
            </span>
          )}
        </div>

        <div className={styles.content}>
          <header className={styles.header}>
            <h1 className={styles.name}>{r.name}</h1>
            <div className={styles.meta}>
              {r.district && <span className={styles.district}>{r.district}</span>}
              {r.price && <span className={styles.price}>{r.price}</span>}
            </div>
            {r.address && (
              <a
                href={r.mapsUrl ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.address}
              >
                {r.address}
              </a>
            )}
            {r.cuisineType && <p className={styles.cuisine}>{r.cuisineType}</p>}
            {r.categories && r.categories.length > 0 && (
              <div className={styles.categories}>
                {r.categories.map((cat: string) => (
                  <span key={cat} className={styles.category}>{cat}</span>
                ))}
              </div>
            )}
          </header>

          {description && <p className={styles.description}>{description}</p>}

          {tip && (
            <div className={styles.tip}>
              <strong>Insider Tip: </strong>
              {tip}
            </div>
          )}

          {r.openingHours && r.openingHours.length > 0 && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Opening Hours</h2>
              <ul className={styles.hours}>
                {r.openingHours.map((slot, i) => (
                  <li key={i} className={styles.hourRow}>
                    <span className={styles.days}>{slot.days}</span>
                    <span>{slot.hours}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className={styles.links}>
            <IntlLink href={`/map?r=${r.slug}`} className={`${styles.link} ${styles.linkPrimary}`}>
              Eat This Map
            </IntlLink>
            {r.mapsUrl && (
              <a href={r.mapsUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>
                Google Maps
              </a>
            )}
            {r.reservationUrl && (
              <a href={r.reservationUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>
                {loc === 'de' ? 'Reservieren' : 'Reserve a Table'}
              </a>
            )}
            {r.website && (
              <a href={r.website} target="_blank" rel="noopener noreferrer" className={styles.link}>
                Website
              </a>
            )}
          </div>

          <MustEatTeaserSection mustEats={mustEats} locale={loc} />
        </div>

        {r.bezirk?.slug && r.bezirk?.name && (
          <DetailPageOutro
            bezirkSlug={r.bezirk.slug}
            bezirkName={r.bezirk.name}
            latestNews={latestNews}
            locale={loc}
          />
        )}
      </main>
    </>
  )
}
