import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getRestaurantBySlug, getAllRestaurantSlugs } from '@/lib/sanity.server'
import { serializeJsonLd } from '@/lib/json-ld'
import { SITE_URL } from '@/lib/constants'
import SiteNav from '@/app/components/SiteNav'
import styles from './RestaurantDetail.module.css'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const slugs = await getAllRestaurantSlugs()
  return slugs.map(slug => ({ slug }))
}

export const revalidate = 3600

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const r = await getRestaurantBySlug(slug)
  if (!r) return {}

  const title = r.seo?.metaTitle || `${r.name} — Eat This Berlin`
  const description =
    r.seo?.metaDescription ||
    r.description ||
    r.tip ||
    `${r.name} in Berlin${r.district ? `, ${r.district}` : ''}.`
  const baseImage = r.seo?.ogImageUrl || r.photo?.split('?')[0]
  const image = baseImage
    ? `${baseImage}?w=1200&h=630&fit=crop&auto=format`
    : `${SITE_URL}/pics/og-image.jpg`

  return {
    title,
    description,
    robots: r.seo?.noIndex ? 'noindex,nofollow' : undefined,
    alternates: { canonical: `${SITE_URL}/restaurant/${slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/restaurant/${slug}`,
      images: [{ url: image, width: 1200, height: 630, alt: r.name }],
      type: 'website',
      locale: 'de_DE',
    },
  }
}

export default async function RestaurantPage({ params }: PageProps) {
  const { slug } = await params
  const r = await getRestaurantBySlug(slug)
  if (!r) notFound()

  // serializeJsonLd escapes </ sequences, making this safe for inline JSON-LD
  const jsonLd = serializeJsonLd({
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: r.name,
    description: r.description || r.tip,
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
  })

  return (
    <>
      {/* JSON-LD: serializeJsonLd sanitizes output — safe inline structured data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <SiteNav />
      <main className={styles.page}>
        <div className={styles.hero}>
          {r.photo && (
            <img src={r.photo} alt={r.name} className={styles.heroImage} fetchPriority="high" />
          )}
        </div>

        <div className={styles.content}>
          <header className={styles.header}>
            <h1 className={styles.name}>{r.name}</h1>
            <div className={styles.meta}>
              {r.district && <span className={styles.district}>{r.district}</span>}
              {r.price && <span className={styles.price}>{r.price}</span>}
            </div>
            {r.categories && r.categories.length > 0 && (
              <div className={styles.categories}>
                {r.categories.map((cat: string) => (
                  <span key={cat} className={styles.category}>{cat}</span>
                ))}
              </div>
            )}
          </header>

          {r.description && <p className={styles.description}>{r.description}</p>}

          {r.tip && (
            <div className={styles.tip}>
              <strong>Insider Tip: </strong>
              {r.tip}
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
            {r.mapsUrl && (
              <a href={r.mapsUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>
                Google Maps
              </a>
            )}
            {r.reservationUrl && (
              <a href={r.reservationUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>
                Reserve a Table
              </a>
            )}
            {r.website && (
              <a href={r.website} target="_blank" rel="noopener noreferrer" className={styles.link}>
                Website
              </a>
            )}
          </div>
        </div>
      </main>
    </>
  )
}
