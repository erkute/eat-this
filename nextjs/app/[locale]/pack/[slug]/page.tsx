import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import { setRequestLocale } from 'next-intl/server'
import { CATALOG } from '@/lib/stripe-catalog'
import { Link } from '@/i18n/navigation'
import { getRestaurantsByCategory, getAllCategories, getCategoryBySlug } from '@/lib/sanity.server'
import { localizedCategoryName } from '@/lib/categories'
import { categoryArt } from '@/lib/categoryArt'
import { hreflangAlternates } from '@/lib/seo/metadata'
import { routing } from '@/i18n/routing'
import {
  resolvePackByUrlSlug,
  packUrlSlug,
  formatPackPrice,
  buildPackTeaser,
} from '@/lib/pack/packDetail'
import PackBuyButton from './PackBuyButton'
import styles from './PackDetail.module.css'

interface PageProps {
  params: Promise<{ locale: string; slug: string }>
}

export const revalidate = 3600

export async function generateStaticParams() {
  return routing.locales.flatMap(locale =>
    Object.values(CATALOG).map(p => ({ locale, slug: packUrlSlug(p) })),
  )
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const pack = resolvePackByUrlSlug(slug)
  if (!pack) return {}
  const de = locale === 'de'
  const category = pack.type === 'category' && pack.slug
    ? await getCategoryBySlug(pack.slug)
    : null
  const packTitleName = category
    ? localizedCategoryName(category, de ? 'de' : 'en')
    : pack.displayName
  const title = pack.type === 'all-berlin'
    ? (de ? 'All Berlin — alle Packs · Eat This' : 'All Berlin — every pack · Eat This')
    : `${packTitleName} Pack — Eat This`
  return {
    title,
    description: pack.description[de ? 'de' : 'en'],
    // Conversion page reached from the app — keep it out of the index so it
    // doesn't cannibalise the /kategorie SEO pages, but let links be followed.
    robots: { index: false, follow: true },
    // Packs are always bilingual (CATALOG ships de+en copy), so emit the full
    // de/en/x-default set like every other route instead of a bare canonical.
    alternates: hreflangAlternates(`/pack/${slug}`, de ? 'de' : 'en'),
  }
}

// Ordered 3×3 grid for the All-Berlin fan.
const ALL_BERLIN_GRID: string[][] = [
  ['breakfast', 'fine-dining', 'pizza'],
  ['coffee', 'drinks', 'lunch'],
  ['dinner', 'sweets', 'fast-food'],
]
const ALL_BERLIN_UPSELL = ALL_BERLIN_GRID.flat()

const PAYMENT_METHODS = [
  { src: '/payment/apple-pay.webp', alt: { de: 'Apple Pay', en: 'Apple Pay' } },
  { src: '/payment/paypal.webp', alt: { de: 'PayPal', en: 'PayPal' } },
  { src: '/payment/klarna.webp', alt: { de: 'Klarna', en: 'Klarna' } },
  { src: '/payment/credit-card.webp', alt: { de: 'Kreditkarte', en: 'Credit card' } },
]

