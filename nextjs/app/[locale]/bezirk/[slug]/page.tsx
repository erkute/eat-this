import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import Script from 'next/script'
import { setRequestLocale } from 'next-intl/server'
import { getBezirkBySlug, getRestaurantsByBezirk, getAllBezirkeWithStats } from '@/lib/sanity.server'
import { serializeJsonLd } from '@/lib/json-ld'
import { SITE_URL } from '@/lib/constants'
import { pickLocale, hasEnContent } from '@/lib/i18n/pickLocale'
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
  const loc = de ? 'de' : 'en'

  const fallbackTitleDe = `Beste Restaurants in ${b.name} — Eat This Berlin`
  const fallbackTitleEn = `Best restaurants in ${b.name} — Eat This Berlin`
  const title = pickLocale(
    b.seo?.metaTitle || fallbackTitleDe,
    b.seo?.metaTitleEn || fallbackTitleEn,
    loc,
  )

  const fallbackDescriptionDe = `Kuratierte Restaurant-Empfehlungen in ${b.name} (Berlin) — von Frühstück bis Dinner.`
  const description = pickLocale(
    b.seo?.metaDescription || b.description || fallbackDescriptionDe,
    b.seo?.metaDescriptionEn || b.descriptionEn || undefined,
    loc,
  )

  const baseImage = b.seo?.ogImageUrl || b.imageUrl
  const image = baseImage || `${SITE_URL}/pics/hero_desktop1.webp`

  const hasEn = hasEnContent(b)
  const canonical = hasEn
    ? localeUrl(loc, `/bezirk/${slug}`)
    : localeUrl('de', `/bezirk/${slug}`)

  const languages: Record<string, string> = {
    de: localeUrl('de', `/bezirk/${slug}`),
    'x-default': localeUrl('de', `/bezirk/${slug}`),
  }
  if (hasEn) languages.en = localeUrl('en', `/bezirk/${slug}`)

  return {
    title,
    description,
    robots: b.seo?.noIndex ? 'noindex,nofollow' : undefined,
    alternates: {
      canonical,
      languages,
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
  const loc = de ? 'de' : 'en'

  const [b, restaurants] = await Promise.all([
    getBezirkBySlug(slug),
    getRestaurantsByBezirk(slug),
  ])
  if (!b) notFound()

  const bezirkDescription = pickLocale(b.description, b.descriptionEn, loc)

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
          <h1 className={styles.title}>{b.name}</h1>
          {(bezirkDescription || restaurants.length > 0) && (
            <p className={styles.description}>
              {bezirkDescription ||
                (de
                  ? `${restaurants.length} kuratierte Spots — von Frühstück bis Dinner.`
                  : `${restaurants.length} curated spots — from breakfast to dinner.`)}
            </p>
          )}
        </header>

        <hr className={styles.divider} />

        <div className={styles.sectionLabel}>
          {restaurants.length} {de ? 'Restaurants' : 'Restaurants'}
        </div>

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
                  {r.cuisineType && <span>{r.cuisineType}</span>}
                  {r.price && <span className={styles.price}>· {r.price}</span>}
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
      </main>
    </>
  )
}
