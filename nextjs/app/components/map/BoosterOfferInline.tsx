'use client'
import { useCallback } from 'react'
import { useLocale } from 'next-intl'
import { routing } from '@/i18n/routing'
import { useTranslation } from '@/lib/i18n'
import styles from './map.module.css'

interface Props {
  uid: string | null
  /** 'detail' (compact, sits inside the unlock body) or 'list' (inline
   *  inside the Must-Eats list with a bit more breathing room). */
  variant: 'detail' | 'list'
}

// Map banner — paid-upgrade pitch only. The free Starter (10 cards on
// sign-up) lives on the landing page; once a user is on the map they
// already redeemed it, so here we only push the next step: a category
// pack (€2,99) or All Berlin (€20).
//
// Visual energy: a 3-pack fan with a slow shine sweep and a red CTA with
// a chevron that nudges right on hover. Pricing is in the body copy
// (no floating chip — clutter risk + horizontal-clip risk on hover).
// Click routes to /profile#booster for signed-in users, /login for the
// (rare) signed-out visitor.
export default function BoosterOfferInline({ uid, variant }: Props) {
  const { t } = useTranslation()
  const locale = useLocale()

  const onClick = useCallback(() => {
    if (uid) {
      window.location.href = locale === routing.defaultLocale ? '/profile#booster' : `/${locale}/profile#booster`
    } else {
      window.location.assign(locale === routing.defaultLocale ? '/login' : `/${locale}/login`)
    }
  }, [uid, locale])

  const containerClass = variant === 'list' ? styles.boosterOfferList : styles.boosterOffer

  return (
    <div className={containerClass}>
      <div className={styles.boosterFan} aria-hidden="true">
        {/* eslint-disable @next/next/no-img-element */}
        <img src="/pics/booster/booster_coffee.webp" alt="" loading="lazy" className={`${styles.boosterFanPack} ${styles.boosterFanPackLeft}`} />
        <img src="/pics/booster/booster_pizza.webp" alt="" loading="lazy" className={`${styles.boosterFanPack} ${styles.boosterFanPackRight}`} />
        <img src="/pics/booster/booster_dinner.webp" alt="" loading="lazy" className={`${styles.boosterFanPack} ${styles.boosterFanPackFront}`} />
        {/* eslint-enable @next/next/no-img-element */}
      </div>

      <div className={styles.boosterInfo}>
        <div className={styles.boosterTitle}>{t('map.boosterTitle')}</div>
        <div className={styles.boosterDesc}>{t('map.boosterDesc')}</div>
        <button
          type="button"
          className={styles.boosterCta}
          onClick={onClick}
        >
          {t('map.boosterCta')}
          <svg className={styles.boosterCtaChevron} aria-hidden="true" width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M3 2l3 3-3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}
