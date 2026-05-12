'use client'
import type { MapMustEat } from '@/lib/types'
import { formatDistance } from '@/lib/map'
import { Link } from '@/i18n/navigation'
import { useTranslation } from '@/lib/i18n'
import styles from './map.module.css'
import BoosterOfferInline from './BoosterOfferInline'
import type { MustEatDetailState } from './useMustEatDetailState'

interface Props {
  mustEat: MapMustEat
  isUnlocked: boolean
  onClose: () => void
  uid?: string | null
  state: MustEatDetailState
}

export default function MustEatDetailDesktop({ mustEat, isUnlocked, onClose, uid, state }: Props) {
  const { t } = useTranslation()
  const {
    distance,
    canUnlock,
    vibrateIntensity,
    revealOrigin,
    handleCardClick,
    handleCardZoom,
  } = state

  return (
    <div
      className={`${styles.detail} ${styles.detailNarrow}`}
      role="dialog"
      aria-label={`Must Eat at ${mustEat.restaurant.name}`}
    >
      <button type="button" className={styles.detailClose} aria-label="Close" onClick={onClose}>
        ×
      </button>

      {isUnlocked && !revealOrigin ? (
        <button
          type="button"
          className={styles.mustCardFlip}
          onClick={handleCardZoom}
          aria-label="Karte vergrößern"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mustEat.image} alt={mustEat.dish} />
        </button>
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
            onClick={canUnlock ? handleCardClick : undefined}
            disabled={!canUnlock}
            aria-label={canUnlock ? t('map.revealHere') : t('map.tooFarToReveal')}
            style={revealOrigin ? { visibility: 'hidden' } : undefined}
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
              <strong>So schaltest du es frei:</strong> Geh zum Restaurant - sobald du innerhalb von 50 m bist, deckt sich die Karte automatisch auf.
            </div>

            <BoosterOfferInline uid={uid ?? null} variant="detail" />
          </>
        )}

        <div className={styles.detailActions}>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${mustEat.restaurant.lat},${mustEat.restaurant.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btn}
            aria-label="In Google Maps öffnen"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: 6, verticalAlign: 'middle' }}>
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Google Maps
          </a>
          {isUnlocked && (
            <Link
              href={`/restaurant/${mustEat.restaurant.slug}`}
              className={`${styles.btn} ${styles.btnPrimary}`}
            >
              {t('map.viewRestaurant')}
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
