'use client'
import { useCallback } from 'react'
import { useLocale } from 'next-intl'
import { routing } from '@/i18n/routing'
import { useTranslation } from '@/lib/i18n'
import styles from './map.module.css'

interface Props {
  uid: string | null
  /** 'detail' (compact, sits inside the unlock body) or 'list' (inline
   *  inside the must-eats / restaurant list with a bit more breathing room). */
  variant: 'detail' | 'list'
}

// Map booster pitch — paid-upgrade only. The free Starter (20 cards on
// sign-up) lives on the landing; once a user is on the map they already
// redeemed it, so here we only push the next step: a category pack
// (€2,99) or All Berlin (€20). Click routes to /#hub-packs for
// signed-in users, /login for the (rare) signed-out visitor.
//
// Two variants:
// • 'list'   — editorial poster card matching the map-detail pack-promo
//              block (cream surface + fanned booster cards + Bowlby
//              sticker CTA + secondary link).
// • 'detail' — compact silver-foil banner that sits inside the must-eat
//              detail body, where vertical space is at a premium.
export default function BoosterOfferInline({ uid, variant }: Props) {
  const { t } = useTranslation()
  const locale = useLocale()

  const upgradeHref = uid
    ? (locale === routing.defaultLocale ? '/#hub-packs' : `/${locale}#hub-packs`)
    : (locale === routing.defaultLocale ? '/login' : `/${locale}/login`)

  const onUpgrade = useCallback(() => {
    if (uid) {
      window.location.href = upgradeHref
    } else {
      window.location.assign(upgradeHref)
    }
  }, [uid, upgradeHref])

  if (variant === 'list') {
    // Anon visitors get the free-starter-pack pitch (signup → 20 extra
    // spots). Signed-in users get the paid Booster/All-Berlin pitch.
    const isAnon = !uid

    return (
      <section className={styles.boosterOfferList}>
        {isAnon ? (
          <div className={`${styles.boosterStage} ${styles.boosterStageSolo}`} aria-hidden="true">
            <img src="/pics/booster/booster_free.webp" alt="" loading="lazy" className={`${styles.boosterStageCard} ${styles.boosterStageCardCenter}`} />
          </div>
        ) : (
          <div className={styles.boosterStage} aria-hidden="true">
            <img src="/pics/booster/booster_lunch.webp" alt="" loading="lazy" className={`${styles.boosterStageCard} ${styles.boosterStageCardLeft}`} />
            <img src="/pics/booster/booster_dinner.webp" alt="" loading="lazy" className={`${styles.boosterStageCard} ${styles.boosterStageCardCenter}`} />
            <img src="/pics/booster/booster_drinks.webp" alt="" loading="lazy" className={`${styles.boosterStageCard} ${styles.boosterStageCardRight}`} />
          </div>
        )}
        <div className={styles.boosterPromoCopy}>
          <h3 className={styles.boosterPromoTitle}>{t(isAnon ? 'map.starterTitle' : 'map.boosterTitle')}</h3>
          {isAnon && (
            <p className={styles.boosterPromoSub}>{t('map.starterSubline')}</p>
          )}
          <div className={styles.boosterPromoActions}>
            <button type="button" className={styles.btnPromo} onClick={onUpgrade}>
              <span className={styles.btnPromoLbl}>
                {t(isAnon ? 'map.starterCta' : 'map.boosterCta')}
                {isAnon && (
                  <svg viewBox="0 0 14 10" aria-hidden="true" className={styles.btnPromoArr}>
                    <path d="M1 5h11M8 1l4 4-4 4" />
                  </svg>
                )}
              </span>
              {!isAnon && (
                <span className={styles.btnPromoPriceTag}>
                  {t('map.boosterPriceTag')}
                  <svg viewBox="0 0 14 10" aria-hidden="true">
                    <path d="M1 5h11M8 1l4 4-4 4" />
                  </svg>
                </span>
              )}
            </button>
            {isAnon ? (
              <a href={upgradeHref} className={styles.linkPromo}>
                {t('map.starterPromoLogin')}
              </a>
            ) : (
              /* All-Berlin on its own second line under the pack CTA. */
              <a href={upgradeHref} className={styles.linkPromo}>
                {t('map.boosterSecondary')}
              </a>
            )}
          </div>
        </div>
      </section>
    )
  }

  // Detail variant — keep the existing compact silver-foil banner so the
  // must-eat unlock body stays tight.
  return (
    <div className={styles.boosterOffer}>
      <div className={styles.boosterFan} aria-hidden="true">
        <img src="/pics/booster/booster_coffee.webp" alt="" loading="lazy" className={`${styles.boosterFanPack} ${styles.boosterFanPackLeft}`} />
        <img src="/pics/booster/booster_pizza.webp" alt="" loading="lazy" className={`${styles.boosterFanPack} ${styles.boosterFanPackRight}`} />
        <img src="/pics/booster/booster_dinner.webp" alt="" loading="lazy" className={`${styles.boosterFanPack} ${styles.boosterFanPackFront}`} />
      </div>

      <div className={styles.boosterInfo}>
        <div className={styles.boosterTitle}>{t('map.boosterTitle')}</div>
        <div className={styles.boosterDesc}>{t('map.boosterDesc')}</div>
        <button
          type="button"
          className={styles.boosterCta}
          onClick={onUpgrade}
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
