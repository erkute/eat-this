import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { setRequestLocale } from 'next-intl/server'
import { getRestaurantsByCategory, getCategoryBySlug, getAllCategories } from '@/lib/sanity.server'
import { localizedCategoryName, localizedCategoryBlurb } from '@/lib/categories'
import { buildCategoryTitle, buildCategoryDescription } from '@/lib/seo/categoryMeta'
import { buildKategorieQuickFacts, buildKategorieFAQEntries } from '@/lib/kategorie-prose'
import { categoryDistrictLinks } from '@/lib/seo/crossLinks'
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

// Square (1:1) pack-card social images so Google's square SERP thumbnail
// shows the FULL packet (padded on brand yellow) instead of center-cropping
// the portrait booster art and cutting off the bottom. One per category slug;
// bump the version to force re-fetch by Google/social caches.
const PACK_OG_SLUGS = new Set([
  'breakfast', 'coffee', 'dinner', 'drinks', 'fast-food',
  'fine-dining', 'lunch', 'pizza', 'sweets',
])
const PACK_OG_VERSION = 1

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
  const restaurants = await getRestaurantsByCategory(c.slug)
  // Brandlos — das Layout-Template hängt „| Eat This Berlin" an.
  // Suchsprache statt Katalog-Label: „Die beste Pizza in Berlin".
  const title = buildCategoryTitle(slug, label, loc)
  const description = buildCategoryDescription({
    blurb: localizedCategoryBlurb(c, loc),
    restaurants,
    locale: loc,
  })
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
      ...(PACK_OG_SLUGS.has(slug) && {
        images: [
          {
            url: `${SITE_URL}/pics/og/og_${slug}.png?v=${PACK_OG_VERSION}`,
            width: 1200,
            height: 1200,
            alt: `${label} Pack — Eat This Berlin`,
          },
        ],
      }),
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
  const quickFacts = buildKategorieQuickFacts({ label, restaurants, locale: loc })
  const districtLinks = categoryDistrictLinks(restaurants)
  const faqEntries = buildKategorieFAQEntries({ label, restaurants, locale: loc })

  const breadcrumbItems: BreadcrumbItem[] = [
    { name: de ? 'Start' : 'Home', href: '/' },
    { name: de ? 'Kategorien' : 'Categories' },
    { name: label },
  ]

  const restaurantUrl = (rSlug: string) =>
    locale === 'de' ? `/restaurant/${rSlug}` : `/${locale}/restaurant/${rSlug}`
  const bezirkUrl = (bSlug: string) =>
    locale === 'de' ? `/bezirk/${bSlug}` : `/${locale}/bezirk/${bSlug}`

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
      ...(faqEntries.length > 0
        ? [{
            '@type': 'FAQPage',
            mainEntity: faqEntries.map(entry => ({
              '@type': 'Question',
              name: entry.question,
              acceptedAnswer: { '@type': 'Answer', text: entry.answer },
            })),
          }]
        : []),
      {
        '@type': 'ItemList',
        name: buildCategoryTitle(slug, label, loc),
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
      <script
        id={`schema-kategorie-${slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <main className={styles.page}>
        <Breadcrumbs items={breadcrumbItems} ariaLabel={de ? 'Brotkrumen-Navigation' : 'Breadcrumb'} />

        <header className={styles.hero}>
          <div className={styles.kicker}>{de ? 'Kategorie' : 'Category'}</div>
          <h1 className={styles.h1}>{label}</h1>
          <div className={styles.tagline}>{de ? 'Die besten Spots in Berlin' : 'The best spots in Berlin'}</div>
          {blurb && <p className={styles.sub}>{blurb}</p>}
          {quickFacts && <p className={styles.sub}>{quickFacts}</p>}
          <MapPromoCTA variant="chip" kind="kategorie" name={label} mapHref={`/map?cat=${slug}`} locale={loc} />
        </header>

        {districtLinks.length > 0 && (
          <nav className={styles.crossLinks} aria-label={de ? `${label} nach Bezirk` : `${label} by district`}>
            <span className={styles.crossLinksHead}>
              {de ? `${label} nach Bezirk:` : `${label} by district:`}
            </span>
            {districtLinks.map(b => (
              <Link key={b.slug} href={bezirkUrl(b.slug)} className={styles.crossLink}>
                {b.label}
              </Link>
            ))}
          </nav>
        )}

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

      </main>
    </>
  )
}
