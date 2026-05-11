'use client'

import { CSSProperties } from 'react'
import Image from 'next/image'
import { useLoginModal } from '@/lib/auth'
import styles from './PacksSection.module.css'

interface Tier {
  title: string
  body: string
  bullets?: string[]
  ctaLabel: string
}

interface Props {
  headline: string
  body?: string
  starter: Tier
  category: Tier
  complete: Tier
  starterHref: string  // unused, kept for prop compatibility
  locale: 'de' | 'en'
}

// Sanity ships titles as "Starter Pack - Kostenlos" / "All Berlin - €20".
// We split so the name and the price each get their own typographic weight.
function splitTitle(raw: string): { name: string; price: string | null } {
  // Accept em-dash (-), en-dash (-) and short hyphen (-) so the component
  // stays backwards-compatible while we migrate the CMS to short hyphens.
  const parts = raw.split(/\s+[---]\s+/)
  if (parts.length >= 2) return { name: parts[0], price: parts.slice(1).join(' - ') }
  return { name: raw, price: null }
}

// All 9 booster packs that ship inside "All Berlin". Laid out as an
// overlapping pile/heap (not a rigid grid) - looks like a stack of cards
// thrown on a table, which is what the user wants the bundle to feel
// like. Each pack carries its resting position (x/y/rot) plus a hover
// offset (hx/hy/hrot) so the heap subtly shifts when the card is hovered.
// z-index runs 1-9 with the centre pack on top.
type BundlePack = {
  slug: string
  x: number   // resting x offset (px)
  y: number   // resting y offset (px)
  rot: number // resting rotation (deg)
  z: number   // stacking order
  hx: number  // hover x delta
  hy: number  // hover y delta
  hrot: number // hover rotation delta
}
// Symmetric pile - three pairs (breakfast↔dinner, drinks↔finedining,
// lunch↔sweets) sit at mirrored x with matching y so the heap has a
// clear axis of balance, and three centre packs (coffee/fastfood/pizza)
// stack vertically through the middle. Rotations are still hand-tossed
// (outer packs lean outward, centre packs jitter), so the composition
// reads as "thrown" without losing structure.
const BUNDLE_PACKS: BundlePack[] = [
  { slug: 'breakfast',  x: -86, y: -62, rot: -28, z: 2, hx: -5, hy: -4, hrot: -3 },
  { slug: 'coffee',     x:   0, y: -84, rot:   3, z: 3, hx:  2, hy: -6, hrot:  2 },
  { slug: 'dinner',     x:  86, y: -62, rot:  28, z: 1, hx:  5, hy: -4, hrot:  3 },
  { slug: 'drinks',     x: -90, y:   2, rot: -16, z: 4, hx: -4, hy:  2, hrot: -2 },
  { slug: 'fastfood',   x:   0, y:   0, rot:  -2, z: 6, hx:  2, hy: -3, hrot:  1 },
  { slug: 'finedining', x:  90, y:   2, rot:  16, z: 5, hx:  4, hy:  2, hrot:  2 },
  { slug: 'lunch',      x: -72, y:  58, rot: -22, z: 7, hx: -3, hy:  4, hrot: -2 },
  { slug: 'pizza',      x:   0, y:  68, rot:   4, z: 9, hx:  2, hy:  4, hrot:  2 },
  { slug: 'sweets',     x:  72, y:  58, rot:  22, z: 8, hx:  4, hy:  4, hrot: -2 },
]

// SaaS-style detail bullets per tier. Held in code (not CMS) so they stay in
// lockstep with the actual product mechanics - pricing, unlock scope, etc.
const BULLETS: Record<'starter' | 'category' | 'bundle', { de: string[]; en: string[] }> = {
  starter: {
    de: [
      '10 Restaurant-Spots in Berlin',
      'Must Eats für ausgewählte Spots',
      'Zugang zur Map',
      'Kostenlos',
    ],
    en: [
      '10 restaurant spots in Berlin',
      'Must Eats for selected spots',
      'Map access',
      'Free',
    ],
  },
  category: {
    de: [
      'Eine Kategorie deiner Wahl',
      'Handverlesene Restaurant-Spots',
      'Must Eats für ausgewählte Spots',
    ],
    en: [
      'One category of your choice',
      'Hand-picked restaurant spots',
      'Must Eats for selected spots',
    ],
  },
  bundle: {
    de: [
      'Alle Berlin-Kategorien freigeschaltet',
      '200+ handverlesene Berlin-Spots',
      'Sämtliche Berliner Must Eats inklusive',
      'Inklusive zukünftiger Berlin Packs gratis dazu',
    ],
    en: [
      'All Berlin categories unlocked',
      '200+ hand-picked Berlin spots',
      'Every Berlin Must Eat included',
      'Every future Berlin pack included',
    ],
  },
}

