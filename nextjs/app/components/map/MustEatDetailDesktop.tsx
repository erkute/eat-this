'use client'
import { useEffect, useRef } from 'react'
import type { MapMustEat } from '@/lib/types'
import { formatDistance, formatWalkingTime } from '@/lib/map'
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
  onViewAllMustEats?: () => void
  uid?: string | null
  state: MustEatDetailState
}

export default function MustEatDetailDesktop({ mustEat, isUnlocked, onClose, onViewAllMustEats, uid: _uid, state }: Props) {
  const { t } = useTranslation()
  const mapsDetailsRef = useRef<HTMLDetailsElement>(null)
  const {
    distance,
    canUnlock,
    vibrateIntensity,
    tapping,
    revealOrigin,
    handleCardClick,
    handleCardZoom,
  } = state

  const { lat, lng, name: restaurantName, district, address } = mustEat.restaurant
  const walkingTime = distance != null ? formatWalkingTime(distance) : null
  const mapsQuery = address ? `${restaurantName}, ${address}` : restaurantName
  const mapsGoogleHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`
  const mapsAppleHref = `https://maps.apple.com/?q=${encodeURIComponent(mapsQuery)}`

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const el = mapsDetailsRef.current
      if (el && el.open && !el.contains(e.target as Node)) el.open = false
    }
    document.addEventListener('pointerdown', onDocClick)
    return () => document.removeEventListener('pointerdown', onDocClick)
  }, [])

  const heroName = isUnlocked ? mustEat.dish : 'MUST EAT'

  return (
    <div
      className={styles.detailV13}
      role="dialog"
      aria-label={`Must Eat at ${restaurantName}`}
    >
      <div className={styles.detailV13Scroll} data-detail-scroll>

        <header className={styles.heroYellow} data-detail-hero>
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
          <h2 className={styles.heroName}>{normalizeName(heroName)}</h2>
          <p className={styles.heroMeta}>
            <span className={styles.heroDistrict}>{restaurantName}</span>
            {district && <span className={styles.heroCuisine}>{district}</span>}
          </p>
        </header>

        <div className={styles.musteatStrip}>
          {!isUnlocked && (
            <span className={styles.musteatStripStamp} aria-hidden="true">
              <span className={styles.musteatLockStampLabel}>Verdeckt</span>
              {distance !== null && (
                <span className={styles.musteatLockStampDist}>
                  {formatDistance(distance)} entfernt
                </span>
              )}
            </span>
          )}
          {isUnlocked && !revealOrigin ? (
            <button
              type="button"
              className={styles.musteatStripPhoto}
              onClick={handleCardZoom}
              aria-label="Karte vergrößern"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mustEat.image} alt={mustEat.dish} />
            </button>
          ) : (
            <button
              type="button"
              className={`${styles.musteatStripCard} ${canUnlock ? styles.mustEatCardCanUnlock : ''} ${tapping ? styles.mustEatCardTapping : ''}`}
              onClick={handleCardClick}
              aria-label={canUnlock ? t('map.revealHere') : t('map.tooFarToReveal')}
              style={{
                ...(revealOrigin ? { visibility: 'hidden' } : {}),
                ['--vibrate-intensity' as string]: tapping
                  ? '2.4'
                  : !isUnlocked ? vibrateIntensity.toFixed(3) : '0',
              }}
            />
          )}
        </div>

        {!isUnlocked && (
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
        )}

        <div className={styles.musteatActionsGrid}>
          <Link
            href={`/restaurant/${mustEat.restaurant.slug}`}
            className={`${styles.musteatStickerBtn} ${styles.musteatStickerPrimary}`}
          >
            Restaurant
            <svg viewBox="0 0 16 11" aria-hidden="true">
              <path d="M1 5.5h13M9.5 1l4.5 4.5L9.5 10" />
            </svg>
          </Link>
          {onViewAllMustEats && (
            <button
              type="button"
              onClick={onViewAllMustEats}
              className={`${styles.musteatStickerBtn} ${styles.musteatStickerSecondary}`}
            >
              Alle Karten
              <svg viewBox="0 0 16 11" aria-hidden="true">
                <path d="M1 5.5h13M9.5 1l4.5 4.5L9.5 10" />
              </svg>
            </button>
          )}
        </div>
        <div className={styles.musteatUtilityRow}>
          <details ref={mapsDetailsRef} className={styles.metaMapsPop}>
            <summary>{t('map.inMaps')}</summary>
            <div className={styles.metaMapsPopMenu}>
              <a href={mapsAppleHref} target="_blank" rel="noopener noreferrer">
                {t('map.mapsApple')}
              </a>
              <a href={mapsGoogleHref} target="_blank" rel="noopener noreferrer">
                {t('map.mapsGoogle')}
              </a>
            </div>
          </details>
          {walkingTime && (
            <>
              <span className={styles.metaSep} aria-hidden="true" />
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {walkingTime} {t('map.walkMinutes') ?? 'zu Fuß'}
              </a>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
