import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import Script from 'next/script'
import { setRequestLocale } from 'next-intl/server'
import { getBezirkBySlug, getRestaurantsByBezirk, getAllBezirkeWithStats } from '@/lib/sanity.server'
import { buildBezirkJsonLd } from '@/lib/json-ld'
import { SITE_URL } from '@/lib/constants'
import { localeUrl } from '@/lib/locale-url'
import { pickLocale, hasEnContent } from '@/lib/i18n/pickLocale'
import { routing } from '@/i18n/routing'
import { formatPriceLabel } from '@/app/components/map/restaurantDetail.helpers'
import { buildBezirkFAQEntries } from '@/lib/bezirk-prose'
import styles from '../Bezirk.module.css'
import MapPromoCTA from '@/app/components/MapPromoCTA'
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
  const image = baseImage || `${SITE_URL}/pics/og-card.png`

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
    alternates: { canonical, languages },
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
  const faqEntries = buildBezirkFAQEntries({ bezirk: b, restaurants, locale: loc })

  // Stats: SPOTS + PREISE (2-up). When mustEatCount data lands on RestaurantCard
  // in the future, expand to SPOTS + MUST EATS + PREISE (3-up).
  const priceMins = restaurants
    .map(r => r.priceRange?.min)
    .filter((n): n is number => typeof n === 'number')
  const priceMaxs = restaurants
    .map(r => r.priceRange?.max)
    .filter((n): n is number => typeof n === 'number')
  const priceRangeLabel =
    priceMins.length > 0 && priceMaxs.length > 0
      ? `${Math.min(...priceMins)}–${Math.max(...priceMaxs)} €`
      : null
  const statsCols = priceRangeLabel ? 2 : 1
  const statsStyle = { ['--stats-cols' as string]: String(statsCols) } as React.CSSProperties

  const breadcrumbItems: BreadcrumbItem[] = [
    { name: de ? 'Start' : 'Home', href: '/' },
    { name: de ? 'Bezirke' : 'Districts' },
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

        <header className={styles.hero}>
          <div className={styles.kicker}>{de ? 'Bezirk' : 'District'}</div>
          <h1 className={styles.h1}>{b.name}</h1>
          {bezirkDescription ? (
            <p className={styles.sub}>{bezirkDescription}</p>
          ) : (
            <div className={styles.tagline}>
              {`Restaurants in ${b.name}`}
            </div>
          )}
          <MapPromoCTA variant="chip" kind="bezirk" name={b.name} mapHref={`/map?bezirk=${slug}`} locale={loc} />
        </header>

        <div className={styles.stats} style={statsStyle}>
          <div className={styles.statCell}>
            <div className={styles.statN}>{restaurants.length}</div>
            <div className={styles.statK}>Spots</div>
          </div>
          {priceRangeLabel && (
            <div className={styles.statCell}>
              <div className={styles.statN}>{priceRangeLabel}</div>
              <div className={styles.statK}>{de ? 'Preise' : 'Prices'}</div>
            </div>
          )}
        </div>

        <div className={styles.sectionHead}>
          <h2>{de ? 'Was du hier essen solltest' : 'What to eat here'}</h2>
          <p>{de
            ? 'Kuratiert vom Eat-This-Team.'
            : 'Curated by the Eat This team.'}</p>
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
                    {priceLabel && <span className={styles.price}>{priceLabel}</span>}
                  </div>
                  {cardLine && <p className={styles.cardTip}>{cardLine}</p>}
                </div>
              </Link>
            )
          })}
        </section>

        {faqEntries.length > 0 && (
          <section className={styles.faq} aria-label={de ? 'Häufige Fragen' : 'FAQ'}>
            <div className={styles.faqKicker}>{de ? 'Häufige Fragen' : 'Frequently asked'}</div>
            {faqEntries.map((entry, i) => (
              <details key={i} className={styles.faqRow}>
                <summary>
                  <span className={styles.faqQ}>{entry.question}</span>
                  <span className={styles.faqPlus} aria-hidden="true" />
                </summary>
                <p className={styles.faqA}>{entry.answer}</p>
              </details>
            ))}
          </section>
        )}

        <MapPromoCTA kind="bezirk" name={b.name} mapHref={`/map?bezirk=${slug}`} locale={loc} />

      </main>
    </>
  )
}
