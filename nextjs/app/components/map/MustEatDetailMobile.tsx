'use client'
import type { MapMustEat } from '@/lib/types'
import { Link } from '@/i18n/navigation'
import { useTranslation } from '@/lib/i18n'
import { normalizeName } from '@/lib/normalizeName'
import styles from './map.module.css'
import { type MustEatDetailState } from './useMustEatDetailState'
import { CloseIcon } from './icons'

const CARD_BACK = '/pics/card-back.webp?v=5'

interface Props {
  mustEat: MapMustEat
  isUnlocked: boolean
  onClose: () => void
  onBack?: () => void
  onViewRestaurant?: () => void
  /** Global must-eat pager — adjacent cards + page handlers. */
  prevMustEat?: MapMustEat | null
  nextMustEat?: MapMustEat | null
  onPagePrev?: () => void
  onPageNext?: () => void
  uid?: string | null
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
  onClose,
  onBack: _onBack,
  onViewRestaurant,
  prevMustEat,
  nextMustEat,
  onPagePrev,
  onPageNext,
  uid: _uid,
  state,
}: Props) {
  const { t } = useTranslation()
  const { canUnlock, vibrateIntensity, tapping, revealOrigin, handleCardClick, handleCardZoom } = state
  const { name: restaurantName } = mustEat.restaurant
  const open = isUnlocked && !revealOrigin

  return (
    <div
      className={`${styles.detailV13} ${styles.detailV13MustEat}`}
      role="dialog"
      aria-label={`Must Eat at ${restaurantName}`}
    >
      <div className={styles.detailV13Scroll} data-detail-scroll>
        <button
          type="button"
          className={styles.fdClose}
          aria-label={t('map.searchClose') ?? 'Schließen'}
          onClick={onClose}
        >
          <CloseIcon />
        </button>

        {/* HERO — dish card (open) or card-back (locked, tap to reveal in range). */}
        {open ? (
          <button type="button" className={styles.fdHero} onClick={handleCardZoom} aria-label={t('map.zoomCard')}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={CARD_BACK} alt={t('mustEats.covered')} />
          </button>
        )}

        {/* Big punchy dish name — open only (locked keeps the surprise). */}
        {open && <h1 className={styles.fdName}>{normalizeName(mustEat.dish)}</h1>}

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
              <span className={styles.fdPagerArrow} aria-hidden="true">←</span>
              <span className={styles.fdPagerName}>{prevMustEat ? normalizeName(prevMustEat.dish) : ''}</span>
            </button>
            <button type="button" className={styles.fdPagerNext} disabled={!nextMustEat} onClick={onPageNext}>
              <span className={styles.fdPagerName}>{nextMustEat ? normalizeName(nextMustEat.dish) : ''}</span>
              <span className={styles.fdPagerArrow} aria-hidden="true">→</span>
            </button>
          </div>
        )}

        {open
          ? mustEat.description && <p className={styles.fdText}>{mustEat.description}</p>
          : (
            <p className={styles.fdText}>
              {canUnlock
                ? 'Du bist nah genug — tippe die Karte, um sie aufzudecken.'
                : 'Vor Ort dreht sich die Karte von selbst um — komm dem Spot nah.'}
            </p>
          )}
      </div>
    </div>
  )
}
