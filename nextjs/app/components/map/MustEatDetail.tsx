'use client'
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

export default function MustEatDetail({ mustEat, userLocation, isUnlocked, onUnlock, onClose, inSheet }: MustEatDetailProps) {
  const { t } = useTranslation()
  const distance = userLocation
    ? haversineDistance(userLocation.lat, userLocation.lng, mustEat.restaurant.lat, mustEat.restaurant.lng)
    : null

  const canUnlock = distance !== null && distance <= UNLOCK_RADIUS_METERS

  // Vibration ramps from 0 at ≥500 m away to 1 right on top of the restaurant.
  // Under 200 m the card is unlockable — animation speeds up visibly.
  const vibrateIntensity = distance === null
    ? 0
    : Math.max(0, Math.min(1, 1 - distance / 500))

  return (
    <div
      className={inSheet ? styles.detailInSheet : `${styles.detail} ${styles.detailNarrow}`}
      role="dialog"
      aria-label={`Must-Eat at ${mustEat.restaurant.name}`}
    >
      {!inSheet && (
        <button type="button" className={styles.detailClose} aria-label="Close" onClick={onClose}>
          ×
        </button>
      )}

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
