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
import { formatPriceLabel, classifyWebsite } from '@/app/components/map/restaurantDetail.helpers'
import { buildQuickFacts, buildFAQEntries, splitDescriptionForMagazine } from '@/lib/restaurant-prose'
import { getOpenStatus } from '@/lib/map/openingHours'
import DetailPageOutro from '@/app/components/DetailPageOutro'
import MustEatTeaserSection from '@/app/components/MustEatTeaserSection'
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

  // Tight cap: 3 siblings per row. The cross-links exist for SEO (so Google
  // can crawl between detail pages within the same bezirk/category), not as a
  // browse-all UX — that's gated behind the Map+Packs.
  const SIBLING_LIMIT = 3
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
  // Editorial split of the long description into lede / drop-capped body /
  // mid-page pull-quote. Pure presentation — no Sanity field added.
  const magazine = splitDescriptionForMagazine(description)

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
  // Hub-level breadcrumb items render as text (no href) so the visible
  // breadcrumb doesn't expose a "browse all spots in Mitte" backdoor to the
  // paid catalog. JSON-LD BreadcrumbList keeps the canonical URLs — Google
  // still understands the hierarchy.
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
    description: shortDescription || description || tip,
    districtsLabel,
    faqs: faqEntries,
  })

  return (
    <>
      {/* JSON-LD: serializeJsonLd sanitizes output — safe inline structured data */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <main className={styles.page}>
        {/* ── Hero: full-bleed photo + magazine-cover Ranchers lockup ── */}
        <div className={styles.hero}>
          {r.photo && (
            <Image
              src={r.photo}
              alt={r.name}
              fill
              priority
              sizes="100vw"
              className={styles.heroImage}
            />
          )}
          <div className={styles.heroShade} aria-hidden="true" />
          <div className={styles.heroLockup}>
            {(r.district || r.cuisineType) && (
              <p className={styles.heroEyebrow}>
                {[r.district, r.cuisineType].filter(Boolean).join(' · ')}
              </p>
            )}
            <h1 className={styles.heroWordmark}>{r.name}</h1>
            {shortDescription && (
              <p className={styles.heroDeck}>{shortDescription}</p>
            )}
          </div>
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
          {/* QuickFacts kept in DOM (out-of-flow) so the auto-prose still
              feeds Google's content-depth signal — the magazine layout
              hides it visually since the same facts live in At-a-Glance. */}
          {quickFacts && <p className={styles.srOnly}>{quickFacts}</p>}

          <div className={styles.layout}>
            {/* ── Lede: first sentence of the description in display type ── */}
            {magazine?.lede && (
              <p className={styles.lede}>{magazine.lede}</p>
            )}

            {/* ── Body: paragraphs preserved + optional mid-page pull-quote ── */}
            {(magazine || description || tip) && (
              <div className={styles.body}>
                {magazine?.paragraphsBefore.map((p, i) => (
                  <p key={`bf-${i}`}>{p}</p>
                ))}
                {magazine?.midQuote && (
                  <blockquote className={styles.midQuote}>
                    {magazine.midQuote}
                  </blockquote>
                )}
                {magazine?.paragraphsAfter.map((p, i) => (
                  <p key={`af-${i}`}>{p}</p>
                ))}

                {tip && (
                  <aside className={styles.tip}>
                    <span className={styles.tipLabel}>
                      {de ? 'Insider-Tipp' : 'Insider Tip'}
                    </span>
                    <p className={styles.tipBody}>{tip}</p>
                  </aside>
                )}
              </div>
            )}

            {/* ── Sidebar: At-a-Glance sticker box + Map ticket + actions ── */}
            <aside className={styles.sidebar}>
              <div className={styles.glance}>
                {r.address && (
                  <section className={styles.glanceSection}>
                    <p className={styles.glanceLabel}>{de ? 'Adresse' : 'Address'}</p>
                    <a
                      href={r.mapsUrl ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(r.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.glanceValue}
                    >
                      {r.address}
                    </a>
                  </section>
                )}

                {r.openingHours && r.openingHours.length > 0 && (
                  <section className={styles.glanceSection}>
                    <p className={styles.glanceLabel}>{de ? 'Öffnungszeiten' : 'Opening Hours'}</p>
                    {todayStatus && (
                      <p
                        className={todayStatus.isOpen ? styles.glanceTodayOpen : styles.glanceTodayClosed}
                        role="status"
                      >
                        {todayStatus.label}
                      </p>
                    )}
                    <ul className={styles.glanceHours}>
                      {r.openingHours.map((slot, i) => (
                        <li key={i} className={styles.glanceHourRow}>
                          <span className={styles.glanceHourDays}>{slot.days}</span>
                          <span className={styles.glanceHourValue}>{slot.hours}</span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {(() => {
                  const priceLabel = formatPriceLabel(r)
                  if (!priceLabel && !r.cuisineType) return null
                  return (
                    <section className={styles.glanceSection}>
                      <p className={styles.glanceLabel}>{de ? 'Preis & Küche' : 'Price & Cuisine'}</p>
                      <p className={styles.glanceValue}>
                        {[priceLabel, r.cuisineType].filter(Boolean).join(' · ')}
                      </p>
                    </section>
                  )
                })()}
              </div>

              {/* Map CTA — brand-red ticket sticker */}
              <IntlLink
                href={`/map?r=${r.slug}`}
                className={styles.mapTicket}
                aria-label={de ? 'Auf der Eat-This-Map ansehen' : 'View on the Eat This map'}
                rel="nofollow"
              >
                <span className={styles.mapTicketLabel}>
                  {de ? 'Auf der Map' : 'On the Map'}
                </span>
                <svg
                  className={styles.mapTicketArrow}
                  width="28"
                  height="20"
                  viewBox="0 0 28 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M3 10 L22 10" />
                  <path d="M16 3 L24 10 L16 17" />
                </svg>
              </IntlLink>

              {/* Reserve / Instagram / Website action list */}
              {(() => {
                const websiteInfo = classifyWebsite(r.website)
                const igHandle =
                  r.instagramHandle ?? (websiteInfo?.kind === 'instagram' ? websiteInfo.handle : null)
                const websiteForRow = websiteInfo?.kind === 'web' ? websiteInfo : null

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
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <polyline points="4.5 2.5 8.5 6 4.5 9.5" />
                  </svg>
                )

                if (!r.reservationUrl && !igHandle && !websiteForRow) return null
                return (
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
                )
              })()}
            </aside>

            <div className={styles.musteats}>
              <MustEatTeaserSection mustEats={mustEats} locale={loc} />
            </div>

            {faqEntries.length > 0 && (
              <div className={styles.faq}>
                <RestaurantFAQ entries={faqEntries} locale={loc} />
              </div>
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
