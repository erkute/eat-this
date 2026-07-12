import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import { setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { getRestaurantsByCategory, getCategoryBySlug, getAllCategories } from '@/lib/sanity.server'
import { localizedCategoryName, localizedCategoryBlurb } from '@/lib/categories'
import { buildCategoryTitle, buildCategoryDescription } from '@/lib/seo/categoryMeta'
import { buildKategorieQuickFacts, buildKategorieFAQEntries } from '@/lib/kategorie-prose'
import { categoryDistrictLinks } from '@/lib/seo/crossLinks'
import { formatPriceLabel } from '@/app/components/map/restaurantDetail.helpers'
import { serializeJsonLd } from '@/lib/json-ld'
import { SITE_URL } from '@/lib/constants'
import { localeUrl } from '@/lib/locale-url'
import { buildHreflangAlternates, toOgLocale } from '@/lib/seo/metadata'
import { routing } from '@/i18n/routing'
import { pickLocale } from '@/lib/i18n/pickLocale'
import sharedStyles from '../../bezirk/Bezirk.module.css'
import styles from '../Kategorie.module.css'
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
const PACK_OG_VERSION = 2

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
  const alternates = buildHreflangAlternates(`/kategorie/${slug}`, de ? 'de' : 'en')
  return {
    title,
    description,
    alternates,
    openGraph: {
      title,
      description,
      url: alternates.canonical,
      type: 'website',
      locale: toOgLocale(de ? 'de' : 'en'),
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
    { name: de ? 'Start' : 'Home', href: '/', logo: 'eat-this' },
    { name: de ? 'Kategorien' : 'Categories', href: '/kategorie' },
    { name: label },
  ]

  const restaurantUrl = (rSlug: string) => `/restaurant/${rSlug}`
  const bezirkUrl = (bSlug: string) => `/bezirk/${bSlug}`

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
              url: localeUrl(locale, restaurantUrl(r.slug)),
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
      <main className={`${sharedStyles.page} ${sharedStyles.bezirkDetail} ${styles.detailPage}`}>
        <div className={styles.breadcrumbWrap}>
          <Breadcrumbs items={breadcrumbItems} ariaLabel={de ? 'Brotkrumen-Navigation' : 'Breadcrumb'} />
        </div>

        <header className={styles.detailHero}>
          <div className={styles.detailHeroCopy}>
            <div className={styles.kicker}>{de ? 'Kategorie' : 'Category'}</div>
            <h1 className={styles.detailTitle}>{label}</h1>
            <p className={styles.detailLead}>
              {blurb || (de ? 'Die besten Spots in Berlin.' : 'The best spots in Berlin.')}
            </p>
            {quickFacts && <p className={styles.quickFacts}>{quickFacts}</p>}
            <div className={sharedStyles.detailHeroActions}>
              <MapPromoCTA variant="chip" kind="kategorie" name={label} mapHref={`/map?cat=${slug}`} locale={loc} />
              <a href="#restaurants" className={sharedStyles.detailHeroJump}>
                <span>{de ? 'Spots ansehen' : 'See spots'}</span>
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                  <path d="M10 3v12M5 10l5 5 5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
          </div>

          <KategorieBoost categorySlug={c.slug} categoryName={label} locale={loc} />
        </header>

        {districtLinks.length > 0 && (
          <nav className={sharedStyles.crossLinks} aria-label={de ? `${label} nach Bezirk` : `${label} by district`}>
            <span className={sharedStyles.crossLinksHead}>
              {de ? `${label} nach Bezirk:` : `${label} by district:`}
            </span>
            {districtLinks.map(b => (
              <Link key={b.slug} href={bezirkUrl(b.slug)} className={sharedStyles.crossLink}>
                {b.label}
              </Link>
            ))}
          </nav>
        )}

        <section id="restaurants" className={sharedStyles.restaurantSection}>
          <div className={sharedStyles.sectionHead}>
            <h2>{de ? 'Die handverlesene Auswahl' : 'The hand-picked selection'}</h2>
            <p>{de
              ? 'Kuratiert vom Eat-This-Team.'
              : 'Curated by the Eat This team.'}</p>
          </div>

          <div className={`${sharedStyles.grid} ${restaurants.length <= 2 ? sharedStyles.gridCompact : ''}`}>
            {restaurants.map(r => {
              const priceLabel = formatPriceLabel(r)
              const cardLine = pickLocale(r.shortDescription, r.shortDescriptionEn, loc)
                || pickLocale(r.tip, r.tipEn, loc)
              return (
                <Link key={r._id} href={restaurantUrl(r.slug)} className={sharedStyles.card}>
                  {r.photo && (
                    <div className={sharedStyles.cardPhoto}>
                      <Image
                        src={r.photo}
                        alt={r.name}
                        fill
                        sizes="(max-width: 719px) 100vw, (max-width: 959px) 50vw, 34vw"
                      />
                    </div>
                  )}
                  <div className={sharedStyles.cardBody}>
                    <h3 className={sharedStyles.cardName}>{r.name}</h3>
                    <div className={sharedStyles.cardMeta}>
                      {r.cuisineType && <span className={sharedStyles.chipYellow}>{r.cuisineType}</span>}
                      {r.district && <span className={styles.districtLabel}>{r.district}</span>}
                      {priceLabel && <span className={sharedStyles.price}>{priceLabel}</span>}
                    </div>
                    {cardLine && <p className={sharedStyles.cardTip}>{cardLine}</p>}
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        <div className={sharedStyles.detailMapCta}>
          <MapPromoCTA kind="kategorie" name={label} mapHref={`/map?cat=${slug}`} locale={loc} />
        </div>

        {faqEntries.length > 0 && (
          <section className={sharedStyles.faq} aria-label={de ? 'Häufige Fragen' : 'FAQ'}>
            <h2 className={sharedStyles.faqTitle}>{de ? 'Häufige Fragen' : 'Frequently asked'}</h2>
            <div className={sharedStyles.faqList}>
              {faqEntries.map((entry, i) => (
                <details key={i} className={sharedStyles.faqRow}>
                  <summary>
                    <span className={sharedStyles.faqQ}>{entry.question}</span>
                    <span className={sharedStyles.faqPlus} aria-hidden="true" />
                  </summary>
                  <p className={sharedStyles.faqA}>{entry.answer}</p>
                </details>
              ))}
            </div>
          </section>
        )}

      </main>
    </>
  )
}
