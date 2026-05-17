'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useLoginModal } from '@/lib/auth'
import { getPack } from '@/lib/stripe-catalog'
import styles from './PacksSection.module.css'

interface Props {
  locale: 'de' | 'en'
  /** Live restaurant total — interpolated into All-Berlin description so
   *  the "{count}+ Berliner Spots" line stays accurate as the catalogue
   *  grows. */
  restaurantCount: number
}

// 9 Category Packs — vertical menu listing. `getPack(packId)` is the
// single source of truth (mirrors Profile-Booster + Stripe Hosted Checkout
// body). Listed in the user-facing rhythm: caffeine → meal → indulgence.
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

// All-Berlin 9-pack fan — 3×3 grid centred in the hero card. Mirrored
// rotations (left tilts -, right tilts +, centre column straight); top and
// bottom rows slightly rotated more than mid row. Positions tuned so the
// outer packs stay inside the 1:1 fan square (no overflow at the All-Berlin
// card border).
type FanPack = { slug: string; tx: number; ty: number; rot: number; z: number }
const ALL_PACKS_FAN: FanPack[] = [
  { slug: 'breakfast',  tx: -97, ty: -55, rot: -7, z: 1 },
  { slug: 'sweets',     tx:   0, ty: -58, rot:  0, z: 2 },
  { slug: 'pizza',      tx:  97, ty: -55, rot:  7, z: 3 },
  { slug: 'fastfood',   tx: -100, ty:  0, rot: -4, z: 4 },
  { slug: 'lunch',      tx:   0, ty:  0, rot:  0, z: 5 },
  { slug: 'coffee',     tx: 100, ty:  0, rot:  4, z: 6 },
  { slug: 'drinks',     tx: -97, ty: 55, rot: -7, z: 7 },
  { slug: 'dinner',     tx:   0, ty: 58, rot:  0, z: 9 },
  { slug: 'finedining', tx:  97, ty: 55, rot:  7, z: 8 },
]

