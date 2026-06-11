'use client'
import { useRef } from 'react'
import type { MapMustEat } from '@/lib/types'
import { Link } from '@/i18n/navigation'
import { formatDistance } from '@/lib/map'
import { useTranslations } from 'next-intl'
import { useTranslation } from '@/lib/i18n'
import { pickLocale } from '@/lib/i18n/pickLocale'
import { normalizeName } from '@/lib/normalizeName'
import styles from './map.module.css'
import { UNLOCK_RADIUS_METERS, type MustEatDetailState } from './useMustEatDetailState'
import { useSwipePager } from './useSwipePager'
import { CloseIcon, PagerArrowIcon } from './icons'

const CARD_BACK = '/pics/card-back.webp?v=6'

interface Props {
  mustEat: MapMustEat
  isUnlocked: boolean
  /** True for the brief window after the card lands: the "VERDECKT" stamp
   *  burns away and the name un-blurs into view. */
  nameBurning?: boolean
  onClose: () => void
  onViewRestaurant?: () => void
  /** Global must-eat pager — adjacent cards + page handlers. */
  prevMustEat?: MapMustEat | null
  nextMustEat?: MapMustEat | null
  /** Whether the adjacent cards are revealed — a locked neighbour must NOT
   *  leak its dish name in the pager (it'd spoil the surprise). */
  prevUnlocked?: boolean
  nextUnlocked?: boolean
  onPagePrev?: () => void
  onPageNext?: () => void
  state: MustEatDetailState
}

