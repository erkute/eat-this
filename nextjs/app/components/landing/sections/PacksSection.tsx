'use client'

import { CSSProperties } from 'react'
import Image from 'next/image'
import { useLoginModal } from '@/lib/auth'
import { getPack } from '@/lib/stripe-catalog'
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
  locale: 'de' | 'en'
  /** Live restaurant total — interpolated into bundle bullets so the
   *  "{count}+ hand-picked Berlin spots" line stays accurate as the
   *  catalogue grows. */
  restaurantCount: number
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

// 9 Category-Packs surfaced as a mini-grid above the 3 tier cards. Each
// mini-card is its own checkout trigger so a user who knows they want
// "Coffee" specifically can express that intent before the 3-tier grid.
// The display copy (name eyebrow + spectrum headline + long description)
// is pulled straight from `stripe-catalog.ts` via getPack(packId) — same
// strings the Profile-Booster Tab renders. Single source of truth across
// landing + profile + Stripe Hosted Checkout.
const MINI_PACKS: { slug: string; packId: string; name: string }[] = [
  { slug: 'coffee',     packId: 'category-coffee',     name: 'Coffee Pack' },
  { slug: 'breakfast',  packId: 'category-breakfast',  name: 'Breakfast Pack' },
  { slug: 'lunch',      packId: 'category-lunch',      name: 'Lunch Pack' },
  { slug: 'pizza',      packId: 'category-pizza',      name: 'Pizza Pack' },
  { slug: 'dinner',     packId: 'category-dinner',     name: 'Dinner Pack' },
  { slug: 'finedining', packId: 'category-finedining', name: 'Fine Dining Pack' },
  { slug: 'fastfood',   packId: 'category-fastfood',   name: 'Fast Food Pack' },
  { slug: 'drinks',     packId: 'category-drinks',     name: 'Drinks Pack' },
  { slug: 'sweets',     packId: 'category-sweets',     name: 'Sweets Pack' },
]

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
      '20 Restaurant-Spots in Berlin',
      'Must Eats für ausgewählte Spots',
      'Zugang zur Map',
      'Kostenlos',
    ],
    en: [
      '20 restaurant spots in Berlin',
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
      '{count}+ handverlesene Berlin-Spots — und es kommen ständig welche dazu',
      'Alle Kategorien freigeschaltet — neue Packs automatisch inklusive',
      'Alle Must Eats freigeschaltet, jetzt und alle die noch folgen',
      'Einmal zahlen, kein Abo',
    ],
    en: [
      '{count}+ hand-picked Berlin spots — and new ones drop all the time',
      'All categories unlocked — new packs included automatically',
      'Every Must Eat unlocked, now and every one to come',
      'Pay once, no subscription',
    ],
  },
}

