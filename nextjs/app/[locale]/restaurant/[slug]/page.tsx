import { notFound, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import { setRequestLocale } from 'next-intl/server'
import { getRestaurantBySlug, getAllRestaurantSlugs, getAllRestaurantsLite, getMustEatsByRestaurant, getRestaurantSiblingCandidates } from '@/lib/sanity.server'
import { resolveLegacyRestaurantSlug } from '@/lib/seo/legacyRedirects'
import { buildRestaurantJsonLd } from '@/lib/json-ld'
import { buildRestaurantTitle, buildOrderPromiseDescription, truncateAtSentence } from '@/lib/seo/restaurantMeta'
import { SITE_URL } from '@/lib/constants'
import { normalizeName } from '@/lib/normalizeName'
import { buildHreflangAlternates, toOgLocale } from '@/lib/seo/metadata'
import { routing } from '@/i18n/routing'
import { pickLocale, hasEnContent } from '@/lib/i18n/pickLocale'
import { formatPriceLabel, classifyWebsite } from '@/app/components/map/restaurantDetail.helpers'
import { buildFAQEntries, splitDescriptionForMagazine } from '@/lib/restaurant-prose'
import { getOpenStatus } from '@/lib/map/openingHours'
import HeartButton from '@/app/components/HeartButton'
import HeartCount from '@/app/components/HeartCount'
import MustEatTeaserSection from '@/app/components/MustEatTeaserSection'
import MapPromoCTA from '@/app/components/MapPromoCTA'
import MapIntentLink from '@/app/components/MapIntentLink'
import RestaurantFAQ from '@/app/components/RestaurantFAQ'
import Breadcrumbs, { type BreadcrumbItem } from '@/app/components/Breadcrumbs'
import { Link as IntlLink } from '@/i18n/navigation'
import styles from './RestaurantDetail.module.css'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

function safeCreditUrl(url: string | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? url : null
  } catch {
    return null
  }
}