// Chewy "Screen 06" — big, punchy. Card hero → huge dish name → restaurant /
// price / "Zum Spot" with a thick stripe under it → a colour-set-off pager
// field with the neighbouring must-eats left & right → description. Locked
// cards drop the dish name + description (surprise stays) and show only the
// restaurant. A single X closes the sheet.
export default function MustEatDetailMobile({
  mustEat,
  isUnlocked,
  nameBurning,
  onClose,
  onViewRestaurant,
  prevMustEat,
  nextMustEat,
  prevUnlocked,
  nextUnlocked,
  onPagePrev,
  onPageNext,
  state,
}: Props) {
  const { t, lang } = useTranslation()
  // Legacy t() can't interpolate ICU values — parametrized keys go through next-intl directly.
  const tMap = useTranslations('map')
  const localizedDescription = pickLocale(mustEat.description, mustEat.descriptionEn, lang)
  const { distance, canUnlock, vibrateIntensity, tapping, revealOrigin, handleCardClick, handleCardZoom } = state
  const { name: restaurantName } = mustEat.restaurant
  const open = isUnlocked && !revealOrigin
  const nameRevealed = open && !nameBurning

  // Swipe anywhere on the sheet (hero, name, pager band) pages to the
  // neighbouring must-eat — same gesture as the restaurant detail.
  const rootRef = useRef<HTMLDivElement>(null)
  useSwipePager(rootRef, {
    onPrev: onPagePrev,
    onNext: onPageNext,
    hasPrev: !!prevMustEat,
    hasNext: !!nextMustEat,
  })

  return (
    <div
      ref={rootRef}
      className={`${styles.detailV13} ${styles.detailV13MustEat}`}
      role="dialog"
      aria-label={tMap('mustEatAtAria', { name: restaurantName })}
    >
      <div className={styles.detailV13Scroll} data-detail-scroll>
        <button
          type="button"
          className={styles.fdClose}
          aria-label={t('map.searchClose')}
          onClick={onClose}
        >
          <CloseIcon />
        </button>

        {/* HERO — dish card (open) or card-back (locked, tap to reveal in range). */}
        {open ? (
          <button type="button" className={styles.fdHero} onClick={handleCardZoom} aria-label={t('map.zoomCard')}>
            <img src={mustEat.image} alt={mustEat.dish} />
          </button>
        ) : (
          <button
            type="button"
            className={`${styles.fdHero} ${styles.fdHeroLocked} ${canUnlock ? styles.mustEatCardCanUnlock : ''} ${tapping ? styles.mustEatCardTapping : ''}`}
            onClick={handleCardClick}
            aria-label={canUnlock ? t('map.revealHere') : t('map.tooFarToReveal')}
            style={{
              ...(revealOrigin ? { visibility: 'hidden' } : {}),
              ['--vibrate-intensity' as string]: tapping ? '2.4' : vibrateIntensity.toFixed(3),
            }}
          >
            <img src={CARD_BACK} alt={t('mustEats.covered')} />
          </button>
        )}

        {/* Big punchy dish name. Locked: heavily blurred — present but
            unreadable (no stamp, User 2026-06-05). On reveal it slowly
            sharpens into focus. Box is identical in both states → no pop. */}
        <h1 className={styles.fdName} aria-label={nameRevealed ? undefined : t('mustEats.covered')}>
          <span
            className={`${styles.fdNameText}${!open ? ` ${styles.fdNameBlur}` : ''}${nameBurning ? ` ${styles.fdNameUnblurring}` : ''}`}
            aria-hidden={nameRevealed ? undefined : true}
          >
            {/* Covered cards arrive without the dish name (server-stripped) —
                blur the covered label instead so the box keeps its height. */}
            {mustEat.dish ? normalizeName(mustEat.dish) : t('mustEats.covered')}
          </span>
        </h1>

        {/* Description directly under the dish name (User 2026-06-05) —
            the read flows name → what it is → where to get it. */}
        {open && localizedDescription && <p className={styles.fdText}>{localizedDescription}</p>}

        {/* Locked: the proximity hint is the actionable info — it sits right
            under the stamped card, not below the fold (User 2026-06-05). */}
        {!open && (
          <div className={`${styles.fdProximity}${canUnlock ? ` ${styles.fdProximityReady}` : ''}`}>
            <p className={styles.fdProximityHead}>
              {canUnlock
                ? tMap('proximityHere')
                : distance !== null
                  ? tMap('proximityAway', { distance: formatDistance(distance) })
                  : tMap('proximityCloser')}
            </p>
            <p className={styles.fdProximitySub}>
              {canUnlock
                ? tMap('proximityTapReveal')
                : tMap('proximityHint', { meters: UNLOCK_RADIUS_METERS })}
            </p>
          </div>
        )}

        {/* Restaurant / price / Zum Spot — one thick stripe underneath. */}
        <div className={styles.fdRest}>
          <div>
            <div className={styles.fdK}>{t('map.inRestaurant')}</div>
            <div className={styles.fdV}>{normalizeName(restaurantName)}</div>
          </div>
          {open && mustEat.price && (
            <div className={styles.fdPrice}>
              <div className={styles.fdK}>{t('map.price')}</div>
              <div className={styles.fdV}>{mustEat.price}</div>
            </div>
          )}
          {onViewRestaurant ? (
            <button type="button" className={styles.ctaPill} onClick={onViewRestaurant}>
              {t('map.toSpot')}
            </button>
          ) : (
            <Link href={`/restaurant/${mustEat.restaurant.slug}`} className={styles.ctaPill}>
              {t('map.toSpot')}
            </Link>
          )}
        </div>

        {/* Colour-set-off pager field — neighbouring must-eats left & right. */}
        {(prevMustEat || nextMustEat) && (
          <div className={styles.fdPager}>
            <button type="button" className={styles.fdPagerPrev} disabled={!prevMustEat} onClick={onPagePrev}>
              <span className={styles.fdPagerArrow}><PagerArrowIcon /></span>
              <span className={styles.fdPagerName}>
                {prevMustEat ? (prevUnlocked ? normalizeName(prevMustEat.dish ?? '') : t('mustEats.covered')) : ''}
              </span>
            </button>
            <button type="button" className={styles.fdPagerNext} disabled={!nextMustEat} onClick={onPageNext}>
              <span className={styles.fdPagerName}>
                {nextMustEat ? (nextUnlocked ? normalizeName(nextMustEat.dish ?? '') : t('mustEats.covered')) : ''}
              </span>
              <span className={styles.fdPagerArrow}><PagerArrowIcon /></span>
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
