'use client'
import { useState } from 'react'
import type { MapMustEat } from '@/lib/types'
import { haversineDistance, formatDistance } from '@/lib/map/distance'
import type { UserLocation } from '@/lib/map/useUserLocation'
import LocaleLink from '@/app/components/LocaleLink'
import { useTranslation } from '@/lib/i18n'
import styles from './map.module.css'

const UNLOCK_RADIUS_METERS = 200

interface MustEatDetailProps {
  mustEat: MapMustEat
  userLocation: UserLocation | null
  isUnlocked: boolean
  onUnlock: () => void
  onClose: () => void
  inSheet?: boolean
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

function UnlockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 7.5-1.5" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  )
}

export default function MustEatDetail({ mustEat, userLocation, isUnlocked, onUnlock, onClose, inSheet }: MustEatDetailProps) {
  const { t } = useTranslation()
  const distance = userLocation
    ? haversineDistance(userLocation.lat, userLocation.lng, mustEat.restaurant.lat, mustEat.restaurant.lng)
    : null

  const canUnlock = distance !== null && distance <= UNLOCK_RADIUS_METERS

  // Vibration ramps from a small idle baseline (0.18 — always perceptible)
  // up to 1.0 right on top of the restaurant. Under 200 m it's unlockable.
  const vibrateIntensity = distance === null
    ? 0.18
    : Math.max(0.18, Math.min(1, 1 - distance / 500))

  // Distance still needed to reach the 200 m unlock radius.
  const distToUnlock = distance === null
    ? null
    : Math.max(0, distance - UNLOCK_RADIUS_METERS)

  // Progress toward unlock — 0 at >700 m (=500 m beyond radius), 1 inside the radius.
  const progress = distance === null
    ? 0
    : distToUnlock === 0
      ? 1
      : Math.max(0, 1 - distToUnlock! / 500)

  const [tapping, setTapping] = useState(false)
  const handleCardClick = () => {
    if (canUnlock) {
      onUnlock()
      return
    }
    // Locked tap: stronger shake feedback, then settle back.
    setTapping(true)
    window.setTimeout(() => setTapping(false), 320)
  }

  // ────────────────────── In-sheet (mobile) ──────────────────────
  if (inSheet) {
    const lockedSubline = distance === null
      ? t('map.enableLocation')
      : canUnlock
        ? t('map.revealHere')
        : `noch ${formatDistance(distToUnlock!)} bis zum Reveal`

    const ctaTopLine = isUnlocked
      ? 'Freigeschaltet · Must-Eat'
      : distance === null
        ? 'Verschlossen'
        : canUnlock
          ? 'Bereit zum Aufdecken'
          : `Verschlossen · noch ${formatDistance(distToUnlock!)}`

    return (
      <div className={styles.detailInSheet} role="dialog" aria-label={`Must-Eat at ${mustEat.restaurant.name}`}>
        <div className={styles.detailInSheetScroll}>
          <div
            className={styles.mustEatHero}
            style={{ ['--vibrate-intensity' as string]: vibrateIntensity.toFixed(3) }}
          >
            <button type="button" className={styles.detailHeroClose} aria-label="Close" onClick={onClose}>
              <CloseIcon />
            </button>
            <div className={styles.mustEatGlow} aria-hidden="true" />
            {isUnlocked ? (
              <img
                key={mustEat._id}
                src={mustEat.image}
                alt={mustEat.dish}
                className={styles.mustEatPhoto}
              />
            ) : (
              <button
                type="button"
                className={`${styles.mustEatCard} ${canUnlock ? styles.mustEatCardCanUnlock : ''} ${tapping ? styles.mustEatCardTapping : ''}`}
                onClick={handleCardClick}
                aria-label={canUnlock ? t('map.revealHere') : t('map.tooFarToReveal')}
              />
            )}
          </div>

          <div className={styles.mustEatBody}>
            <span className={styles.mustEatEyebrow}>
              {isUnlocked ? <><UnlockIcon /> Must-Eat · freigeschaltet</> : <><LockIcon /> Must-Eat · verschlossen</>}
            </span>
            <h3 className={styles.mustEatRestaurantName}>
              {isUnlocked ? mustEat.dish : mustEat.restaurant.name}
            </h3>
            <p className={styles.mustEatInfoRow}>
              {isUnlocked
                ? [mustEat.restaurant.name, mustEat.restaurant.district, mustEat.price].filter(Boolean).join(' · ')
                : [mustEat.restaurant.district, mustEat.price, distance !== null ? `${formatDistance(distance)} entfernt` : null].filter(Boolean).join(' · ')}
            </p>

            {!isUnlocked && (
              <>
                <div className={styles.mustEatProgress}>
                  <div className={styles.mustEatProgressFill} style={{ width: `${Math.round(progress * 100)}%` }} />
                </div>
                <div className={styles.mustEatProgressLabel}>{lockedSubline}</div>
              </>
            )}

            {isUnlocked && mustEat.description && (
              <p className={styles.mustEatDescription}>{mustEat.description}</p>
            )}
          </div>
        </div>

        <div className={styles.detailFooter}>
          <LocaleLink href={`/restaurant/${mustEat.restaurant.slug}`} className={styles.mustEatCombined}>
            <span className={styles.mustEatCombinedTop}>
              {isUnlocked ? <UnlockIcon /> : <LockIcon />}
              {ctaTopLine}
            </span>
            <span className={styles.mustEatCombinedBottom}>
              <span>{t('map.viewRestaurant')}</span>
              <ArrowIcon />
            </span>
          </LocaleLink>
        </div>
      </div>
    )
  }

  // ────────────────────── Desktop floating modal (unchanged) ──────────────────────
  return (
    <div
      className={`${styles.detail} ${styles.detailNarrow}`}
      role="dialog"
      aria-label={`Must-Eat at ${mustEat.restaurant.name}`}
    >
      <button type="button" className={styles.detailClose} aria-label="Close" onClick={onClose}>
        ×
      </button>

      {isUnlocked ? (
        <div className={styles.mustCardFlip}>
          <img
            key={mustEat._id}
            src={mustEat.image}
            alt={mustEat.dish}
          />
        </div>
      ) : (
        <div
          className={styles.mustCardBackHero}
          style={{
            ['--vibrate-intensity' as string]: vibrateIntensity.toFixed(3),
          }}
        >
          <button
            type="button"
            className={`${styles.mustCardBackTap} ${canUnlock ? styles.mustCardBackTappable : ''}`}
            onClick={canUnlock ? onUnlock : undefined}
            disabled={!canUnlock}
            aria-label={canUnlock ? t('map.revealHere') : t('map.tooFarToReveal')}
          />
        </div>
      )}

      <div className={styles.detailBody}>
        <div className={styles.sectionLabel} style={{ color: 'var(--accent)' }}>{t('map.mustEatLabel')}</div>

        <h3 className={styles.detailName}>
          {isUnlocked ? mustEat.dish : mustEat.restaurant.name}
        </h3>

        <div className={styles.detailRow}>
          {isUnlocked
            ? <span>{mustEat.restaurant.name}{mustEat.restaurant.district ? ` · ${mustEat.restaurant.district}` : ''}</span>
            : <span>{mustEat.restaurant.district}</span>}
          {mustEat.price && <><span className={styles.detailDot}>·</span><span>{mustEat.price}</span></>}
          {distance !== null && <><span className={styles.detailDot}>·</span><span>{formatDistance(distance)}</span></>}
        </div>

        {isUnlocked && mustEat.description && (
          <p className={styles.detailSub} style={{ lineHeight: 1.6 }}>
            {mustEat.description}
          </p>
        )}

        {!isUnlocked && (
          <div className={styles.unlockHint}>
            {canUnlock
              ? t('map.revealHere')
              : distance !== null
                ? `${formatDistance(distance)} ${t('map.awayToUnlock')}`
                : t('map.enableLocation')}
          </div>
        )}

        <div className={styles.detailActions}>
          {isUnlocked && (
            <LocaleLink
              href={`/restaurant/${mustEat.restaurant.slug}`}
              className={`${styles.btn} ${styles.btnPrimary}`}
            >
              {t('map.viewRestaurant')}
            </LocaleLink>
          )}
        </div>
      </div>
    </div>
  )
}
