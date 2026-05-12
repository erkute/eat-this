import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import { setRequestLocale } from 'next-intl/server'
import { getRestaurantBySlug, getAllRestaurantSlugs, getLatestNewsArticles, getMustEatsByRestaurant, getRestaurantsByBezirk, getRestaurantsByCategory } from '@/lib/sanity.server'
import { buildRestaurantJsonLd } from '@/lib/json-ld'
import { SITE_URL } from '@/lib/constants'
import { localeUrl } from '@/lib/locale-url'
import { routing } from '@/i18n/routing'
import { pickLocale, hasEnContent } from '@/lib/i18n/pickLocale'
import { localizedCategoryName } from '@/lib/categories'
import { formatPriceLabel, classifyWebsite } from '@/app/components/map/restaurantDetail.helpers'
import { buildQuickFacts, buildFAQEntries } from '@/lib/restaurant-prose'
import { getOpenStatus } from '@/lib/map/openingHours'
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

  // Prose blocks that surface entity facts as natural language — needed so
  // restaurant pages clear Google's thin-content bar (target ~200+ unique
  // words). All three degrade gracefully when their source fields are
  // missing, so the layout stays clean for half-filled docs.
  const quickFacts = buildQuickFacts(r, loc)
  const faqEntries = buildFAQEntries(r, loc)
  const todayStatus =
    r.openingHours && r.openingHours.length > 0
      ? getOpenStatus(r.openingHours, new Date(), {
          // "Today" was misleading: a place closed at 5am that reopens at 6pm
          // is not "closed today" — it's closed *now*. Mirror that for the
          // open badge so both states read as a snapshot of the moment.
          open: de ? 'Jetzt geöffnet' : 'Open now',
          closed: de ? 'Jetzt geschlossen' : 'Closed now',
          opens: de ? 'öffnet' : 'opens',
          closes: de ? 'schließt' : 'closes',
        })
      : null

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
    faqs: faqEntries,
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
              {r.photoCredit ? (
                r.photoCreditUrl ? (
                  <a href={r.photoCreditUrl} target="_blank" rel="noopener noreferrer">
                    {r.photoCredit}
                  </a>
                ) : (
                  r.photoCredit
                )
              ) : r.instagramHandle ? (
                <a
                  href={`https://instagram.com/${r.instagramHandle}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  via @{r.instagramHandle}
                </a>
              ) : (
                'via Instagram'
              )}
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
              {(() => {
                const priceLabel = formatPriceLabel(r)
                const hasCats = r.categories && r.categories.length > 0
                if (!priceLabel && !hasCats) return null
                return (
                  <div className={styles.categories}>
                    {priceLabel && <span className={styles.price}>{priceLabel}</span>}
                    {r.categories?.map(cat => (
                      <span key={cat.slug} className={styles.category}>
                        {localizedCategoryName(cat, loc)}
                      </span>
                    ))}
                  </div>
                )
              })()}
            </header>

            {quickFacts && <p className={styles.quickFacts}>{quickFacts}</p>}

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
                  {todayStatus && (
                    <p
                      className={`${styles.todayStatus} ${todayStatus.isOpen ? styles.todayOpen : styles.todayClosed}`}
                      role="status"
                    >
                      {todayStatus.label}
                    </p>
                  )}
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

              {(() => {
                // Resolve display data for the sidebar links.
                const websiteInfo = classifyWebsite(r.website)
                const igHandle =
                  r.instagramHandle ?? (websiteInfo?.kind === 'instagram' ? websiteInfo.handle : null)
                const websiteForRow = websiteInfo?.kind === 'web' ? websiteInfo : null

                // Detect the reservation provider so the button carries the
                // platform brand instead of a generic "Reserve a Table".
                let reservationProvider: string | null = null
                if (r.reservationUrl) {
                  try {
                    const host = new URL(r.reservationUrl).hostname.toLowerCase()
                    if (host.includes('opentable')) reservationProvider = 'OpenTable'
                    else if (host.includes('resy.com')) reservationProvider = 'Resy'
                    else if (host.includes('thefork')) reservationProvider = 'TheFork'
                    else if (host.includes('quandoo')) reservationProvider = 'Quandoo'
                    else if (host.includes('bookatable')) reservationProvider = 'Bookatable'
                    else if (host.includes('resmio')) reservationProvider = 'Resmio'
                    else if (host.includes('sevenrooms')) reservationProvider = 'SevenRooms'
                  } catch {}
                }

                const ChevronArrow = () => (
                  <svg
                    className={styles.actionArrow}
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="4.5 2.5 8.5 6 4.5 9.5" />
                  </svg>
                )

                return (
                  <>
                    {/* Primary CTA — the only "loud" element. Everything else
                        sits in a quiet list of secondary actions below. */}
                    <IntlLink
                      href={`/map?r=${r.slug}`}
                      className={styles.primaryCta}
                      aria-label="Eat This Map"
                    >
                      <span className={styles.primaryCtaWordmark} aria-hidden="true" />
                      <span className={styles.primaryCtaSuffix} aria-hidden="true">Map</span>
                    </IntlLink>

                    {/* Secondary action list — settings-list rhythm: label
                        left, contextual detail right (provider / handle /
                        host), chevron on the far right. Tying everything
                        into a single visual rhythm replaces the previous
                        mix of buttons + loose text URL. */}
                    {(r.reservationUrl || igHandle || websiteForRow) && (
                      <ul className={styles.actionList}>
                        {r.reservationUrl && (
                          <li>
                            <a
                              href={r.reservationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.actionItem}
                            >
                              <span className={styles.actionLabel}>
                                {de ? 'Reservieren' : 'Reserve'}
                              </span>
                              {reservationProvider && (
                                <span className={styles.actionDetail}>{reservationProvider}</span>
                              )}
                              <ChevronArrow />
                            </a>
                          </li>
                        )}
                        {igHandle && (
                          <li>
                            <a
                              href={`https://instagram.com/${igHandle}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.actionItem}
                              aria-label={`Instagram @${igHandle}`}
                            >
                              <span className={styles.actionLabel}>Instagram</span>
                              <span className={styles.actionDetail}>@{igHandle}</span>
                              <ChevronArrow />
                            </a>
                          </li>
                        )}
                        {websiteForRow && (
                          <li>
                            <a
                              href={websiteForRow.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.actionItem}
                            >
                              <span className={styles.actionLabel}>Website</span>
                              <span className={styles.actionDetail}>{websiteForRow.display}</span>
                              <ChevronArrow />
                            </a>
                          </li>
                        )}
                      </ul>
                    )}
                  </>
                )
              })()}
            </aside>

            <div className={styles.musteats}>
              <MustEatTeaserSection mustEats={mustEats} locale={loc} />
            </div>

            {faqEntries.length > 0 && (
              <section className={styles.faq} aria-label={de ? 'Häufige Fragen' : 'FAQ'}>
                <h2 className={styles.sectionTitle}>{de ? 'Häufige Fragen' : 'Frequently asked'}</h2>
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
