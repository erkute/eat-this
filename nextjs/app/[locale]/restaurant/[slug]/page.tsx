import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Script from 'next/script'
import { setRequestLocale } from 'next-intl/server'
import { getRestaurantBySlug, getAllRestaurantSlugs, getMustEatsByRestaurant, getRestaurantsByBezirk, getRestaurantsByCategory } from '@/lib/sanity.server'
import { buildRestaurantJsonLd } from '@/lib/json-ld'
import { buildRestaurantTitle, truncateAtSentence } from '@/lib/seo/restaurantMeta'
import { siblingWindow } from '@/lib/seo/siblingWindow'
import { SITE_URL } from '@/lib/constants'
import { localeUrl } from '@/lib/locale-url'
import { routing } from '@/i18n/routing'
import { pickLocale, hasEnContent } from '@/lib/i18n/pickLocale'
import { formatPriceLabel, classifyWebsite } from '@/app/components/map/restaurantDetail.helpers'
import { buildFAQEntries, splitDescriptionForMagazine } from '@/lib/restaurant-prose'
import { getOpenStatus } from '@/lib/map/openingHours'
import MustEatTeaserSection from '@/app/components/MustEatTeaserSection'
import MapPromoCTA from '@/app/components/MapPromoCTA'
import RestaurantFAQ from '@/app/components/RestaurantFAQ'
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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const r = await getRestaurantBySlug(slug)
  if (!r) return {}
  const loc = locale === 'de' ? 'de' : 'en'

  const districtName = r.bezirk?.name ?? r.district ?? null

  const description = truncateAtSentence(
    pickLocale(
      r.seo?.metaDescription ||
        r.shortDescription ||
        r.tip ||
        r.description ||
        `${r.name} in Berlin${districtName ? `, ${districtName}` : ''}.`,
      r.seo?.metaDescriptionEn ||
        r.shortDescriptionEn ||
        r.tipEn ||
        r.descriptionEn ||
        undefined,
      loc,
    ) ?? '',
  )
  // Kuratierte Sanity-Titles sind brandlos und laufen wie bisher durchs
  // Layout-Template (`%s | Eat This Berlin`). Der Builder liefert den Brand
  // schon mit („| EAT THIS") und muss deshalb als absolute raus, sonst
  // doppelt das Template den Brand.
  const curatedTitle = pickLocale(r.seo?.metaTitle || undefined, r.seo?.metaTitleEn || undefined, loc)
  const builtTitle = buildRestaurantTitle({ name: r.name, cuisineType: r.cuisineType, district: districtName, locale: loc })
  const title = curatedTitle ?? builtTitle

  const baseImage = r.seo?.ogImageUrl || r.photo?.split('?')[0]
  const image = baseImage
    ? `${baseImage}?w=1200&h=630&fit=crop&auto=format`
    : `${SITE_URL}/pics/og-card.png`

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
    title: curatedTitle ?? { absolute: builtTitle },
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
  const [mustEats, siblingsBezirkRaw, siblingsCategoryRaw] = await Promise.all([
    getMustEatsByRestaurant(r._id),
    r.bezirk?.slug ? getRestaurantsByBezirk(r.bezirk.slug) : Promise.resolve([]),
    primaryCategory?.slug ? getRestaurantsByCategory(primaryCategory.slug) : Promise.resolve([]),
  ])

  const SIBLING_LIMIT = 3
  const siblingsBezirk = siblingWindow(siblingsBezirkRaw, slug, SIBLING_LIMIT)
  const bezirkSlugSet = new Set(siblingsBezirk.map(s => s.slug))
  const siblingsCategory = siblingWindow(siblingsCategoryRaw, slug, SIBLING_LIMIT * 2)
    .filter(s => !bezirkSlugSet.has(s.slug))
    .slice(0, SIBLING_LIMIT)
  const categoryDef = primaryCategory
    ? {
        slug: primaryCategory.slug,
        name: primaryCategory.name,
        nameEn: primaryCategory.nameEn,
      }
    : null

  const loc = locale === 'de' ? 'de' : 'en'
  const de = loc === 'de'

  const description = pickLocale(r.description, r.descriptionEn, loc) || ''
  const shortDescription = pickLocale(r.shortDescription, r.shortDescriptionEn, loc)
  const tipText = pickLocale(r.tip, r.tipEn, loc)
  const magazine = splitDescriptionForMagazine(description)
  const faqEntries = buildFAQEntries(r, loc)

  const openStatus =
    r.openingHours && r.openingHours.length > 0
      ? getOpenStatus(r.openingHours, new Date(), {
          open: de ? 'Jetzt geöffnet' : 'Open now',
          closed: de ? 'Jetzt geschlossen' : 'Closed now',
          opens: de ? 'öffnet' : 'opens',
          closes: de ? 'schließt' : 'closes',
        })
      : null

  const priceLabel = formatPriceLabel(r)
  const websiteInfo = classifyWebsite(r.website)
  const websiteUrl = websiteInfo?.url ?? null
  const address = r.address
  // Map CTAs land on the spot's district list (breadth over re-opening the
  // detail the user just read), falling back to the full map.
  const mapHref = r.bezirk?.slug ? `/map?bezirk=${r.bezirk.slug}` : '/map'

  const homeLabel = de ? 'Start' : 'Home'
  const districtsLabel = de ? 'Bezirke' : 'Districts'
  const breadcrumbItems: BreadcrumbItem[] = [
    { name: homeLabel, href: '/' },
    ...(r.bezirk?.slug && r.bezirk?.name
      ? [
          { name: districtsLabel },
          { name: r.bezirk.name },
        ]
      : []),
    { name: r.name },
  ]

  const jsonLd = buildRestaurantJsonLd({
    restaurant: r,
    locale,
    slug,
    description: shortDescription || description || tipText,
    districtsLabel,
    faqs: faqEntries,
  })

  return (
    <>
      <Script id={`schema-restaurant-${slug}`} type="application/ld+json" strategy="beforeInteractive">
        {jsonLd}
      </Script>
      <main className={styles.page}>
        <Breadcrumbs items={breadcrumbItems} ariaLabel={de ? 'Brotkrumen-Navigation' : 'Breadcrumb'} />

        {r.photo ? (
          <div className={styles.hero}>
            <Image
              src={r.photo}
              alt={r.name}
              fill
              priority
              sizes="(max-width: 720px) 100vw, 760px"
              className={styles.heroImg}
            />
            <div className={styles.heroGradient} />
            <div className={styles.heroOverlay}>
              <h1 className={styles.heroName}>
                {(() => {
                  const parts = r.name.trim().split(/\s+/)
                  if (parts.length <= 1) return r.name
                  return (
                    <>
                      {parts[0]}
                      <br />
                      {parts.slice(1).join(' ')}
                    </>
                  )
                })()}
              </h1>
              <div className={styles.heroTags}>
                {r.bezirk?.name && <span className={styles.chip}>{r.bezirk.name}</span>}
                {r.cuisineType && <span className={styles.chipAlt}>{r.cuisineType}</span>}
                {openStatus && (
                  <span className={`${styles.chipAlt} ${openStatus.isOpen ? styles.chipOpen : styles.chipClosed}`}>
                    {openStatus.label}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <h1 className={styles.name}>{r.name}</h1>
        )}

        {description && (
          <article className={styles.story}>
            <p className={styles.lede}>{magazine?.lede || description}</p>
            {magazine?.paragraphsBefore.map((p, i) => (
              <p key={`bf-${i}`}>{p}</p>
            ))}
            {magazine?.midQuote && (
              <blockquote className={styles.pullQuote}>{magazine.midQuote}</blockquote>
            )}
            {magazine?.paragraphsAfter.map((p, i) => (
              <p key={`af-${i}`}>{p}</p>
            ))}
          </article>
        )}

        {tipText && (
          <aside className={styles.tipp}>
            <div className={styles.tippLabel}>{de ? 'Insider Tipp' : 'Insider Tip'}</div>
            <p className={styles.tippText}>{tipText}</p>
          </aside>
        )}

        <dl className={styles.facts}>
          {address && (
            <div className={styles.factsRow}>
              <dt className={styles.factsKey}>{de ? 'Adresse' : 'Address'}</dt>
              <dd className={styles.factsVal}>
                {(() => {
                  const idx = address.indexOf(',')
                  if (idx === -1) return address
                  return (
                    <>
                      {address.slice(0, idx).trim()}
                      <br />
                      {address.slice(idx + 1).trim()}
                    </>
                  )
                })()}
              </dd>
            </div>
          )}
          {r.openingHours && r.openingHours.length > 0 && (
            <div className={styles.factsRow}>
              <dt className={styles.factsKey}>{de ? 'Öffnungs­zeiten' : 'Hours'}</dt>
              <dd className={`${styles.factsVal} ${styles.hours}`}>
                {r.openingHours.map((slot, i) => [
                  <span key={`d-${i}`} className={styles.hoursDay}>{slot.days}</span>,
                  <span key={`t-${i}`} className={styles.hoursTime}>{slot.hours}</span>,
                ])}
              </dd>
            </div>
          )}
          {priceLabel && (
            <div className={styles.factsRow}>
              <dt className={styles.factsKey}>{de ? 'Preis' : 'Price'}</dt>
              <dd className={styles.factsVal}>{priceLabel}</dd>
            </div>
          )}
        </dl>

        {/* Map entry lives in the big MapPromoCTA banner below — no second
            "Map öffnen" button up here. */}
        {websiteUrl && (
          <div className={styles.acts}>
            <a className={`${styles.act} ${styles.actPrimary}`} href={websiteUrl} target="_blank" rel="noopener nofollow noreferrer">
              Website
            </a>
          </div>
        )}

        {mustEats.length > 0 && (
          <MustEatTeaserSection mustEats={mustEats} locale={loc} />
        )}

        <MapPromoCTA kind="restaurant" name={r.name} mapHref={mapHref} locale={loc} />

        <RestaurantFAQ entries={faqEntries} locale={loc} />

        {(siblingsBezirk.length > 0 || siblingsCategory.length > 0) && (
          <section className={styles.siblings}>
            <h2>{de ? 'Mehr in Berlin' : 'More in Berlin'}</h2>
            {siblingsBezirk.length > 0 && r.bezirk?.name && (
              <div className={styles.sibRow}>
                <h3 className={styles.sibRowHead}>
                  {de ? `Weitere in ${r.bezirk.name}` : `More in ${r.bezirk.name}`}
                </h3>
                <div className={styles.sibCards}>
                  {siblingsBezirk.map(s => (
                    <IntlLink key={s._id} href={`/restaurant/${s.slug}`} className={styles.sibCard}>
                      {s.photo && (
                        <div className={styles.sibPhoto}>
                          <Image src={s.photo} alt={s.name} fill sizes="33vw" />
                        </div>
                      )}
                      <span className={styles.sibName}>{s.name}</span>
                      {s.cuisineType && <span className={styles.sibMeta}>{s.cuisineType}</span>}
                    </IntlLink>
                  ))}
                </div>
              </div>
            )}
            {siblingsCategory.length > 0 && categoryDef && (
              <div className={styles.sibRow}>
                <h3 className={styles.sibRowHead}>
                  {de ? `Mehr ${categoryDef.name}` : `More ${(categoryDef.nameEn || categoryDef.name).toLowerCase()}`}
                </h3>
                <div className={styles.sibCards}>
                  {siblingsCategory.map(s => (
                    <IntlLink key={s._id} href={`/restaurant/${s.slug}`} className={styles.sibCard}>
                      {s.photo && (
                        <div className={styles.sibPhoto}>
                          <Image src={s.photo} alt={s.name} fill sizes="33vw" />
                        </div>
                      )}
                      <span className={styles.sibName}>{s.name}</span>
                      {s.cuisineType && <span className={styles.sibMeta}>{s.cuisineType}</span>}
                    </IntlLink>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

      </main>
    </>
  )
}
