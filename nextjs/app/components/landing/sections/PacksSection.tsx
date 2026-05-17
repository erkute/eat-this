'use client'

import { CSSProperties, useState } from 'react'
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
  /** Live restaurant total — interpolated into bundle description so the
   *  "{count}+ Berliner Spots" line stays accurate as the catalogue grows. */
  restaurantCount: number
}

// 9 Category Packs — vertical menu listing. `getPack(packId)` is the single
// source of truth (mirrors Profile-Booster + Stripe Hosted Checkout body).
const MENU_PACKS: { slug: string; packId: string; nameDe: string; nameEn: string }[] = [
  { slug: 'coffee',     packId: 'category-coffee',     nameDe: 'Coffee Pack',      nameEn: 'Coffee Pack' },
  { slug: 'breakfast',  packId: 'category-breakfast',  nameDe: 'Breakfast Pack',   nameEn: 'Breakfast Pack' },
  { slug: 'lunch',      packId: 'category-lunch',      nameDe: 'Lunch Pack',       nameEn: 'Lunch Pack' },
  { slug: 'pizza',      packId: 'category-pizza',      nameDe: 'Pizza Pack',       nameEn: 'Pizza Pack' },
  { slug: 'dinner',     packId: 'category-dinner',     nameDe: 'Dinner Pack',      nameEn: 'Dinner Pack' },
  { slug: 'finedining', packId: 'category-finedining', nameDe: 'Fine Dining Pack', nameEn: 'Fine Dining Pack' },
  { slug: 'fastfood',   packId: 'category-fastfood',   nameDe: 'Fast Food Pack',   nameEn: 'Fast Food Pack' },
  { slug: 'drinks',     packId: 'category-drinks',     nameDe: 'Drinks Pack',      nameEn: 'Drinks Pack' },
  { slug: 'sweets',     packId: 'category-sweets',     nameDe: 'Sweets Pack',      nameEn: 'Sweets Pack' },
]

// All-Berlin presentation — 9 packs arranged as a tidy 3-row composition
// (3-3-3) with gentle rotations so each pack reads clearly without the
// chaos of full random scatter. Rows offset horizontally for natural
// "tossed but composed" feel, like a curator laying cards out. Bounds
// tuned for mobile (~318-px hero card at 360-px viewports): pack 96 px
// wide, every pack fully visible — no clipping, no overlap collisions.
type FanPack = { slug: string; rot: number; dx: number; dy: number; z: number }
const ALL_PACKS_FAN: FanPack[] = [
  // Symmetric 3×3 with mirrored rotations (left tilts -, right tilts +,
  // centre column straight). Bottom row sits forward (highest z), top
  // row sits back. Tight spacing, ordered feel — not a chaotic scatter.
  { slug: 'breakfast',  rot:  -5, dx: -72, dy: -75, z: 1 },
  { slug: 'sweets',     rot:   0, dx:   0, dy: -78, z: 2 },
  { slug: 'pizza',      rot:   5, dx:  72, dy: -75, z: 3 },
  { slug: 'fastfood',   rot:  -3, dx: -76, dy:   0, z: 4 },
  { slug: 'lunch',      rot:   0, dx:   0, dy:   0, z: 5 },
  { slug: 'coffee',     rot:   3, dx:  76, dy:   0, z: 6 },
  { slug: 'drinks',     rot:  -5, dx: -72, dy:  75, z: 7 },
  { slug: 'dinner',     rot:   0, dx:   0, dy:  78, z: 9 },
  { slug: 'finedining', rot:   5, dx:  72, dy:  75, z: 8 },
]