export default function PacksSection({ locale, restaurantCount }: Props) {
  const { open: openLogin } = useLoginModal()

  // Inline toast for checkout failures (replaces alert(): less jarring,
  // matches the section's editorial chrome). Auto-dismisses after 6 s.
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  useEffect(() => {
    if (!checkoutError) return
    const t = setTimeout(() => setCheckoutError(null), 6000)
    return () => clearTimeout(t)
  }, [checkoutError])

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
      const raw = await res.text()
      let data: { url?: string; error?: string; message?: string } = {}
      try { data = raw ? JSON.parse(raw) : {} } catch { /* leave raw */ }
      if (res.ok && data.url) {
        window.location.href = data.url
        return
      }
      console.error('[checkout] failed', { packId, status: res.status, raw, data })
      const msg = data.error || data.message || `HTTP ${res.status}`
      setCheckoutError(locale === 'de'
        ? `Kauf konnte nicht gestartet werden: ${msg}`
        : `Checkout could not start: ${msg}`)
    } catch (err) {
      console.error('[checkout] network error', err)
      setCheckoutError(locale === 'de'
        ? 'Netzwerkfehler beim Start des Kaufs. Bitte erneut probieren.'
        : 'Network error starting checkout. Please try again.')
    }
  }

  const t = locale === 'de'
    ? {
        eyebrow:        'Booster',
        mastheadL1:     'Pick',
        mastheadL2:     'a Pack',
        starterName:    'Starter Pack',
        starterDesc:    '20 handverlesene Berliner Spots.',
        starterLabel:   'Anmelden →',
        starterPrice:   'Gratis',
        abEyebrow:      'Die ganze Karte —',
        abName:         'All Berlin',
        abSpectrum:     'Neun Kategorien. Plus alles was kommt.',
        abDesc:         `${restaurantCount}+ Berliner Spots. Alle neun Kategorien freigeschaltet. Jeder neue Pack inklusive. Einmal zahlen, kein Abo.`,
        abLabel:        'Hol dir All Berlin',
        statSpots:      'Spots',
        statCategories: 'Kategorien',
        statUpdates:    'Updates',
        boosterHeader:  'Boosterpacks',
        buyLabel:       'Hol dir →',
      }
    : {
        eyebrow:        'Booster',
        mastheadL1:     'Pick',
        mastheadL2:     'a Pack',
        starterName:    'Starter Pack',
        starterDesc:    '20 hand-picked Berlin spots.',
        starterLabel:   'Sign up →',
        starterPrice:   'Free',
        abEyebrow:      'The whole map —',
        abName:         'All Berlin',
        abSpectrum:     'Nine categories. Plus everything new.',
        abDesc:         `${restaurantCount}+ Berlin spots. All nine categories unlocked. Every new pack included. Pay once, no subscription.`,
        abLabel:        'Get All Berlin',
        statSpots:      'Spots',
        statCategories: 'Categories',
        statUpdates:    'Updates',
        boosterHeader:  'Boosterpacks',
        buyLabel:       'Get it →',
      }

  return (
    <section className={styles.section} aria-labelledby="packs-menu-header">
      <div className={styles.inner}>

        {/* Section masthead — Ranchers display, eyebrow above. */}
        <header className={styles.masthead}>
          <p className={styles.eyebrow}>{t.eyebrow}</p>
          <h2 id="packs-menu-header" className={styles.wordmark}>
            {t.mastheadL1}<br />{t.mastheadL2}
          </h2>
        </header>

        {/* Starter Pack — single row, no "Combos" label, direct Login-CTA. */}
        <div className={styles.starterRow}>
          <div className={styles.thumb} aria-hidden="true">
            <Image
              src="/pics/booster/booster.webp"
              alt=""
              width={500}
              height={750}
              className={styles.thumbImg}
              sizes="(max-width: 700px) 110px, 160px"
            />
          </div>
          <div className={styles.body}>
            <h3 className={styles.packName}>{t.starterName}</h3>
            <p className={styles.packDesc}>{t.starterDesc}</p>
          </div>
          <button
            type="button"
            className={`${styles.buy} ${styles.buyFree}`}
            onClick={openLogin}
            aria-label={`${t.starterName} — ${t.starterPrice}`}
          >
            <span className={styles.buyLabel}>{t.starterLabel}</span>
            <span className={styles.buyPrice}>{t.starterPrice}</span>
          </button>
        </div>

        {/* All Berlin Hero — Cream card with 3D layered shadow, stats grid,
            9-pack fan composition right, Slackey CTA. Mobile stacks
            text-then-fan. */}
        <div className={styles.allBerlin}>
          <div className={styles.abContent}>
            <div className={styles.abText}>
              <p className={styles.abEyebrow}>{t.abEyebrow}</p>
              <h3 className={styles.abName}>{t.abName}</h3>
              <p className={styles.abDesc}>{t.abDesc}</p>

              <div className={styles.stats} role="list">
                <div className={styles.stat} role="listitem">
                  <span className={styles.statNum}>{restaurantCount}</span>
                  <span className={styles.statLabel}>{t.statSpots}</span>
                </div>
                <div className={styles.stat} role="listitem">
                  <span className={styles.statNum}>9</span>
                  <span className={styles.statLabel}>{t.statCategories}</span>
                </div>
                <div className={styles.stat} role="listitem">
                  <span className={styles.statNum}>∞</span>
                  <span className={styles.statLabel}>{t.statUpdates}</span>
                </div>
              </div>

              <button
                type="button"
                className={styles.abCta}
                onClick={() => handleCheckout('all-berlin')}
                aria-label={`${t.abName} — 20 €`}
              >
                <span>{t.abLabel}</span>
                <span className={styles.abCtaPrice}>20&nbsp;€</span>
              </button>
            </div>

            <div className={styles.fan} aria-hidden="true">
              {ALL_PACKS_FAN.map(({ slug, tx, ty, rot, z }) => (
                <div
                  key={slug}
                  className={styles.fanPack}
                  style={{
                    ['--tx' as string]: `${tx}%`,
                    ['--ty' as string]: `${ty}%`,
                    ['--rot' as string]: `${rot}deg`,
                    zIndex: z,
                  }}
                >
                  <Image
                    src={`/pics/booster/booster_${slug}.webp`}
                    alt=""
                    width={500}
                    height={750}
                    sizes="(max-width: 700px) 100px, 132px"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 9 Boosterpacks — one row per category, direct buy CTA right. */}
        <div className={styles.menuBlock}>
          <div className={styles.blockHeader}>
            <h3 className={styles.blockTitle}>{t.boosterHeader}</h3>
            <span className={styles.blockCount}>09</span>
          </div>

          <ul className={styles.menuList}>
            {MENU_PACKS.map((p) => {
              const pack = getPack(p.packId)
              const name = locale === 'de' ? p.nameDe : p.nameEn
              return (
                <li key={p.slug} className={styles.pack}>
                  <div className={styles.thumb} aria-hidden="true">
                    <Image
                      src={`/pics/booster/booster_${p.slug}.webp`}
                      alt=""
                      width={500}
                      height={750}
                      className={styles.thumbImg}
                      sizes="(max-width: 700px) 110px, 160px"
                    />
                  </div>
                  <div className={styles.body}>
                    <h4 className={styles.packName}>{name}</h4>
                    <p className={styles.packSpectrum}>{pack?.spectrum ?? ''}</p>
                    <p className={styles.packDesc}>{pack?.description ?? ''}</p>
                  </div>
                  <button
                    type="button"
                    className={styles.buy}
                    onClick={() => handleCheckout(p.packId)}
                    aria-label={locale === 'de' ? `Hol dir den ${name} — 2,99 €` : `Get the ${name} — 2,99 €`}
                  >
                    <span className={styles.buyLabel}>{t.buyLabel}</span>
                    <span className={styles.buyPrice}>2,99&nbsp;€</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>

      {checkoutError && (
        <div className={styles.toast} role="status" aria-live="polite">
          <span className={styles.toastMsg}>{checkoutError}</span>
          <button
            type="button"
            className={styles.toastClose}
            onClick={() => setCheckoutError(null)}
            aria-label={locale === 'de' ? 'Schließen' : 'Dismiss'}
          >
            ×
          </button>
        </div>
      )}
    </section>
  )
}