export default function PacksSection({
  headline, body, starter, category, complete, locale, restaurantCount,
}: Props) {
  const { open: openLogin } = useLoginModal()
  const bundleBullets = (locale === 'de' ? BULLETS.bundle.de : BULLETS.bundle.en)
    .map((b) => b.replace('{count}', String(restaurantCount)))

  // Guest-checkout: hit /api/stripe/checkout without an auth header. The
  // route runs in guest mode, Stripe Hosted Checkout collects the email,
  // the webhook then resolves email → uid (find-or-create) and mails the
  // sign-in magic link. Falls back to openLogin on network/server error.
  const handleCheckout = async (packId: string) => {
    try {
      const res = await fetch('/api/stripe/checkout', {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ packId, locale }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.url) {
        window.location.href = data.url as string
        return
      }
      openLogin()
    } catch {
      openLogin()
    }
  }

  const sName = splitTitle(starter.title)
  const cName = splitTitle(category.title)
  // CMS still says "Complete Berlin - €20" - override the name client-side to
  // the new product name. Price stays whatever the CMS says.
  const fName = splitTitle(complete.title)
  const bundleName = locale === 'de' ? 'All Berlin' : 'All Berlin'

  // Override CMS strings with the tightened landing copy.
  const sectionEyebrow = locale === 'de' ? 'Die Packs' : 'Packs'
  const sectionH2 = locale === 'de'
    ? 'Hol dir genau das, worauf du Lust hast'
    : 'Get exactly what you’re hungry for'
  const sectionBody = locale === 'de'
    ? 'Jedes Pack schaltet eine kuratierte Sammlung frei.'
    : 'Each pack unlocks a curated collection.'
  const footnote = locale === 'de'
    ? 'Starte kostenlos mit 20 Berliner Spots. Per Pack erweitern — oder direkt All Berlin.'
    : 'Start free with 20 Berlin spots. Expand pack by pack — or skip ahead to All Berlin.'
  // Sanity's packs.starter.body is still "10 random spots" — override
  // until that doc is touched (CMS-Drift pattern).
  const starterBody = locale === 'de'
    ? 'Starte mit 20 handverlesenen Berliner Spots und ausgewählten Must Eats.'
    : 'Start with 20 hand-picked Berlin spots and selected Must Eats.'
  void headline
  void body

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <span className={styles.eyebrow}>{sectionEyebrow}</span>
          <h2 className={styles.h2}>{sectionH2}</h2>
          <p className={styles.body}>{sectionBody}</p>
        </div>

        {/* 9 category-pack mini cards. Decorative thumbnail + name + 1-line
            tagline. Clicking any one opens the login modal — purchase
            completes in the user's profile after sign-up. */}
        <div className={styles.miniGrid}>
          {MINI_PACKS.map((p, i) => {
            const pack = getPack(p.packId)
            return (
              <button
                key={p.slug}
                type="button"
                className={styles.miniCard}
                onClick={() => handleCheckout(p.packId)}
                aria-label={p.name}
              >
                <span className={styles.miniNumber} aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                <div className={styles.miniMedia}>
                  <Image
                    src={`/pics/booster/booster_${p.slug}.webp`}
                    alt=""
                    width={500}
                    height={750}
                    className={styles.miniImg}
                    sizes="(max-width: 768px) 36vw, 160px"
                  />
                </div>
                <span className={styles.miniName}>{p.name}</span>
                <h3 className={styles.miniSpectrum}>{pack?.spectrum ?? ''}</h3>
                <p className={styles.miniDesc}>{pack?.description ?? ''}</p>
              </button>
            )
          })}
        </div>

        {/* Editorial divider between the 9-pack catalogue and the 3-tier
            purchase grid. Brand-yellow eyebrow + big editorial Q. */}
        <div className={styles.divider}>
          <span className={styles.dividerEyebrow}>
            {locale === 'de' ? 'Deine Wahl' : 'Your call'}
          </span>
          <h3 className={styles.dividerH3}>Free. Pack. All Berlin.</h3>
          <span className={styles.dividerArrow} aria-hidden="true">↓</span>
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
                src="/pics/booster/booster.webp"
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
            <p className={styles.cardSubtitle}>{starterBody}</p>

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
                    src={`/pics/booster/booster_${slug}.webp`}
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
            onClick={() => handleCheckout('all-berlin')}
            aria-label={`${bundleName} - ${complete.ctaLabel}`}
          >
            <div className={`${styles.media} ${styles.mediaBundle}`}>
              <div className={styles.spotlight} aria-hidden="true" />
              <div className={styles.bundleHeap} aria-hidden="true">
                {BUNDLE_PACKS.map(({ slug, x, y, rot, z, hx, hy, hrot }) => (
                  <Image
                    key={slug}
                    src={`/pics/booster/booster_${slug}.webp`}
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
              {bundleBullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>

            <span className={styles.ctaLink}>
              {locale === 'de' ? 'Alles freischalten' : 'Unlock everything'}
              <ChevronIcon />
            </span>
          </button>
        </div>

        <p className={styles.footnote}>{footnote}</p>
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
