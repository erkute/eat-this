import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import { setRequestLocale } from 'next-intl/server'
import { getRestaurantBySlug, getAllRestaurantSlugs, getLatestNewsArticles, getMustEatsByRestaurant, getRestaurantsByBezirk, getRestaurantsByCategory } from '@/lib/sanity.server'
import { buildRestaurantJsonLd } from '@/lib/json-ld'
import { SITE_URL } from '@/lib/constants'
import { routing } from '@/i18n/routing'
import { pickLocale, hasEnContent } from '@/lib/i18n/pickLocale'
import { localizedCategoryName } from '@/lib/categories'
import DetailPageOutro from '@/app/components/DetailPageOutro'
import MustEatTeaserSection from '@/app/components/MustEatTeaserSection'
import Breadcrumbs, { type BreadcrumbItem } from '@/app/components/Breadcrumbs'
import { Link as IntlLink } from '@/i18n/navigation'
import styles from './RestaurantDetail.module.css'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateStaticParams() {
  const slugs = await getAllRestaurantSlugs()
  return routing.locales.flatMap(locale =>
    slugs.map(slug => ({ locale, slug })),
  )
}

export const revalidate = 3600

function localeUrl(locale: string, path: string): string {
  return locale === 'de' ? `${SITE_URL}${path}` : `${SITE_URL}/${locale}${path}`
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const r = await getRestaurantBySlug(slug)
  if (!r) return {}
  const loc = locale === 'de' ? 'de' : 'en'

  const description = pickLocale(
    r.seo?.metaDescription ||
      r.shortDescription ||
      r.description ||
      r.tip ||
      `${r.name} in Berlin${r.district ? `, ${r.district}` : ''}.`,
    r.seo?.metaDescriptionEn ||
      r.shortDescriptionEn ||
      r.descriptionEn ||
      r.tipEn ||
      undefined,
    loc,
  )
  const title = pickLocale(
    r.seo?.metaTitle || `${r.name} — Eat This Berlin`,
    r.seo?.metaTitleEn || undefined,
    loc,
  )

  const baseImage = r.seo?.ogImageUrl || r.photo?.split('?')[0]
  const image = baseImage
    ? `${baseImage}?w=1200&h=630&fit=crop&auto=format`
    : `${SITE_URL}/pics/hero_desktop1.webp`

  // When EN content exists, restore self-canonical + reciprocal hreflang.
  // Without EN content, keep the deOnly workaround (both canonicals → DE,
  // no EN alternate) so Google doesn't see /en as a duplicate.
  const hasEn = hasEnContent(r)
  const canonical = hasEn
    ? localeUrl(loc, `/restaurant/${slug}`)
    : localeUrl('de', `/restaurant/${slug}`)

  const languages: Record<string, string> = {
    de: localeUrl('de', `/restaurant/${slug}`),
    'x-default': localeUrl('de', `/restaurant/${slug}`),
  }
  if (hasEn) languages.en = localeUrl('en', `/restaurant/${slug}`)

  return {
    title,
    description,
    robots: r.seo?.noIndex ? 'noindex,nofollow' : undefined,
    alternates: {
      canonical,
      languages,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      images: [{ url: image, width: 1200, height: 630, alt: r.name }],
      type: 'website',
      locale: loc === 'de' ? 'de_DE' : 'en_US',
    },
  }
}

