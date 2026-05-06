import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import Script from 'next/script'
import { setRequestLocale } from 'next-intl/server'
import { getRestaurantsByCategory } from '@/lib/sanity.server'
import { CATEGORIES, getCategoryBySlug } from '@/lib/categories'
import { serializeJsonLd } from '@/lib/json-ld'
import { SITE_URL } from '@/lib/constants'
import { routing } from '@/i18n/routing'
import { pickLocale } from '@/lib/i18n/pickLocale'
import styles from '../../bezirk/Bezirk.module.css'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export const revalidate = 3600

export async function generateStaticParams() {
  return routing.locales.flatMap(locale =>
    CATEGORIES.map(c => ({ locale, slug: c.slug })),
  )
}

function localeUrl(locale: string, path: string): string {
  return locale === 'de' ? `${SITE_URL}${path}` : `${SITE_URL}/${locale}${path}`
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const c = getCategoryBySlug(slug)
  if (!c) return {}
  const de = locale === 'de'
  const label = de ? c.labelDe : c.labelEn
  const title = de
    ? `${label} in Berlin — Eat This`
    : `${label} in Berlin — Eat This`
  const description = de ? c.blurbDe : c.blurbEn
  const canonical = localeUrl(locale, `/kategorie/${slug}`)
  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        de: localeUrl('de', `/kategorie/${slug}`),
        en: localeUrl('en', `/kategorie/${slug}`),
        'x-default': localeUrl('de', `/kategorie/${slug}`),
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      locale: de ? 'de_DE' : 'en_US',
    },
  }
}

export default async function KategorieDetailPage({ params }: PageProps) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const de = locale === 'de'
  const loc = de ? 'de' : 'en'

  const c = getCategoryBySlug(slug)
  if (!c) notFound()

  const restaurants = await getRestaurantsByCategory(c.value)
  const label = de ? c.labelDe : c.labelEn

  const restaurantUrl = (rSlug: string) =>
    locale === 'de' ? `/restaurant/${rSlug}` : `/${locale}/restaurant/${rSlug}`

  const jsonLd = serializeJsonLd({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Eat This Berlin', item: localeUrl(locale, '/') },
          { '@type': 'ListItem', position: 2, name: de ? 'Kategorien' : 'Categories', item: localeUrl(locale, '/kategorie') },
          { '@type': 'ListItem', position: 3, name: label, item: localeUrl(locale, `/kategorie/${slug}`) },
        ],
      },
      {
        '@type': 'ItemList',
        name: `${label} in Berlin`,
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
      <Script id={`schema-kategorie-${slug}`} type="application/ld+json" strategy="beforeInteractive">
        {jsonLd}
      </Script>
      <main className={styles.page}>
        <header className={styles.header}>
          <div className={styles.kicker}>{de ? 'Kategorie' : 'Category'}</div>
          <h1 className={styles.title}>
            {label} in Berlin
          </h1>
          <p className={styles.subtitle}>
            {de ? c.blurbDe : c.blurbEn}
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
                {r.district && <span>{r.district}</span>}
                {r.cuisineType && <span>{r.cuisineType}</span>}
                {r.price && <span className={styles.price}>{r.price}</span>}
              </div>
              {(() => {
                const cardLine = pickLocale(r.shortDescription, r.shortDescriptionEn, loc)
                  || pickLocale(r.tip, r.tipEn, loc)
                return cardLine ? <p className={styles.cardTip}>{cardLine}</p> : null
              })()}
            </Link>
          ))}
        </section>
      </main>
    </>
  )
}
