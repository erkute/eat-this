import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import Script from 'next/script'
import { setRequestLocale } from 'next-intl/server'
import { getRestaurantsByCategory, getCategoryBySlug, getAllCategories } from '@/lib/sanity.server'
import { localizedCategoryName, localizedCategoryBlurb } from '@/lib/categories'
import { formatPriceLabel } from '@/app/components/map/restaurantDetail.helpers'
import { serializeJsonLd } from '@/lib/json-ld'
import { SITE_URL } from '@/lib/constants'
import { localeUrl } from '@/lib/locale-url'
import { routing } from '@/i18n/routing'
import { pickLocale } from '@/lib/i18n/pickLocale'
import styles from '../../bezirk/Bezirk.module.css'
import Breadcrumbs, { type BreadcrumbItem } from '@/app/components/Breadcrumbs'
import HubMapCTA from '@/app/components/HubMapCTA'
import MapPromoBlock from '@/app/components/MapPromoBlock'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export const revalidate = 3600

export async function generateStaticParams() {
  const cats = await getAllCategories()
  return routing.locales.flatMap(locale =>
    cats.map(c => ({ locale, slug: c.slug })),
  )
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const c = await getCategoryBySlug(slug)
  if (!c) return {}
  const de = locale === 'de'
  const loc = de ? 'de' : 'en'
  const label = localizedCategoryName(c, loc)
  const title = `${label} in Berlin — Eat This`
  const description = localizedCategoryBlurb(c, loc) || undefined
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

  const c = await getCategoryBySlug(slug)
  if (!c) notFound()

  const restaurants = await getRestaurantsByCategory(c.slug)
  const label = localizedCategoryName(c, loc)
  const blurb = localizedCategoryBlurb(c, loc)

  // "Kategorien"-Hub als Text statt Link — kein in-app Browse-All-Pfad zum
  // Kategorien-Index. JSON-LD BreadcrumbList behält die kanonischen URLs.
  const breadcrumbItems: BreadcrumbItem[] = [
    { name: de ? 'Start' : 'Home', href: '/' },
    { name: de ? 'Kategorien' : 'Categories' },
    { name: label },
  ]

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
        itemListElement: restaurants.map((r, i) => {
          const priceLabel = formatPriceLabel(r)
          return {
            '@type': 'ListItem',
            position: i + 1,
            item: {
              '@type': 'Restaurant',
              name: r.name,
              url: `${SITE_URL}${restaurantUrl(r.slug)}`,
              ...(r.cuisineType && { servesCuisine: r.cuisineType }),
              ...(priceLabel && { priceRange: priceLabel }),
            },
          }
        }),
      },
    ],
  })

  return (
    <>
      <Script id={`schema-kategorie-${slug}`} type="application/ld+json" strategy="beforeInteractive">
        {jsonLd}
      </Script>
      <main className={styles.page}>
        <Breadcrumbs items={breadcrumbItems} ariaLabel={de ? 'Brotkrumen-Navigation' : 'Breadcrumb'} />
        <header className={styles.header}>
          <div className={styles.kicker}>{de ? 'Kategorie' : 'Category'}</div>
          <h1 className={styles.title}>
            {label} in Berlin
          </h1>
          {blurb && <p className={styles.description}>{blurb}</p>}
        </header>

        <HubMapCTA
          href={`/map?cat=${c.slug}`}
          title={de
            ? `Alle ${label}-Spots auf der Map ansehen`
            : `See all ${label.toLowerCase()} spots on the map`}
          subline={de
            ? 'Geo-clustered, mit Must-Eats und Walking-Distance.'
            : 'Geo-clustered, with Must-Eats and walking distance.'}
        />

        <section className={styles.grid}>
          {restaurants.map(r => (
            <Link key={r._id} href={restaurantUrl(r.slug)} className={styles.card}>
              {r.photo && (
                <div className={styles.cardImage}>
                  <Image
                    src={r.photo}
                    alt={r.name}
                    fill
                    sizes="(max-width: 720px) 100vw, (max-width: 960px) 50vw, 340px"
                  />
                </div>
              )}
              <div className={styles.cardBody}>
                <h2 className={styles.cardName}>{r.name}</h2>
                <div className={styles.cardMeta}>
                  {r.district && <span>{r.district}</span>}
                  {r.cuisineType && <span className={styles.cuisine}>{r.cuisineType}</span>}
                  {(() => {
                    const priceLabel = formatPriceLabel(r)
                    return priceLabel ? <span className={styles.price}>· {priceLabel}</span> : null
                  })()}
                </div>
                {(() => {
                  const cardLine = pickLocale(r.shortDescription, r.shortDescriptionEn, loc)
                    || pickLocale(r.tip, r.tipEn, loc)
                  return cardLine ? <p className={styles.cardTip}>{cardLine}</p> : null
                })()}
              </div>
            </Link>
          ))}
        </section>

        <MapPromoBlock
          mapHref={`/map?cat=${c.slug}`}
          ariaLabel={de
            ? `Entdecke ${label} auf der Map`
            : `Discover ${label.toLowerCase()} on the map`}
        />
      </main>
    </>
  )
}