export default function PacksSection({
  starter, category, complete, locale, restaurantCount,
  headline, body,
}: Props) {
  const { open: openLogin } = useLoginModal()

  // Two-step purchase for the 9 booster packs: first tap zooms the row
  // (bigger thumb + reveals a Buy CTA), second tap on the CTA fires
  // Stripe checkout. Tap another pack to swap, tap the same row again
  // to collapse. Starter (login) and All Berlin (direct checkout) keep
  // their single-tap behaviour — they're not in this selection model.
  const [zoomedPack, setZoomedPack] = useState<string | null>(null)
  const toggleZoom = (packId: string) =>
    setZoomedPack(prev => (prev === packId ? null : packId))

  // Guest-checkout: hit /api/stripe/checkout without an auth header. The
  // route runs in guest mode, Stripe Hosted Checkout collects the email,
  // the webhook then resolves email → uid (find-or-create) and mails the
  // sign-in magic link.
  //
  // NEVER fall back to the login modal — booster purchase must not be
  // gated by a login. If Stripe fails (key missing, network, etc.) we
  // surface the error to the user directly so it's clear the issue is
  // payment-side, not auth-side.
  const handleCheckout = async (packId: string) => {
    try {
      const res = await fetch('/api/stripe/checkout', {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ packId, locale }),
      })
      // Read as text first so a non-JSON error response (HTML 5xx page,
      // empty body, etc.) still surfaces in the console.
      const raw = await res.text()
      let data: { url?: string; error?: string; message?: string } = {}
      try { data = raw ? JSON.parse(raw) : {} } catch { /* leave raw */ }
      if (res.ok && data.url) {
        window.location.href = data.url
        return
      }
      console.error('[checkout] failed', { packId, status: res.status, raw, data })
      const msg = data.error || data.message || `HTTP ${res.status}`
      alert(locale === 'de'
        ? `Kauf konnte nicht gestartet werden: ${msg}`
        : `Checkout could not start: ${msg}`)
    } catch (err) {
      console.error('[checkout] network error', err)
      alert(locale === 'de'
        ? 'Netzwerkfehler beim Start des Kaufs. Bitte erneut probieren.'
        : 'Network error starting checkout. Please try again.')
    }
  }

  // CMS-Drift: components void CMS props and render hard-coded copy — see
  // project_landing_redesign memory. Will get resolved in "Punkt D" later.
  void headline
  void body
  void starter
  void category
  void complete

  const mastheadTitle    = locale === 'de'
    ? 'Unsere Booster Packs.'
    : 'Our Booster Packs.'

  const combosHeader     = locale === 'de' ? 'Combos' : 'Combos'
  const packsHeader      = locale === 'de' ? 'Booster Packs' : 'Booster Packs'

  const starterName      = locale === 'de' ? 'Starter Pack'  : 'Starter Pack'
  const starterPrice     = locale === 'de' ? 'Kostenlos'     : 'Free'
  const starterTagline   = locale === 'de'
    ? '20 handverlesene Berliner Spots. Direkt aus dem Welcome Pack.'
    : '20 hand-picked Berlin spots. Straight from the Welcome Pack.'

  const allBerlinName    = 'All Berlin'
  const allBerlinPrice   = '20 €'
  const allBerlinTagline = locale === 'de'
    ? `${restaurantCount}+ Berliner Spots. Alle neun Kategorien freigeschaltet. Jeder neue Pack inklusive. Einmal zahlen, kein Abo.`
    : `${restaurantCount}+ Berlin spots. All nine categories unlocked. Every new pack included. Pay once, no subscription.`

  return (
    <section className={styles.section} aria-labelledby="packs-menu-header">
      <div className={styles.inner}>

        {/* Menu masthead — single heavy poster headline (Archivo Black,
            coral, period at end). Mirrors the "Our Kitchen Section."
            treatment from the menu reference: one bold sentence, no
            eyebrow, no subtitle. */}
        <header className={styles.masthead}>
          <h2 id="packs-menu-header" className={styles.wordmark}>
            {mastheadTitle}
          </h2>
        </header>

        {/* ── Combos · Starter (free) → All Berlin (20 €) ────────────── */}
        <div className={styles.menuBlock}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>{combosHeader}</h3>
          </div>

          <ul className={styles.menuList}>
            <li>
              <button
                type="button"
                className={styles.menuItem}
                onClick={openLogin}
                aria-label={`${starterName} — ${starterPrice}`}
              >
                <span className={styles.thumb} aria-hidden="true">
                  <Image
                    src="/pics/booster/booster.webp"
                    alt=""
                    width={500}
                    height={750}
                    className={styles.thumbImg}
                    sizes="(max-width: 768px) 96px, 128px"
                  />
                </span>
                <span className={styles.itemBody}>
                  <span className={styles.nameRow}>
                    <span className={styles.itemName}>{starterName}</span>
                    <span className={styles.leader} aria-hidden="true" />
                    <span className={`${styles.itemPrice} ${styles.priceFree}`}>{starterPrice}</span>
                  </span>
                  <span className={styles.itemSpectrum}>
                    {locale === 'de' ? '20 Spots. Welcome Pack.' : '20 spots. Welcome Pack.'}
                  </span>
                  <span className={styles.itemDesc}>{starterTagline}</span>
                </span>
              </button>
            </li>

            {/* All Berlin — featured hero card. 9-pack tossed-deck scatter
                + body + explicit buy CTA. Wrapper is <div> (not <button>)
                so we can nest the real <button> for Stripe checkout. The
                CTA fires /api/stripe/checkout in guest mode — no login
                required, Stripe collects the email itself. */}
            <li>
              <div className={`${styles.menuItem} ${styles.menuItemHero}`}>
                <div className={styles.heroFan} aria-hidden="true">
                  {ALL_PACKS_FAN.map(({ slug, rot, dx, dy, z }) => (
                    <Image
                      key={slug}
                      src={`/pics/booster/booster_${slug}.webp`}
                      alt=""
                      width={500}
                      height={750}
                      className={styles.heroFanPack}
                      sizes="(max-width: 768px) 110px, 160px"
                      style={{
                        ['--rot' as string]: `${rot}deg`,
                        ['--dx'  as string]: `${dx}px`,
                        ['--dy'  as string]: `${dy}px`,
                        zIndex: z,
                      } as CSSProperties}
                    />
                  ))}
                </div>
                <div className={styles.heroBody}>
                  <span className={styles.heroBadge}>{locale === 'de' ? 'Alles drin' : 'Everything in'}</span>
                  <span className={`${styles.itemName} ${styles.heroName}`}>{allBerlinName}</span>
                  <span className={styles.itemSpectrum}>
                    {locale === 'de' ? 'Neun Kategorien. Alles freigeschaltet.' : 'Nine categories. Fully unlocked.'}
                  </span>
                  <span className={styles.itemDesc}>{allBerlinTagline}</span>
                  <button
                    type="button"
                    className={`${styles.buyCta} ${styles.heroBuyCta}`}
                    onClick={() => handleCheckout('all-berlin')}
                    aria-label={`${allBerlinName} — ${allBerlinPrice}`}
                  >
                    {locale === 'de' ? 'Hol dir All Berlin' : 'Get All Berlin'}
                    <span aria-hidden="true" className={styles.buyPrice}>{allBerlinPrice}</span>
                    <span aria-hidden="true" className={styles.buyArrow}>→</span>
                  </button>
                </div>
              </div>
            </li>
          </ul>
        </div>

        {/* ── Booster Packs · 9 single-category drops ─────────────────── */}
        <div className={styles.menuBlock}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>{packsHeader}</h3>
          </div>

          <ul className={styles.menuList}>
            {MENU_PACKS.map((p) => {
              const pack = getPack(p.packId)
              const name = locale === 'de' ? p.nameDe : p.nameEn
              const isZoomed = zoomedPack === p.packId
              const ariaLabel = `${name} — 2,99 €`

              // Shared thumb + body block — identical in collapsed and
              // zoomed states. Extracted so the only real difference
              // between the two branches (wrapper element + buy CTA)
              // stays visible at a glance.
              const packContent = (
                <>
                  <span className={styles.thumb} aria-hidden="true">
                    <Image
                      src={`/pics/booster/booster_${p.slug}.webp`}
                      alt=""
                      width={500}
                      height={750}
                      className={styles.thumbImg}
                      sizes="(max-width: 768px) 96px, 128px"
                    />
                  </span>
                  <span className={styles.itemBody}>
                    <span className={styles.nameRow}>
                      <span className={styles.itemName}>{name}</span>
                      <span className={styles.leader} aria-hidden="true" />
                      <span className={styles.itemPrice}>2,99 €</span>
                    </span>
                    <span className={styles.itemSpectrum}>{pack?.spectrum ?? ''}</span>
                    <span className={styles.itemDesc}>{pack?.description ?? ''}</span>
                  </span>
                </>
              )

              return (
                <li key={p.slug} className={isZoomed ? styles.menuRowZoomed : undefined}>
                  {/* Wrapper switches from <button> (collapsed = one big
                      click target to toggle zoom) to <div role="button">
                      (expanded = needs to host a nested <button> for the
                      buy CTA, which HTML forbids inside another button). */}
                  {isZoomed ? (
                    <div
                      className={`${styles.menuItem} ${styles.menuItemZoomed}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleZoom(p.packId)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          toggleZoom(p.packId)
                        }
                      }}
                      aria-expanded={true}
                      aria-label={ariaLabel}
                    >
                      {packContent}
                      <button
                        type="button"
                        className={styles.buyCta}
                        onClick={(e) => { e.stopPropagation(); handleCheckout(p.packId) }}
                        aria-label={locale === 'de' ? `Hol dir den ${name} — 2,99 €` : `Get the ${name} — 2,99 €`}
                      >
                        {locale === 'de' ? 'Hol dir den Pack' : 'Get the Pack'}
                        <span aria-hidden="true" className={styles.buyPrice}>2,99 €</span>
                        <span aria-hidden="true" className={styles.buyArrow}>→</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={styles.menuItem}
                      onClick={() => toggleZoom(p.packId)}
                      aria-expanded={false}
                      aria-label={ariaLabel}
                    >
                      {packContent}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}
