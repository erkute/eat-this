'use client'
import type { MapMustEat } from '@/lib/types'
import { Link } from '@/i18n/navigation'
import { useTranslation } from '@/lib/i18n'
import { normalizeName } from '@/lib/normalizeName'
import styles from './map.module.css'
import { type MustEatDetailState } from './useMustEatDetailState'

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

// One detail layout for both states. The card art (or its back) is the hero;
// below it sits a non-redundant info block — restaurant, "Zum Spot", pager.
// Open cards add the localized description; locked cards show ONLY the
// restaurant (no dish/description — it stays a surprise until revealed on
// site). No X/back chrome: the sheet is dismissed by dragging it down.
export default function MustEatDetailMobile({
  mustEat,
  isUnlocked,
  onClose: _onClose,
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
        {/* HERO — the dish card (open) or the card-back (locked). When the
            user is within range the card-back is tappable to reveal. */}
        {open ? (
          <button
            type="button"
            className={styles.fdHero}
            onClick={handleCardZoom}
            aria-label={t('map.zoomCard')}
          >
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

        {/* INFO — restaurant + Zum Spot. Open also gets the price. */}
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

        {(prevMustEat || nextMustEat) && (
          <div className={styles.fdPager}>
            <button type="button" disabled={!prevMustEat} onClick={onPagePrev}>
              ← {prevMustEat ? normalizeName(prevMustEat.dish) : ''}
            </button>
            <button
              type="button"
              className={styles.fdPagerRight}
              disabled={!nextMustEat}
              onClick={onPageNext}
            >
              {nextMustEat ? normalizeName(nextMustEat.dish) : ''} →
            </button>
          </div>
        )}

        {/* Open: localized description. Locked: a quiet reveal hint, no dish info. */}
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
