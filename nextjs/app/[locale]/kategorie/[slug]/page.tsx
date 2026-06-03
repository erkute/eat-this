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
import MapPromoCTA from '@/app/components/MapPromoCTA'
import KategorieBoost from '@/app/components/KategorieBoost'

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

  // Stats: SPOTS + BEZIRKE (always 2-up, no must-eat dependency)
  const bezirkSet = new Set(
    restaurants.map(r => r.district).filter((d): d is string => Boolean(d))
  )
  const statsStyle = { ['--stats-cols' as string]: '2' } as React.CSSProperties

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

        <header className={styles.hero}>
          <div className={styles.kicker}>{de ? 'Kategorie' : 'Category'}</div>
          <h1 className={styles.h1}>{label}</h1>
          <div className={styles.tagline}>in Berlin</div>
          {blurb && <p className={styles.sub}>{blurb}</p>}
        </header>

        <div className={styles.stats} style={statsStyle}>
          <div className={styles.statCell}>
            <div className={styles.statN}>{restaurants.length}</div>
            <div className={styles.statK}>Spots</div>
          </div>
          <div className={styles.statCell}>
            <div className={styles.statN}>{bezirkSet.size}</div>
            <div className={styles.statK}>{de ? 'Bezirke' : 'Districts'}</div>
          </div>
        </div>

        <KategorieBoost categorySlug={c.slug} locale={loc} />

        <div className={styles.sectionHead}>
          <h2>{de ? 'Die handverlesene Auswahl' : 'The hand-picked selection'}</h2>
          <p>{de
            ? 'Editor-Pick aus Berlin.'
            : 'Editor pick from Berlin.'}</p>
        </div>

        <section className={styles.grid}>
          {restaurants.map(r => {
            const priceLabel = formatPriceLabel(r)
            const cardLine = pickLocale(r.shortDescription, r.shortDescriptionEn, loc)
              || pickLocale(r.tip, r.tipEn, loc)
            return (
              <Link key={r._id} href={restaurantUrl(r.slug)} className={styles.card}>
                {r.photo && (
                  <div className={styles.cardPhoto}>
                    <Image
                      src={r.photo}
                      alt={r.name}
                      fill
                      sizes="(max-width: 720px) 100vw, (max-width: 960px) 50vw, 340px"
                    />
                  </div>
                )}
                <div className={styles.cardBody}>
                  <h3 className={styles.cardName}>{r.name}</h3>
                  <div className={styles.cardMeta}>
                    {r.cuisineType && <span className={styles.chipYellow}>{r.cuisineType}</span>}
                    {r.district && <span className={styles.chipOutline}>{r.district}</span>}
                    {priceLabel && <span className={styles.price}>{priceLabel}</span>}
                  </div>
                  {cardLine && <p className={styles.cardTip}>{cardLine}</p>}
                </div>
              </Link>
            )
          })}
        </section>

        <MapPromoCTA kind="kategorie" name={label} mapHref={`/map?cat=${slug}`} locale={loc} />

      </main>
    </>
  )
}