export default function PacksSection({
  headline, body, starter, category, complete, locale,
}: Props) {
  const { open: openLogin } = useLoginModal()

  const sName = splitTitle(starter.title)
  const cName = splitTitle(category.title)
  // CMS still says "Complete Berlin - €20" - override the name client-side to
  // the new product name. Price stays whatever the CMS says.
  const fName = splitTitle(complete.title)
  const bundleName = locale === 'de' ? 'All Berlin' : 'All Berlin'

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <span className={styles.eyebrow}>{locale === 'de' ? 'Packs' : 'Packs'}</span>
          <h2 className={styles.h2}>{headline.replace(/\.$/, '')}</h2>
          {body && <p className={styles.body}>{body}</p>}
        </div>

        <div className={styles.grid}>

          {/* ── Starter ──────────────────────────────────────────────────── */}
          <button
            type="button"
            className={`${styles.card} ${styles.cardStarter}`}
            style={{ animationDelay: '0ms' }}
            onClick={openLogin}
            aria-label={`${sName.name} - ${starter.ctaLabel}`}
          >
            <div className={`${styles.media} ${styles.mediaStarter}`}>
              <div className={styles.spotlight} aria-hidden="true" />
              <Image
                src="/pics/booster/booster.png"
                alt=""
                width={500}
                height={750}
                className={styles.starterImg}
                sizes="(max-width: 768px) 50vw, 220px"
                priority
              />
            </div>

            <h3 className={styles.cardTitle}>{sName.name}</h3>
            <div className={styles.priceRow}>
              <span className={styles.cardPrice}>{sName.price || (locale === 'de' ? 'Kostenlos' : 'Free')}</span>
            </div>
            <p className={styles.cardSubtitle}>{starter.body}</p>

            <ul className={styles.bulletList}>
              {(locale === 'de' ? BULLETS.starter.de : BULLETS.starter.en).map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>

            <span className={styles.ctaLink}>
              {locale === 'de' ? 'Jetzt holen' : 'Get started'}
              <ChevronIcon />
            </span>
          </button>

          {/* ── Category Pack ────────────────────────────────────────────── */}
          <button
            type="button"
            className={styles.card}
            style={{ animationDelay: '90ms' }}
            onClick={openLogin}
            aria-label={`${cName.name} - ${category.ctaLabel}`}
          >
            <div className={`${styles.media} ${styles.mediaCategory}`}>
              <div className={styles.spotlight} aria-hidden="true" />
              <div className={styles.categoryStack}>
                {['dinner', 'breakfast', 'coffee'].map((slug, i) => (
                  <Image
                    key={slug}
                    src={`/pics/booster/booster_${slug}.png`}
                    alt=""
                    width={500}
                    height={750}
                    className={`${styles.stackPack} ${styles[`stack${i + 1}`]}`}
                    sizes="(max-width: 768px) 32vw, 160px"
                  />
                ))}
              </div>
            </div>

            <h3 className={styles.cardTitle}>{cName.name}</h3>
            <div className={styles.priceRow}>
              <span className={styles.cardPrice}>{cName.price || '€2,99'}</span>
              <span className={styles.priceSuffix}>{locale === 'de' ? 'pro Pack' : 'per pack'}</span>
            </div>
            <p className={styles.cardSubtitle}>
              {locale === 'de'
                ? 'Such dir eine Kategorie aus - z. B. Coffee, Dinner oder Pizza.'
                : 'Pick a category - Coffee, Dinner, Pizza and more.'}
            </p>

            <ul className={styles.bulletList}>
              {(locale === 'de' ? BULLETS.category.de : BULLETS.category.en).map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>

            <span className={styles.ctaLink}>
              {locale === 'de' ? 'Pack wählen' : 'Choose a pack'}
              <ChevronIcon />
            </span>
          </button>

          {/* ── All Berlin (Bundle) ──────────────────────────────────────── */}
          <button
            type="button"
            className={`${styles.card} ${styles.cardBundle}`}
            style={{ animationDelay: '180ms' }}
            onClick={openLogin}
            aria-label={`${bundleName} - ${complete.ctaLabel}`}
          >
            <div className={`${styles.media} ${styles.mediaBundle}`}>
              <div className={styles.spotlight} aria-hidden="true" />
              <div className={styles.bundleHeap} aria-hidden="true">
                {BUNDLE_PACKS.map(({ slug, x, y, rot, z, hx, hy, hrot }) => (
                  <Image
                    key={slug}
                    src={`/pics/booster/booster_${slug}.png`}
                    alt=""
                    width={500}
                    height={750}
                    className={styles.bundleItem}
                    sizes="(max-width: 768px) 34vw, 110px"
                    style={{
                      ['--x' as string]: `${x}px`,
                      ['--y' as string]: `${y}px`,
                      ['--rot' as string]: `${rot}deg`,
                      ['--hx' as string]: `${hx}px`,
                      ['--hy' as string]: `${hy}px`,
                      ['--hrot' as string]: `${hrot}deg`,
                      zIndex: z,
                    } as CSSProperties}
                  />
                ))}
              </div>
            </div>

            <h3 className={styles.cardTitle}>{bundleName}</h3>
            <div className={styles.priceRow}>
              <span className={styles.cardPrice}>{fName.price || '€20'}</span>
              <span className={styles.priceSuffix}>{locale === 'de' ? 'einmalig' : 'one-time'}</span>
            </div>
            <p className={styles.cardSubtitle}>
              {locale === 'de'
                ? 'Alle Booster Packs gebündelt - jetzt und alle, die noch kommen.'
                : 'Every Booster Pack bundled - the ones live today and every future one.'}
            </p>

            <ul className={styles.bulletList}>
              {(locale === 'de' ? BULLETS.bundle.de : BULLETS.bundle.en).map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>

            <span className={styles.ctaLink}>
              {locale === 'de' ? 'Alles freischalten' : 'Unlock everything'}
              <ChevronIcon />
            </span>
          </button>
        </div>

        <p className={styles.footnote}>
          {locale === 'de'
            ? 'Registriere dich kostenlos - alle Packs lassen sich anschließend in deinem Profil freischalten.'
            : 'Sign up for free - all packs unlock in your profile afterwards.'}
        </p>
      </div>
    </section>
  )
}

function ChevronIcon() {
  return (
    <svg className={styles.chevron} width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
