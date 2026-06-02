'use client'
import type { MapMustEat } from '@/lib/types'
import { Link } from '@/i18n/navigation'
import { formatDistance } from '@/lib/map'
import { useTranslation } from '@/lib/i18n'
import { normalizeName } from '@/lib/normalizeName'
import styles from './map.module.css'
import { UNLOCK_RADIUS_METERS, type MustEatDetailState } from './useMustEatDetailState'
import { CloseIcon, PagerArrowIcon } from './icons'

const CARD_BACK = '/pics/card-back.webp?v=5'

interface Props {
  mustEat: MapMustEat
  isUnlocked: boolean
  /** True for the brief window after the card lands: the "VERDECKT" stamp
   *  burns away and the name un-blurs into view. */
  nameBurning?: boolean
  onClose: () => void
  onBack?: () => void
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
  nameBurning,
  onClose,
  onBack: _onBack,
  onViewRestaurant,
  prevMustEat,
  nextMustEat,
  prevUnlocked,
  nextUnlocked,
  onPagePrev,
  onPageNext,
  uid: _uid,
  state,
}: Props) {
  const { t } = useTranslation()
  const { distance, canUnlock, vibrateIntensity, tapping, revealOrigin, handleCardClick, handleCardZoom } = state
  const { name: restaurantName } = mustEat.restaurant
  const open = isUnlocked && !revealOrigin
  const nameRevealed = open && !nameBurning
  const showStamp = !open || nameBurning

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

        {/* Big punchy dish name. Locked spells the name out at full weight but
            slaps a thick stamp over it so it can't be read — the presence
            stays, the surprise stays. */}
        <h1 className={styles.fdName} aria-label={nameRevealed ? undefined : t('mustEats.covered')}>
          <span className={styles.fdNameWrap}>
            <span
              className={`${styles.fdNameText}${!open ? ` ${styles.fdNameBlur}` : ''}${nameBurning ? ` ${styles.fdNameUnblurring}` : ''}`}
              aria-hidden={nameRevealed ? undefined : true}
            >
              {normalizeName(mustEat.dish)}
            </span>
            {showStamp && (
              <span
                className={`${styles.fdNameStamp}${nameBurning ? ` ${styles.fdNameStampBurning}` : ''}`}
                aria-hidden="true"
              >
                {t('mustEats.covered')}
              </span>
            )}
          </span>
        </h1>

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
                {prevMustEat ? (prevUnlocked ? normalizeName(prevMustEat.dish) : t('mustEats.covered')) : ''}
              </span>
            </button>
            <button type="button" className={styles.fdPagerNext} disabled={!nextMustEat} onClick={onPageNext}>
              <span className={styles.fdPagerName}>
                {nextMustEat ? (nextUnlocked ? normalizeName(nextMustEat.dish) : t('mustEats.covered')) : ''}
              </span>
              <span className={styles.fdPagerArrow}><PagerArrowIcon /></span>
            </button>
          </div>
        )}

        {open
          ? mustEat.description && <p className={styles.fdText}>{mustEat.description}</p>
          : (
            <div className={`${styles.fdProximity}${canUnlock ? ` ${styles.fdProximityReady}` : ''}`}>
              <p className={styles.fdProximityHead}>
                {canUnlock
                  ? 'Du bist da!'
                  : distance !== null
                    ? `Noch ${formatDistance(distance)}`
                    : 'Komm näher'}
              </p>
              <p className={styles.fdProximitySub}>
                {canUnlock
                  ? 'Tippe die Karte, um dein Must Eat aufzudecken.'
                  : `Komm auf ${UNLOCK_RADIUS_METERS} m an den Spot heran, dann kannst du die Karte aufdecken.`}
              </p>
            </div>
          )}
      </div>
    </div>
  )
}