export default async function PackDetailPage({ params }: PageProps) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const de = locale === 'de'
  const loc: 'de' | 'en' = de ? 'de' : 'en'

  const pack = resolvePackByUrlSlug(slug)
  if (!pack) notFound()

  const cats = await getAllCategories()
  const nameOf = (catSlug: string): string => {
    const c = cats.find(x => x.slug === catSlug)
    return c ? localizedCategoryName(c, loc) : catSlug
  }

  const mapHref = de ? '/map' : `/${locale}/map`
  const priceLabel = formatPackPrice(pack.amountCents)
  const buyLabels = {
    label: `${de ? 'Jetzt freischalten' : 'Unlock now'} · ${priceLabel}`,
    pendingLabel: de ? 'Weiter zu Stripe …' : 'Going to Stripe …',
    ownedLabel: de ? 'Zur Map' : 'Open map',
    ownedHref: mapHref,
    errorLabel: de
      ? 'Da ging was schief. Versuch es nochmal.'
      : 'Something went wrong. Please try again.',
  }
  const paymentLogos = (
    <div className={styles.paymentLogos} aria-label={de ? 'Zahlungsarten' : 'Payment methods'}>
      {PAYMENT_METHODS.map(method => (
        <Image
          key={method.src}
          src={method.src}
          alt={method.alt[loc]}
          width={70}
          height={48}
        />
      ))}
    </div>
  )

  // ── All-Berlin variant ──────────────────────────────────────────────
  if (pack.type === 'all-berlin') {
    return (
      <main className={styles.page}>
        <div className={styles.inner}>
          <section className={`${styles.hero} ${styles.heroAll}`}>
            <div className={styles.copy}>
              <div className={`${styles.kicker} ${styles.allKicker}`}>
                {de ? 'Alles auf einmal · alle Packs' : 'Everything at once · every pack'}
              </div>
              <h1 className={`${styles.name} ${styles.allName}`}>
                All<br /><span className={styles.y}>Berlin</span>
              </h1>
              <p className={styles.sub}>{pack.description[loc]}</p>

              <PackBuyButton packId={pack.packId} packName={pack.displayName} amountCents={pack.amountCents} locale={loc} {...buyLabels} />
              {paymentLogos}
            </div>

            <div className={styles.allStage} aria-hidden="true">
              <div className={styles.allStack}>
                {ALL_BERLIN_GRID.map((rowSlugs, i) => (
                  <div
                    key={i}
                    className={`${styles.allRow} ${i === 0 ? styles.allRowTop : i === 1 ? styles.allRowMid : styles.allRowBottom}`}
                  >
                    {rowSlugs.map(s => {
                      const art = categoryArt(s)
                      // eslint-disable-next-line @next/next/no-img-element
                      return art ? <img key={s} src={art} alt="" loading="lazy" /> : null
                    })}
                  </div>
                ))}
              </div>
            </div>
          </section>

        </div>
      </main>
    )
  }

  // ── Category pack variant ───────────────────────────────────────────
  const restaurants = await getRestaurantsByCategory(pack.slug as string)
  const teaser = buildPackTeaser(restaurants)
  const art = categoryArt(pack.slug as string)
  const heroName = nameOf(pack.slug as string)
  const allBerlinHref = '/pack/all-berlin'

  return (
    <main className={styles.page}>
      <div className={styles.inner}>
        <section className={styles.hero}>
          <div className={styles.copy}>
            <div className={styles.kicker}>Booster Pack</div>
            <h1 className={styles.name}>
              <span>{heroName}</span>{' '}
              <span className={styles.nameLine}>Pack</span>
            </h1>
            <p className={styles.sub}>{pack.description[loc]}</p>

            <PackBuyButton packId={pack.packId} packName={pack.displayName} amountCents={pack.amountCents} locale={loc} {...buyLabels} />
            {paymentLogos}
          </div>

          {art && (
            <div className={styles.stage}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={art} alt={`${heroName} Pack`} className={styles.packArt} />
            </div>
          )}
        </section>

        <section className={styles.contentGrid}>
          {teaser.revealed.length > 0 && (
            <div className={styles.panel}>
              <div className={styles.insideLabel}>{de ? 'Drin im Pack' : 'Inside the pack'}</div>
              <div className={styles.list}>
                {teaser.revealed.map((r, i) => (
                  <div key={`r${i}`} className={styles.row}>
                    <div className={styles.thumb}>{String(i + 1).padStart(2, '0')}</div>
                    <span className={styles.rn}>{r.name}</span>
                    {r.district && <span className={styles.mn}>{r.district}</span>}
                  </div>
                ))}
                {teaser.locked.map((l, i) => (
                  <div key={`l${i}`} className={`${styles.row} ${styles.rowLocked}`}>
                    <div className={styles.thumb}>{String(teaser.revealed.length + i + 1).padStart(2, '0')}</div>
                    <span className={styles.rn}>{de ? 'Verdeckt' : 'Covered'}</span>
                    {l.district && <span className={styles.mn}>{l.district}</span>}
                  </div>
                ))}
                <div className={`${styles.row} ${styles.rowLocked}`}>
                  <div className={styles.thumb}>+</div>
                  <span className={styles.rn}>{de ? 'Und mehr' : 'And more'}</span>
                  <span className={styles.mn}>{de ? 'Live-Map' : 'Live map'}</span>
                </div>
              </div>
            </div>
          )}

          <div className={styles.upsell}>
            <Link href={allBerlinHref}>
              <span className={styles.upsellArt} aria-hidden="true">
                {ALL_BERLIN_UPSELL.map(s => {
                  const boosterArt = categoryArt(s)
                  return boosterArt ? (
                    <Image
                      key={s}
                      src={boosterArt}
                      alt=""
                      width={70}
                      height={108}
                      className={styles.upsellPack}
                    />
                  ) : null
                })}
              </span>
              <span className={styles.upsellCopy}>
                <span className={styles.upsellKicker}>
                  {de ? 'Lieber alles auf einmal' : 'Rather everything at once'}
                </span>
                <span className={styles.upsellMain}>All Berlin</span>
                <span className={styles.upsellCta}>
                  {de ? 'Alle Packs freischalten · 20 €' : 'Unlock every pack · €20'}
                </span>
              </span>
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
