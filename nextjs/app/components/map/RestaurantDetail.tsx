'use client'
import { useState } from 'react'
import type { MapRestaurant, MapMustEat } from '@/lib/types'
import { getOpenStatus } from '@/lib/map/openingHours'
import type { UserLocation } from '@/lib/map/useUserLocation'
import { useTranslation } from '@/lib/i18n'
import styles from './map.module.css'

function MustEatMiniCard({
  mustEat,
  unlocked,
  onClick,
}: { mustEat: MapMustEat; unlocked: boolean; onClick: () => void }) {
  const [wiggling, setWiggling] = useState(false)
  const className = [
    styles.mustCard,
    unlocked && styles.mustCardFront,
    !unlocked && wiggling && styles.cardWiggling,
  ].filter(Boolean).join(' ')
  return (
    <button
      type="button"
      className={className}
      onClick={() => { if (!unlocked) setWiggling(true); onClick() }}
      onAnimationEnd={() => setWiggling(false)}
      aria-label={unlocked ? mustEat.dish : 'Locked Must-Eat'}
    >
      {unlocked && (
        <>
          <img src={mustEat.image} alt="" loading="lazy" />
          <span className={styles.mustCardLabel}>{mustEat.dish}</span>
        </>
      )}
    </button>
  )
}

interface RestaurantDetailProps {
  restaurant: MapRestaurant
  mustEats: MapMustEat[]
  unlockedIds: Set<string>
  userLocation: UserLocation | null
  onClose: () => void
  onMustEatClick: (m: MapMustEat) => void
  inSheet?: boolean
}

export default function RestaurantDetail({
  restaurant,
  mustEats,
  unlockedIds,
  onClose,
  onMustEatClick,
  inSheet,
}: RestaurantDetailProps) {
  const { t } = useTranslation()
  const status = restaurant.openingHours
    ? getOpenStatus(restaurant.openingHours, new Date(), {
        open: t('map.open'),
        closed: t('map.closed'),
        opens: t('map.opens'),
        closes: t('map.closes'),
        unitH: t('map.unitsH'),
        unitMin: t('map.unitsMin'),
      })
    : { isOpen: false, label: '', minutesUntilChange: null }

  const district = restaurant.bezirk?.name ?? restaurant.district

  return (
    <div className={inSheet ? styles.detailInSheet : styles.detail} role={inSheet ? undefined : 'dialog'} aria-label={inSheet ? undefined : restaurant.name}>
      {!inSheet && (
        <button
          type="button"
          className={styles.detailClose}
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>
      )}

      <div className={styles.detailLeft}>
        {restaurant.photo ? (
          <img src={restaurant.photo} alt={restaurant.name} className={styles.detailHero} />
        ) : (
          <div className={styles.detailHeroPlaceholder} aria-hidden="true">🍽</div>
        )}
        <div className={styles.detailLeftInfo}>
          <h3 className={styles.detailName}>{restaurant.name}</h3>
          {(district || restaurant.price || restaurant.categories?.length) && (
            <div className={styles.detailDistrict}>
              {[
                district,
                restaurant.price,
                restaurant.categories?.slice(0, 3).join(', '),
              ].filter(Boolean).join(' · ')}
            </div>
          )}
          {status.label && (
            <span
              className={`${styles.hoursStatus} ${
                status.isOpen ? styles.hoursStatusOpen : styles.hoursStatusClosed
              }`}
            >
              {status.label}
            </span>
          )}
          {restaurant.shortDescription && (
            <p className={`${styles.detailDescription} ${styles.detailMobileOnly}`}>
              {restaurant.shortDescription}
            </p>
          )}
        </div>
      </div>

      <div className={styles.detailRight}>
        {restaurant.shortDescription && (
          <div className={`${styles.detailRightHead} ${styles.detailDesktopOnly}`}>
            <p className={styles.detailDescription}>{restaurant.shortDescription}</p>
          </div>
        )}
        <div className={styles.detailScroll}>
          {restaurant.openingHours && restaurant.openingHours.length > 0 && (
            <section>
              <div className={styles.sectionLabel}>{t('map.openingHours')}</div>
              <ul className={styles.hoursList}>
                {restaurant.openingHours.map((slot, i) => (
                  <li key={i} className={styles.hoursRow}>
                    <span className={styles.hoursDay}>{slot.days}</span>
                    <span className={styles.hoursTime}>{slot.hours}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {restaurant.tip && (
            <section>
              <div className={styles.sectionLabel}>{t('map.insiderTip')}</div>
              <p className={styles.tipBlock}>{restaurant.tip}</p>
            </section>
          )}

          {mustEats.length > 0 && (
            <section>
              <div className={styles.sectionLabel}>{t('map.mustEatsCount')} ({mustEats.length})</div>
              <div className={styles.mustGrid}>
                {mustEats.map(m => (
                  <MustEatMiniCard
                    key={m._id}
                    mustEat={m}
                    unlocked={unlockedIds.has(m._id)}
                    onClick={() => onMustEatClick(m)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>

        <div className={styles.detailActions}>
          {restaurant.mapsUrl && (
            <a
              href={restaurant.mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.btn} ${styles.btnGoogle}`}
            >
              <svg
                className={styles.googleLogo}
                viewBox="0 0 48 48"
                aria-hidden="true"
                focusable="false"
              >
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>{t('map.googleMaps')}</span>
            </a>
          )}
          {restaurant.website && (
            <a
              href={restaurant.website}
              target="_blank"
              rel="noopener noreferrer"
              className={`${styles.btn} ${styles.btnWebsite}`}
            >
              <svg
                className={styles.btnIcon}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M3 12h18" />
                <path d="M12 3a14 14 0 0 1 0 18" />
                <path d="M12 3a14 14 0 0 0 0 18" />
              </svg>
              <span>{t('map.website')}</span>
            </a>
          )}
          {restaurant.reservationUrl && (
            <a
              href={restaurant.reservationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btn}
            >
              {t('map.reserve')}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
