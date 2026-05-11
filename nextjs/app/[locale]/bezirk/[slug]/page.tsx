import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import Script from 'next/script'
import { setRequestLocale } from 'next-intl/server'
import { getBezirkBySlug, getRestaurantsByBezirk, getAllBezirkeWithStats, getLatestNewsArticles } from '@/lib/sanity.server'
import { buildBezirkJsonLd } from '@/lib/json-ld'
import { SITE_URL } from '@/lib/constants'
import { localeUrl } from '@/lib/locale-url'
import { pickLocale, hasEnContent } from '@/lib/i18n/pickLocale'
import { routing } from '@/i18n/routing'
import { formatPriceLabel } from '@/app/components/map/restaurantDetail.helpers'
import { buildBezirkQuickFacts, buildBezirkFAQEntries } from '@/lib/bezirk-prose'
import styles from '../Bezirk.module.css'
import DetailPageOutro from '@/app/components/DetailPageOutro'
import Breadcrumbs, { type BreadcrumbItem } from '@/app/components/Breadcrumbs'

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

  const [b, restaurants, latestNews] = await Promise.all([
    getBezirkBySlug(slug),
    getRestaurantsByBezirk(slug),
    getLatestNewsArticles(2),
  ])
  if (!b) notFound()

  const bezirkDescription = pickLocale(b.description, b.descriptionEn, loc)

  // Prose blocks derived from the restaurant list — lift unique word count
  // above Google's thin-content bar. The bezirk's own Sanity description is
  // ~40 words and the restaurant cards below it duplicate text from each
  // restaurant detail page, so without these blocks the page reads as
  // near-duplicate boilerplate to a crawler.
  const quickFacts = buildBezirkQuickFacts({ bezirk: b, restaurants, locale: loc })
  const faqEntries = buildBezirkFAQEntries({ bezirk: b, restaurants, locale: loc })

  const breadcrumbItems: BreadcrumbItem[] = [
    { name: de ? 'Start' : 'Home', href: '/' },
    { name: de ? 'Bezirke' : 'Districts', href: '/bezirk' },
    { name: b.name },
  ]

  const restaurantUrl = (rSlug: string) =>
    locale === 'de' ? `/restaurant/${rSlug}` : `/${locale}/restaurant/${rSlug}`

  const jsonLd = buildBezirkJsonLd({
    bezirk: b,
    restaurants,
    locale,
    districtsLabel: de ? 'Bezirke' : 'Districts',
    faqs: faqEntries,
  })

  return (
    <>
      <Script id={`schema-bezirk-${slug}`} type="application/ld+json" strategy="beforeInteractive">
        {jsonLd}
      </Script>
      <main className={styles.page}>
        <Breadcrumbs items={breadcrumbItems} ariaLabel={de ? 'Brotkrumen-Navigation' : 'Breadcrumb'} />
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
          {quickFacts && <p className={styles.quickFacts}>{quickFacts}</p>}
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

        {faqEntries.length > 0 && (
          <section className={styles.faq} aria-label={de ? 'Häufige Fragen' : 'FAQ'}>
            <h2 className={styles.faqHeading}>{de ? 'Häufige Fragen' : 'Frequently asked'}</h2>
            <dl className={styles.faqList}>
              {faqEntries.map((entry, i) => (
                <div key={i} className={styles.faqItem}>
                  <dt className={styles.faqQuestion}>{entry.question}</dt>
                  <dd className={styles.faqAnswer}>{entry.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <DetailPageOutro
          bezirkSlug={b.slug}
          bezirkName={b.name}
          latestNews={latestNews}
          locale={loc}
        />
      </main>
    </>
  )
}
