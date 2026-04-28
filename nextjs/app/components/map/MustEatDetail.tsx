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
  onViewRestaurant?: () => void
  onShowMustEatList?: () => void
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

export default function MustEatDetail({ mustEat, userLocation, isUnlocked, onUnlock, onClose, onViewRestaurant, onShowMustEatList, inSheet }: MustEatDetailProps) {
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
    return (
      <div className={styles.detailInSheet} role="dialog" aria-label={`Must-Eat at ${mustEat.restaurant.name}`}>
        <div className={styles.detailInSheetScroll} data-detail-scroll>
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
                : [mustEat.restaurant.district, mustEat.price].filter(Boolean).join(' · ')}
            </p>

            {!isUnlocked && (
              <>
                <div className={styles.mustEatExplainer}>
                  <strong>Verschlossen.</strong> Plane deinen Besuch beim Restaurant — sobald du innerhalb von 200 m bist, deckt sich die Karte automatisch auf.
                </div>

                <div className={styles.boosterOffer}>
                  <img src="/pics/booster/booster5.webp" alt="" className={styles.boosterImg} loading="lazy" />
                  <div className={styles.boosterInfo}>
                    <div className={styles.boosterEyebrow}>Skip the Wait</div>
                    <div className={styles.boosterTitle}>Booster Pack</div>
                    <div className={styles.boosterDesc}>10 zufällige Must-Eats sofort freischalten — kein Hinlaufen nötig.</div>
                    <button type="button" className={styles.boosterCta}>
                      Pack holen · 0,99 €
                    </button>
                  </div>
                </div>
              </>
            )}

            {isUnlocked && mustEat.description && (
              <p className={styles.mustEatDescription}>{mustEat.description}</p>
            )}

            <div className={styles.mustEatLinks}>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${mustEat.restaurant.lat},${mustEat.restaurant.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.mustEatLink}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>In Google Maps öffnen</span>
              </a>
              {onViewRestaurant ? (
                <button type="button" onClick={onViewRestaurant} className={styles.mustEatLink}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 11l9-8 9 8v10a2 2 0 01-2 2h-4v-7H9v7H5a2 2 0 01-2-2V11z" />
                  </svg>
                  <span>Restaurant ansehen</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={styles.mustEatLinkArrow}>
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </button>
              ) : (
                <LocaleLink href={`/restaurant/${mustEat.restaurant.slug}`} className={styles.mustEatLink}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 11l9-8 9 8v10a2 2 0 01-2 2h-4v-7H9v7H5a2 2 0 01-2-2V11z" />
                  </svg>
                  <span>Restaurant ansehen</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={styles.mustEatLinkArrow}>
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </LocaleLink>
              )}
            </div>

            {onShowMustEatList && (
              <button
                type="button"
                className={styles.mustEatListLink}
                onClick={onShowMustEatList}
              >
                Alle Must-Eats anzeigen
              </button>
            )}
          </div>
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
          <>
            <div className={styles.unlockHint}>
              {canUnlock
                ? t('map.revealHere')
                : distance !== null
                  ? `${formatDistance(distance)} ${t('map.awayToUnlock')}`
                  : t('map.enableLocation')}
            </div>

            <div className={styles.mustEatExplainer}>
              <strong>So schaltest du es frei:</strong> Geh zum Restaurant — sobald du innerhalb von 200 m bist, deckt sich die Karte automatisch auf.
            </div>

            <div className={styles.boosterOffer}>
              <img src="/pics/booster/booster5.webp" alt="" className={styles.boosterImg} loading="lazy" />
              <div className={styles.boosterInfo}>
                <div className={styles.boosterEyebrow}>Skip the Wait</div>
                <div className={styles.boosterTitle}>Booster Pack</div>
                <div className={styles.boosterDesc}>5 zufällige Must-Eats sofort freischalten — kein Hinlaufen nötig.</div>
                <button type="button" className={styles.boosterCta}>
                  Pack holen · 4,99 €
                </button>
              </div>
            </div>
          </>
        )}

        <div className={styles.detailActions}>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${mustEat.restaurant.lat},${mustEat.restaurant.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.btn} ${styles.btnSecondary}`}
            aria-label="In Google Maps öffnen"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: 6, verticalAlign: 'middle' }}>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Google Maps
          </a>
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
