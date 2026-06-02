'use client'
import type { MapMustEat } from '@/lib/types'
import { formatDistance } from '@/lib/map'
import { Link } from '@/i18n/navigation'
import { useTranslation } from '@/lib/i18n'
import { normalizeName } from '@/lib/normalizeName'
import styles from './map.module.css'
import { UNLOCK_RADIUS_METERS, type MustEatDetailState } from './useMustEatDetailState'
import { CloseIcon } from './icons'

interface Props {
  mustEat: MapMustEat
  isUnlocked: boolean
  onClose: () => void
  onViewRestaurant?: () => void
  /** Global must-eat pager — adjacent cards + page handlers (Phase 1 threaded
   *  them in; consumed by the .fd-pager here). */
  prevMustEat?: MapMustEat | null
  nextMustEat?: MapMustEat | null
  onPagePrev?: () => void
  onPageNext?: () => void
  uid?: string | null
  state: MustEatDetailState
}

export default function MustEatDetailDesktop({
  mustEat,
  isUnlocked,
  onClose,
  onViewRestaurant,
  prevMustEat,
  nextMustEat,
  onPagePrev,
  onPageNext,
  uid: _uid,
  state,
}: Props) {
  const { t } = useTranslation()
  const {
    distance,
    canUnlock,
    vibrateIntensity,
    tapping,
    revealOrigin,
    handleCardClick,
    handleCardZoom,
  } = state

  const { name: restaurantName } = mustEat.restaurant

  return (
    <div
      className={styles.detailV13}
      role="dialog"
      aria-label={`Must Eat at ${restaurantName}`}
    >
      <div className={styles.detailV13Scroll} data-detail-scroll>

        <div className={styles.heroActionsDesktop}>
          <button
            type="button"
            className={`${styles.heroAction} ${styles.heroActionOnHandle} ${styles.heroActionClose}`}
            aria-label="Close"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>

        {isUnlocked && !revealOrigin ? (
          /* UNLOCKED — Chewy Screen 06 dish view */
          <>
            <button
              type="button"
              className={styles.fdHero}
              onClick={handleCardZoom}
              aria-label={t('map.zoomCard')}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mustEat.image} alt={mustEat.dish} />
            </button>
            <h1 className={styles.fdName}>{normalizeName(mustEat.dish)}</h1>
            <div className={styles.fdRest}>
              <div>
                <div className={styles.fdK}>{t('map.inRestaurant')}</div>
                <div className={styles.fdV}>{normalizeName(restaurantName)}</div>
              </div>
              {mustEat.price && (
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
            {mustEat.description && <p className={styles.fdText}>{mustEat.description}</p>}
          </>
        ) : (
          /* LOCKED — proximity-reveal game (logic unchanged) */
          <>
            <header className={styles.heroYellow} data-detail-hero>
              <h2 className={styles.heroName}>{normalizeName('MUST EAT')}</h2>
              <p className={styles.heroMeta}>
                <span className={styles.heroDistrict}>{restaurantName}</span>
              </p>
            </header>

            <div className={styles.musteatStrip}>
              <span className={styles.musteatStripStamp} aria-hidden="true">
                <span className={styles.musteatLockStampLabel}>Verdeckt</span>
                {distance !== null && (
                  <span className={styles.musteatLockStampDist}>
                    {formatDistance(distance)} entfernt
                  </span>
                )}
              </span>
              <button
                type="button"
                className={`${styles.musteatStripCard} ${canUnlock ? styles.mustEatCardCanUnlock : ''} ${tapping ? styles.mustEatCardTapping : ''}`}
                onClick={handleCardClick}
                aria-label={canUnlock ? t('map.revealHere') : t('map.tooFarToReveal')}
                style={{
                  ...(revealOrigin ? { visibility: 'hidden' } : {}),
                  ['--vibrate-intensity' as string]: tapping
                    ? '2.4'
                    : vibrateIntensity.toFixed(3),
                }}
              />
            </div>

            <aside className={styles.musteatLockBlock}>
              <strong className={styles.musteatLockTitle}>
                {canUnlock ? 'Du bist nah genug!' : `Komm auf ${UNLOCK_RADIUS_METERS} m heran`}
              </strong>
              <span className={styles.musteatLockBody}>
                {canUnlock
                  ? 'Tippe die Karte auf und dein Must Eat ist freigeschaltet.'
                  : 'Sobald du im Umkreis von 50 m bist, lässt sich die Karte aufdecken.'}
              </span>
            </aside>
          </>
        )}

      </div>
    </div>
  )
}
