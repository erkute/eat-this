import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import { setRequestLocale } from 'next-intl/server'
import { CATALOG } from '@/lib/stripe-catalog'
import { getRestaurantsByCategory, getAllCategories } from '@/lib/sanity.server'
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
  const title = pack.type === 'all-berlin'
    ? (de ? 'All Berlin — alle Packs · Eat This' : 'All Berlin — every pack · Eat This')
    : `${pack.displayName} Pack — Eat This`
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

// Ordered 3×3 grid for the All-Berlin fan + tile list (mockup screen 18).
const ALL_BERLIN_GRID: string[][] = [
  ['breakfast', 'fine-dining', 'pizza'],
  ['coffee', 'drinks', 'lunch'],
  ['dinner', 'sweets', 'fast-food'],
]
const ALL_BERLIN_TILES = ['breakfast', 'coffee', 'lunch', 'pizza', 'drinks', 'dinner', 'fine-dining', 'sweets', 'fast-food']

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
    label: `${de ? 'Kaufen' : 'Buy'} · ${priceLabel}`,
    pendingLabel: de ? 'Weiter zu Stripe …' : 'Going to Stripe …',
    ownedLabel: de ? 'Auf die Map →' : 'On the map →',
    ownedHref: mapHref,
    errorLabel: de
      ? 'Da ging was schief. Versuch es nochmal.'
      : 'Something went wrong. Please try again.',
  }
  const trust = (
    <div className={styles.trust}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="1" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      {de ? <>Bezahlung über <strong>Stripe</strong> · Apple Pay verfügbar</> : <>Payment via <strong>Stripe</strong> · Apple Pay available</>}
    </div>
  )

  // ── All-Berlin variant ──────────────────────────────────────────────
  if (pack.type === 'all-berlin') {
    return (
      <main className={styles.page}>
        <div className={styles.inner}>
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

          <div className={`${styles.kicker} ${styles.allKicker}`}>
            {de ? 'Alles auf einmal · alle Packs' : 'Everything at once · every pack'}
          </div>
          <h1 className={`${styles.name} ${styles.allName}`}>
            All<br /><span className={styles.y}>Berlin</span>
          </h1>
          <p className={styles.sub}>{pack.description[loc]}</p>

          <div className={styles.facts}>
            <span className={`${styles.price} ${styles.bigPrice}`}>{priceLabel}</span>
            <span className={styles.updates}>{de ? '+ Auto-Sync' : '+ Auto-sync'}</span>
          </div>

          <div className={styles.insideLabel}>{de ? 'Was drin ist · alle Packs' : 'What you get · every pack'}</div>
          <div className={styles.allPacks}>
            {ALL_BERLIN_TILES.map(s => {
              const art = categoryArt(s)
              return (
                <div key={s} className={styles.allPack}>
                  {art && <Image src={art} alt={nameOf(s)} width={68} height={106} />}
                  <span className={styles.cat}>{nameOf(s)}</span>
                </div>
              )
            })}
          </div>

          <div className={styles.bonus}>
            <div className={styles.bonusIcon}>+</div>
            <div className={styles.bonusText}>
              {de
                ? <><strong>Auto-Sync</strong> · Jeder neue Spot landet automatisch auf deiner Map.</>
                : <><strong>Auto-sync</strong> · Every new spot lands on your map automatically.</>}
            </div>
          </div>

          <PackBuyButton packId={pack.packId} packName={pack.displayName} amountCents={pack.amountCents} locale={loc} {...buyLabels} />
          {trust}
        </div>
      </main>
    )
  }

  // ── Category pack variant ───────────────────────────────────────────
  const restaurants = await getRestaurantsByCategory(pack.slug as string)
  const teaser = buildPackTeaser(restaurants)
  const art = categoryArt(pack.slug as string)
  const heroName = nameOf(pack.slug as string)
  const allBerlinHref = de ? '/pack/all-berlin' : `/${locale}/pack/all-berlin`

  return (
    <main className={styles.page}>
      {art && (
        <div className={styles.stage}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={art} alt={`${heroName} Pack`} className={styles.packArt} />
        </div>
      )}
      <div className={styles.inner}>
        <div className={styles.kicker}>Booster Pack</div>
        <h1 className={styles.name}>{heroName}<br />Pack</h1>
        <p className={styles.sub}>{pack.description[loc]}</p>

        <div className={styles.facts}>
          <span className={styles.price}>{priceLabel}</span>
          <span className={styles.updates}>{de ? '+ Updates' : '+ Updates'}</span>
        </div>

        {teaser.revealed.length > 0 && (
          <>
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
          </>
        )}

        <PackBuyButton packId={pack.packId} packName={pack.displayName} amountCents={pack.amountCents} locale={loc} {...buyLabels} />
        {trust}

        <div className={styles.upsell}>
          <a href={allBerlinHref}>
            {de ? 'Lieber alles auf einmal · All Berlin · 20 €' : 'Rather everything at once · All Berlin · €20'}
          </a>
        </div>
      </div>
    </main>
  )
}
