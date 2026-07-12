import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { CSSProperties } from 'react'
import Image from 'next/image'
import { setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { getBezirkBySlug, getRestaurantsByBezirk, getAllBezirkeWithStats } from '@/lib/sanity.server'
import { buildBezirkJsonLd } from '@/lib/json-ld'
import { SITE_URL } from '@/lib/constants'
import { buildHreflangAlternates, toOgLocale } from '@/lib/seo/metadata'
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
  // Skip districts without open spots — their detail page 404s (see below).
  return routing.locales.flatMap(locale =>
    bezirke.filter(b => (b.restaurantCount ?? 0) > 0).map(b => ({ locale, slug: b.slug })),
  )
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const b = await getBezirkBySlug(slug)
  if (!b) return {}
  const de = locale === 'de'
  const loc = de ? 'de' : 'en'

  // Brandlos — das Layout-Template hängt „| Eat This Berlin" an (die
  // kuratierten seo.metaTitle sind ebenfalls brandlos).
  const fallbackTitleDe = `Beste Restaurants in ${b.name}`
  const fallbackTitleEn = `Best restaurants in ${b.name}`
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
  const image = baseImage || `${SITE_URL}/pics/og-card.png?v=4`

  const alternates = buildHreflangAlternates(`/bezirk/${slug}`, loc, { hasEnContent: hasEnContent(b) })

  return {
    title,
    description,
    robots: b.seo?.noIndex ? 'noindex,nofollow' : undefined,
    alternates,
    openGraph: {
      title,
      description,
      url: alternates.canonical,
      images: [{ url: image, width: 1200, height: 630, alt: b.name }],
      type: 'website',
      locale: toOgLocale(loc),
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
  // A district without spots renders hero + FAQ around an empty grid —
  // dead end + thin content. 404 until the first spot is curated; the page
  // reappears automatically via ISR once a restaurant references the bezirk.
  if (!b || restaurants.length === 0) notFound()

  const bezirkDescription = pickLocale(b.description, b.descriptionEn, loc)
  const faqEntries = buildBezirkFAQEntries({ bezirk: b, restaurants, locale: loc })
  const heroRestaurant = restaurants.find(restaurant => restaurant.photo)
  const heroImage = b.imageUrl ?? heroRestaurant?.photo
  const heroImageAlt = b.imageUrl
    ? (de ? `Essen in ${b.name}` : `Food in ${b.name}`)
    : heroRestaurant?.name ?? b.name
  const heroCaption = b.imageUrl
    ? b.name
    : [heroRestaurant?.name, heroRestaurant?.cuisineType].filter(Boolean).join(' · ')
  const districtTitleStyle = {
    '--district-title-size': `${Math.min(19, 150 / Math.max(b.name.length, 1))}cqi`,
  } as CSSProperties

  const breadcrumbItems: BreadcrumbItem[] = [
    { name: de ? 'Start' : 'Home', href: '/' },
    { name: de ? 'Bezirke' : 'Districts', href: '/bezirk' },
    { name: b.name },
  ]

  const jsonLd = buildBezirkJsonLd({
    bezirk: b,
    restaurants,
    locale,
    districtsLabel: de ? 'Bezirke' : 'Districts',
    faqs: faqEntries,
  })

  return (
    <>
      <script
        id={`schema-bezirk-${slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <main className={`${styles.page} ${styles.bezirkDetail}`}>
        <Breadcrumbs items={breadcrumbItems} ariaLabel={de ? 'Brotkrumen-Navigation' : 'Breadcrumb'} />

        <header className={`${styles.hero} ${styles.detailHero}`}>
          <div className={styles.detailHeroCopy}>
            <div className={styles.kicker}>{de ? 'Bezirk' : 'District'}</div>
            <h1 className={styles.h1} style={districtTitleStyle}>{b.name}</h1>
            <p className={styles.detailHeroDescription}>
              {bezirkDescription || (de
                ? `Die besten Restaurants in ${b.name}`
                : `The best restaurants in ${b.name}`)}
            </p>
            <div className={styles.detailHeroActions}>
              <MapPromoCTA variant="chip" kind="bezirk" name={b.name} mapHref={`/map?bezirk=${slug}`} locale={loc} />
              <a href="#restaurants" className={styles.detailHeroJump}>
                <span>{de ? 'Restaurants ansehen' : 'See restaurants'}</span>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M10 3v12M5 10l5 5 5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
          </div>
          {heroImage && (
            <figure className={styles.detailHeroMedia}>
              <div className={styles.detailHeroImage}>
                <Image
                  src={heroImage}
                  alt={heroImageAlt}
                  fill
                  priority
                  sizes="(max-width: 839px) 100vw, 48vw"
                />
              </div>
              {heroCaption && <figcaption>{heroCaption}</figcaption>}
            </figure>
          )}
        </header>

        <section id="restaurants" className={styles.restaurantSection}>
          <div className={styles.sectionHead}>
            <h2>{de ? 'Wo du essen solltest' : 'Where to eat'}</h2>
            <p>{de
              ? 'Kuratiert vom Eat-This-Team.'
              : 'Curated by the Eat This team.'}</p>
          </div>

          <div className={`${styles.grid} ${restaurants.length <= 2 ? styles.gridCompact : ''}`}>
            {restaurants.map(r => {
              const priceLabel = formatPriceLabel(r)
              const cardLine = pickLocale(r.shortDescription, r.shortDescriptionEn, loc)
                || pickLocale(r.tip, r.tipEn, loc)
              return (
                <Link key={r._id} href={`/restaurant/${r.slug}`} className={styles.card}>
                  {r.photo && (
                    <div className={styles.cardPhoto}>
                      <Image
                        src={r.photo}
                        alt={r.name}
                        fill
                        sizes="(max-width: 719px) 100vw, (max-width: 959px) 50vw, 34vw"
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
          </div>
        </section>

        <div className={styles.detailMapCta}>
          <MapPromoCTA kind="bezirk" name={b.name} mapHref={`/map?bezirk=${slug}`} locale={loc} />
        </div>

        {faqEntries.length > 0 && (
          <section className={styles.faq} aria-label={de ? 'Häufige Fragen' : 'FAQ'}>
            <h2 className={styles.faqTitle}>{de ? 'Häufige Fragen' : 'Frequently asked'}</h2>
            <div className={styles.faqList}>
              {faqEntries.map((entry, i) => (
                <details key={i} className={styles.faqRow}>
                  <summary>
                    <span className={styles.faqQ}>{entry.question}</span>
                    <span className={styles.faqPlus} aria-hidden="true" />
                  </summary>
                  <p className={styles.faqA}>{entry.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}

      </main>
    </>
  )
}