export default async function RestaurantPage({ params }: PageProps) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const r = await getRestaurantBySlug(slug)
  if (!r) notFound()
  const primaryCategory = r.categories?.[0] ?? null
  const [latestNews, mustEats, siblingsBezirkRaw, siblingsCategoryRaw] = await Promise.all([
    getLatestNewsArticles(2),
    getMustEatsByRestaurant(r._id),
    r.bezirk?.slug ? getRestaurantsByBezirk(r.bezirk.slug) : Promise.resolve([]),
    primaryCategory?.slug ? getRestaurantsByCategory(primaryCategory.slug) : Promise.resolve([]),
  ])

  const SIBLING_LIMIT = 8
  const siblingsBezirk = siblingsBezirkRaw.filter(s => s.slug !== slug).slice(0, SIBLING_LIMIT)
  const siblingsCategoryAll = siblingsCategoryRaw.filter(s => s.slug !== slug)
  // De-dupe: don't re-show a restaurant in both rows
  const bezirkSlugSet = new Set(siblingsBezirk.map(s => s.slug))
  const siblingsCategory = siblingsCategoryAll.filter(s => !bezirkSlugSet.has(s.slug)).slice(0, SIBLING_LIMIT)
  const categoryDef = primaryCategory
    ? {
        slug: primaryCategory.slug,
        name: primaryCategory.name,
        nameEn: primaryCategory.nameEn,
      }
    : null

  const loc = locale === 'de' ? 'de' : 'en'
  const de = loc === 'de'

  const description = pickLocale(r.description, r.descriptionEn, loc)
  const shortDescription = pickLocale(r.shortDescription, r.shortDescriptionEn, loc)
  const tip = pickLocale(r.tip, r.tipEn, loc)

  const homeLabel = de ? 'Start' : 'Home'
  const districtsLabel = de ? 'Bezirke' : 'Districts'
  const breadcrumbItems: BreadcrumbItem[] = [
    { name: homeLabel, href: '/' },
    ...(r.bezirk?.slug && r.bezirk?.name
      ? [
          { name: districtsLabel, href: '/bezirk' },
          { name: r.bezirk.name, href: `/bezirk/${r.bezirk.slug}` },
        ]
      : []),
    { name: r.name },
  ]

  const jsonLd = buildRestaurantJsonLd({
    restaurant: r,
    locale,
    slug,
    description: shortDescription || description || tip,
    districtsLabel,
  })

  return (
    <>
      {/* JSON-LD: serializeJsonLd sanitizes output — safe inline structured data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <main className={styles.page}>
        <div className={styles.hero}>
          {r.photo && (
            <Image
              src={r.photo}
              alt={r.name}
              fill
              priority
              sizes="(max-width: 720px) 100vw, 720px"
              className={styles.heroImage}
            />
          )}
          {r.photo && (
            <span className={styles.heroCredit} aria-label="Photo credit">
              via Instagram
            </span>
          )}
        </div>

        <div className={styles.content}>
          <Breadcrumbs items={breadcrumbItems} ariaLabel={de ? 'Brotkrumen-Navigation' : 'Breadcrumb'} />
          <div className={styles.layout}>
            <header className={styles.header}>
              <h1 className={styles.name}>{r.name}</h1>
              <div className={styles.meta}>
                {r.district && <span className={styles.district}>{r.district}</span>}
              </div>
              {r.cuisineType && <p className={styles.cuisine}>{r.cuisineType}</p>}
              {((r.categories && r.categories.length > 0) || r.price) && (
                <div className={styles.categories}>
                  {r.price && <span className={styles.price}>{r.price}</span>}
                  {r.categories?.map(cat => (
                    <span key={cat.slug} className={styles.category}>
                      {localizedCategoryName(cat, loc)}
                    </span>
                  ))}
                </div>
              )}
            </header>

            {description && <p className={styles.description}>{description}</p>}

            {tip && (
              <div className={styles.tip}>
                <strong>{de ? 'Insider-Tipp' : 'Insider Tip'}: </strong>
                {tip}
              </div>
            )}

            <aside className={styles.sidebar}>
              {r.address && (
                <section>
                  <h2 className={styles.sectionTitle}>{de ? 'Adresse' : 'Address'}</h2>
                  <a
                    href={r.mapsUrl ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.address}
                  >
                    {r.address}
                  </a>
                </section>
              )}

              {r.openingHours && r.openingHours.length > 0 && (
                <section>
                  <h2 className={styles.sectionTitle}>{de ? 'Öffnungszeiten' : 'Opening Hours'}</h2>
                  <ul className={styles.hours}>
                    {r.openingHours.map((slot, i) => (
                      <li key={i} className={styles.hourRow}>
                        <span className={styles.days}>{slot.days}</span>
                        <span>{slot.hours}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <div className={styles.links}>
                <IntlLink
                  href={`/map?r=${r.slug}`}
                  className={`${styles.link} ${styles.linkPrimary} ${styles.linkBrand}`}
                  aria-label="Eat This Map"
                >
                  <span className={styles.linkBrandWordmark} aria-hidden="true" />
                  <span className={styles.linkBrandSuffix} aria-hidden="true">Map</span>
                </IntlLink>
                {r.reservationUrl && (
                  <a href={r.reservationUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>
                    {de ? 'Reservieren' : 'Reserve a Table'}
                  </a>
                )}
                {r.website && (
                  <a href={r.website} target="_blank" rel="noopener noreferrer" className={styles.link}>
                    Website
                  </a>
                )}
                {r.mapsUrl && (
                  <a href={r.mapsUrl} target="_blank" rel="noopener noreferrer" className={styles.link}>
                    Google Maps
                  </a>
                )}
              </div>
            </aside>

            <div className={styles.musteats}>
              <MustEatTeaserSection mustEats={mustEats} locale={loc} />
            </div>
          </div>
        </div>

        {r.bezirk?.slug && r.bezirk?.name && (
          <DetailPageOutro
            bezirkSlug={r.bezirk.slug}
            bezirkName={r.bezirk.name}
            latestNews={latestNews}
            locale={loc}
            siblingsBezirk={siblingsBezirk}
            siblingsCategory={siblingsCategory}
            categoryDef={categoryDef}
          />
        )}
      </main>
    </>
  )
}