function imageAssetKey(url: string | undefined): string {
  return url?.split('?')[0] ?? ''
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

  // Antwort-Versprechen aus den whatToOrder-Empfehlungen: schlägt die
  // beschreibenden Fallbacks, kuratierte seo.metaDescription gewinnt weiter.
  const orderDishes = (r.whatToOrder ?? []).map(i => i.dish)
  const orderPriceLabel = formatPriceLabel(r)
  const orderPromiseDe = buildOrderPromiseDescription({ name: r.name, dishes: orderDishes, priceLabel: orderPriceLabel, locale: 'de' })
  const orderPromiseEn = buildOrderPromiseDescription({ name: r.name, dishes: orderDishes, priceLabel: orderPriceLabel, locale: 'en' })

  const description = truncateAtSentence(
    pickLocale(
      r.seo?.metaDescription ||
        orderPromiseDe ||
        r.shortDescription ||
        r.tip ||
        r.description ||
        `${r.name} in Berlin${districtName ? `, ${districtName}` : ''}.`,
      r.seo?.metaDescriptionEn ||
        orderPromiseEn ||
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

  // Branded share card — the dynamic OG route overlays name + cuisine + district
  // on the restaurant photo (and falls back to a brand card when there is none),
  // which previews far stronger on social than the bare photo did.
  const ogImage = `${SITE_URL}/api/og/restaurant?slug=${slug}`

  const alternates = buildHreflangAlternates(`/restaurant/${slug}`, loc, { hasEnContent: hasEnContent(r) })

  return {
    title: curatedTitle ?? { absolute: builtTitle },
    description,
    robots: r.seo?.noIndex ? 'noindex,nofollow' : undefined,
    alternates,
    openGraph: {
      title,
      description,
      url: alternates.canonical,
      images: [{ url: ogImage, width: 1200, height: 630, alt: r.name }],
      type: 'website',
      locale: toOgLocale(loc),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

export default async function RestaurantPage({ params }: PageProps) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const r = await getRestaurantBySlug(slug)
  if (!r) {
    // Post-rebuild slug migration: try to 301 an old/404 slug to its current
    // page before giving up. See lib/seo/legacyRedirects.ts.
    const dest = resolveLegacyRestaurantSlug(slug, await getAllRestaurantsLite())
    if (dest && dest !== slug) {
      permanentRedirect(locale === 'de' ? `/restaurant/${dest}` : `/${locale}/restaurant/${dest}`)
    }
    notFound()
  }
  const primaryCategory = r.categories?.[0] ?? null
  const SIBLING_LIMIT = 3
  const [mustEats, siblingCandidates] = await Promise.all([
    getMustEatsByRestaurant(r._id),
    getRestaurantSiblingCandidates({
      selfSlug: slug,
      selfName: r.name,
      bezirkSlug: r.bezirk?.slug,
      categorySlug: primaryCategory?.slug,
      bezirkLimit: SIBLING_LIMIT,
      categoryLimit: SIBLING_LIMIT * 2,
    }),
  ])

  const siblingsBezirk = siblingCandidates.bezirk
  const bezirkSlugSet = new Set(siblingsBezirk.map(s => s.slug))
  const siblingsCategory = siblingCandidates.category
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
  const displayName = normalizeName(r.name)
  const magazine = splitDescriptionForMagazine(description)
  const faqEntries = buildFAQEntries(r, loc)
  const orderItems = (r.whatToOrder ?? []).filter(i => i?.dish?.trim())
  const heroAssetKey = imageAssetKey(r.photo)
  const galleryImages = [
    ...(r.photo
      ? [{
          _key: `${r._id}-hero`,
          thumb: r.photo,
          full: r.photo,
          alt: r.name,
          credit: r.photoCredit,
          creditUrl: r.photoCreditUrl,
        }]
      : []),
    ...(r.gallery ?? [])
      .filter(img => img?.thumb && img?.full)
      .filter(img => imageAssetKey(img.full) !== heroAssetKey),
  ]

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
  const mapHref = `/map?r=${slug}`

  const homeLabel = de ? 'Start' : 'Home'
  const districtsLabel = de ? 'Bezirke' : 'Districts'
  const breadcrumbItems: BreadcrumbItem[] = [
    { name: homeLabel, href: '/', logo: 'eat-this' },
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
    description: shortDescription || description || tipText,
    districtsLabel,
    faqs: faqEntries,
  })

  return (
    <>
      <script
        id={`schema-restaurant-${slug}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <main className={styles.page}>
        <div className={styles.breadcrumbWrap}>
          <Breadcrumbs items={breadcrumbItems} ariaLabel={de ? 'Brotkrumen-Navigation' : 'Breadcrumb'} />
        </div>

        <header className={r.photo ? styles.hero : styles.heroNoPhoto}>
          {r.photo && (
            <figure className={styles.heroPhoto}>
              <Image
                src={r.photo}
                alt={r.name}
                fill
                priority
                sizes="(max-width: 760px) 100vw, 1180px"
                className={styles.heroImg}
              />
              <div className={styles.heroGradient} />
              {/* Public heart count — badge in the photo corner (≥ 1 only) */}
              <HeartCount restaurantId={r._id} className={styles.heroHeartBadge} />
              <HeartButton
                restaurantId={r._id}
                name={r.name}
                slug={slug}
                photo={r.photo ?? undefined}
                district={r.bezirk?.name ?? undefined}
                locale={loc}
              />
              <figcaption className={styles.heroCaption}>
                <h1 className={styles.heroName}>{displayName}</h1>
              </figcaption>
            </figure>
          )}

          <div className={styles.heroOverlay}>
            {!r.photo && <h1 className={styles.name}>{displayName}</h1>}
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
        </header>

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

        {galleryImages.length > 0 && (
          <section className={styles.gallery} aria-label={de ? 'Galerie' : 'Gallery'}>
            {galleryImages.map((img, i) => {
              const creditHref = safeCreditUrl(img.creditUrl)
              return (
                <figure key={img._key} className={styles.galleryItem}>
                  <Image
                    src={img.thumb ?? img.full ?? ''}
                    alt={img.alt || `${displayName} ${de ? 'Foto' : 'photo'} ${i + 1}`}
                    fill
                    sizes={i === 0 ? '(max-width: 700px) 82vw, 560px' : '(max-width: 700px) 68vw, 280px'}
                    className={styles.galleryImg}
                  />
                  {img.credit && (
                    <figcaption className={styles.galleryCredit}>
                      {creditHref ? (
                        <a href={creditHref} target="_blank" rel="noopener noreferrer">
                          {img.credit}
                        </a>
                      ) : (
                        img.credit
                      )}
                    </figcaption>
                  )}
                </figure>
              )
            })}
          </section>
        )}

        {(tipText || orderItems.length > 0) && (
          <div className={styles.editorialGrid}>
            {tipText && (
              <aside className={styles.tipp}>
                <div className={styles.tippLabel}>{de ? 'Insider Tipp' : 'Insider Tip'}</div>
                <p className={styles.tippText}>{tipText}</p>
              </aside>
            )}

            {orderItems.length > 0 && (
              <section className={styles.order} aria-label={de ? 'Was bestellen?' : 'What to order?'}>
                <h2 className={styles.orderHead}>{de ? 'Was bestellen?' : 'What to order?'}</h2>
                <ul className={styles.orderList}>
                  {orderItems.map(item => {
                    const note = pickLocale(item.note, item.noteEn, loc)
                    return (
                      <li key={item.dish} className={styles.orderItem}>
                        <div className={styles.orderTop}>
                          <span className={styles.orderDish}>{item.dish}</span>
                          {item.price && <span className={styles.orderPrice}>{item.price}</span>}
                        </div>
                        {note && <p className={styles.orderNote}>{note}</p>}
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}
          </div>
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

        <div className={styles.acts}>
          <MapIntentLink href={mapHref} rel="nofollow" className={`${styles.act} ${styles.actPrimary}`}>
            {de ? 'Auf der Map öffnen' : 'Open on the map'}
          </MapIntentLink>
          {websiteUrl && (
            <a className={styles.act} href={websiteUrl} target="_blank" rel="noopener nofollow noreferrer">
              Website
            </a>
          )}
          {r.menuUrl && (
            <a className={styles.act} href={r.menuUrl} target="_blank" rel="noopener nofollow noreferrer">
              {de ? 'Speisekarte' : 'Menu'}
            </a>
          )}
        </div>

        {mustEats.length > 0 && (
          <MustEatTeaserSection mustEats={mustEats} locale={loc} />
        )}

        <MapPromoCTA kind="restaurant" name={r.name} mapHref={mapHref} locale={loc} />

        <RestaurantFAQ entries={faqEntries} locale={loc} />

        {(siblingsBezirk.length > 0 || siblingsCategory.length > 0) && (
          <section className={styles.siblings}>
            {siblingsBezirk.length > 0 && r.bezirk?.name && (
              <div className={styles.sibRow}>
                <h2 className={styles.sibRowHead}>
                  {de ? `Weitere in ${r.bezirk.name}` : `More in ${r.bezirk.name}`}
                </h2>
                <div className={styles.sibCards}>
                  {siblingsBezirk.map(s => (
                    <IntlLink key={s._id} href={`/restaurant/${s.slug}`} className={styles.sibCard}>
                      {s.photo && (
                        <div className={styles.sibPhoto}>
                          <Image src={s.photo} alt={s.name} fill sizes="33vw" />
                        </div>
                      )}
                      <span className={styles.sibOverlay}>
                        <span className={styles.sibName}>{normalizeName(s.name)}</span>
                        {s.cuisineType && <span className={styles.sibMeta}>{s.cuisineType}</span>}
                      </span>
                    </IntlLink>
                  ))}
                </div>
              </div>
            )}
            {siblingsCategory.length > 0 && categoryDef && (
              <div className={styles.sibRow}>
                <h2 className={styles.sibRowHead}>
                  {de ? `Mehr ${categoryDef.name}` : `More ${(categoryDef.nameEn || categoryDef.name).toLowerCase()}`}
                </h2>
                <div className={styles.sibCards}>
                  {siblingsCategory.map(s => (
                    <IntlLink key={s._id} href={`/restaurant/${s.slug}`} className={styles.sibCard}>
                      {s.photo && (
                        <div className={styles.sibPhoto}>
                          <Image src={s.photo} alt={s.name} fill sizes="33vw" />
                        </div>
                      )}
                      <span className={styles.sibOverlay}>
                        <span className={styles.sibName}>{normalizeName(s.name)}</span>
                        {s.cuisineType && <span className={styles.sibMeta}>{s.cuisineType}</span>}
                      </span>
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
