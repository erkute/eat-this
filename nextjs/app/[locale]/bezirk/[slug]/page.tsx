import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import Script from 'next/script'
import { setRequestLocale } from 'next-intl/server'
import { getBezirkBySlug, getRestaurantsByBezirk, getAllBezirkeWithStats } from '@/lib/sanity.server'
import { serializeJsonLd } from '@/lib/json-ld'
import { SITE_URL } from '@/lib/constants'
import { routing } from '@/i18n/routing'
import styles from '../Bezirk.module.css'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export const revalidate = 3600

export async function generateStaticParams() {
  const bezirke = await getAllBezirkeWithStats()
  return routing.locales.flatMap(locale =>
    bezirke.map(b => ({ locale, slug: b.slug })),
  )
}

function localeUrl(locale: string, path: string): string {
  return locale === 'de' ? `${SITE_URL}${path}` : `${SITE_URL}/${locale}${path}`
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const b = await getBezirkBySlug(slug)
  if (!b) return {}
  const de = locale === 'de'
  const title = de
    ? `Beste Restaurants in ${b.name} — Eat This Berlin`
    : `Best restaurants in ${b.name} — Eat This Berlin`
  const description = b.description ||
    (de
      ? `Kuratierte Restaurant-Empfehlungen in ${b.name} (Berlin) — von Frühstück bis Dinner.`
      : `Curated restaurant picks in ${b.name} (Berlin) — from breakfast to dinner.`)
  const image = b.imageUrl || `${SITE_URL}/pics/hero_desktop1.webp`
  // Bezirk content has no per-locale fields in Sanity yet (b.name and
  // b.description render identically for DE and EN). Mirror the restaurant
  // pattern: point both DE and EN canonicals at the DE URL and drop the EN
  // hreflang so Google doesn't flag /en/bezirk/x as a duplicate of
  // /bezirk/x and pick its own canonical. Restore self-canonical + en
  // alternate when per-locale bezirk content lands in Sanity.
  const canonical = localeUrl('de', `/bezirk/${slug}`)
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        de: localeUrl('de', `/bezirk/${slug}`),
        'x-default': localeUrl('de', `/bezirk/${slug}`),
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      images: [{ url: image, width: 1200, height: 630, alt: b.name }],
      type: 'website',
      locale: de ? 'de_DE' : 'en_US',
    },
  }
}

export default async function BezirkDetailPage({ params }: PageProps) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const de = locale === 'de'

  const [b, restaurants] = await Promise.all([
    getBezirkBySlug(slug),
    getRestaurantsByBezirk(slug),
  ])
  if (!b) notFound()

  const restaurantUrl = (rSlug: string) =>
    locale === 'de' ? `/restaurant/${rSlug}` : `/${locale}/restaurant/${rSlug}`

  const jsonLd = serializeJsonLd({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Eat This Berlin', item: localeUrl(locale, '/') },
          { '@type': 'ListItem', position: 2, name: de ? 'Bezirke' : 'Districts', item: localeUrl(locale, '/bezirk') },
          { '@type': 'ListItem', position: 3, name: b.name, item: localeUrl(locale, `/bezirk/${slug}`) },
        ],
      },
      {
        '@type': 'ItemList',
        name: de ? `Restaurants in ${b.name}` : `Restaurants in ${b.name}`,
        numberOfItems: restaurants.length,
        itemListElement: restaurants.map((r, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'Restaurant',
            name: r.name,
            url: `${SITE_URL}${restaurantUrl(r.slug)}`,
            ...(r.cuisineType && { servesCuisine: r.cuisineType }),
            ...(r.price && { priceRange: r.price }),
          },
        })),
      },
    ],
  })

  return (
    <>
      <Script id={`schema-bezirk-${slug}`} type="application/ld+json" strategy="beforeInteractive">
        {jsonLd}
      </Script>
      <main className={styles.page}>
        <header className={styles.header}>
          <div className={styles.kicker}>{de ? 'Bezirk' : 'District'}</div>
          <h1 className={styles.title}>
            {de ? `Restaurants in ${b.name}` : `Restaurants in ${b.name}`}
          </h1>
          <p className={styles.subtitle}>
            {b.description ||
              (de
                ? `${restaurants.length} kuratierte Spots — von Frühstück bis Dinner.`
                : `${restaurants.length} curated spots — from breakfast to dinner.`)}
          </p>
        </header>

        <section className={styles.grid}>
          {restaurants.map(r => (
            <Link key={r._id} href={restaurantUrl(r.slug)} className={styles.card}>
              {r.photo && (
                <div className={styles.cardImage}>
                  <Image
                    src={r.photo}
                    alt={r.name}
                    fill
                    sizes="(max-width: 720px) 50vw, (max-width: 1080px) 33vw, 260px"
                  />
                </div>
              )}
              <h2 className={styles.cardName}>{r.name}</h2>
              <div className={styles.cardMeta}>
                {r.cuisineType && <span>{r.cuisineType}</span>}
                {r.price && <span className={styles.price}>{r.price}</span>}
              </div>
              {(r.shortDescription || r.tip) && (
                <p className={styles.cardTip}>{r.shortDescription || r.tip}</p>
              )}
            </Link>
          ))}
        </section>
      </main>
    </>
  )
}
