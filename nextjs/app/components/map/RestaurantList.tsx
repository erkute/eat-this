'use client'
import type { MapRestaurant, OpenStatus } from '@/lib/types'
import { haversineDistance, formatDistance } from '@/lib/map/distance'
import { getOpenStatus } from '@/lib/map/openingHours'
import type { UserLocation } from '@/lib/map/useUserLocation'
import { useTranslation } from '@/lib/i18n'
import styles from './map.module.css'

interface ItemProps {
  restaurant: MapRestaurant
  userLocation: UserLocation | null
  isSelected: boolean
  isFavorited: boolean
  onClick: (r: MapRestaurant) => void
  onToggleFavorite: (r: MapRestaurant) => void
}

function Item({ restaurant, userLocation, isSelected, isFavorited, onClick, onToggleFavorite }: ItemProps) {
  const { t } = useTranslation()
  const statusLabels = {
    open: t('map.open'),
    closed: t('map.closed'),
    opens: t('map.opens'),
    closes: t('map.closes'),
    unitH: t('map.unitsH'),
    unitMin: t('map.unitsMin'),
  }
  const status: OpenStatus = restaurant.openingHours
    ? getOpenStatus(restaurant.openingHours, new Date(), statusLabels)
    : { isOpen: false, label: '', minutesUntilChange: null }

  const distance = userLocation
    ? formatDistance(haversineDistance(userLocation.lat, userLocation.lng, restaurant.lat, restaurant.lng))
    : null

  return (
    <button
      className={`${styles.row} ${isSelected ? styles.rowActive : ''}`}
      onClick={() => onClick(restaurant)}
    >
      {restaurant.photo ? (
        <img src={restaurant.photo} alt="" className={styles.rowPhoto} loading="lazy" />
      ) : (
        <div className={styles.rowPhotoPlaceholder} aria-hidden="true">🍽</div>
      )}

      <div className={styles.rowMain}>
        <div className={styles.rowName}>{restaurant.name}</div>
        <div className={styles.rowMeta}>
          {[restaurant.district, restaurant.price].filter(Boolean).join(' · ')}
        </div>
        {(restaurant.categories?.length || restaurant.mustEatCount > 0) && (
          <div className={styles.rowTags}>
            {restaurant.categories?.slice(0, 3).map(c => (
              <span key={c} className={styles.rowTag}>{c}</span>
            ))}
            {restaurant.mustEatCount > 0 && (
              <img
                src="/pics/card-back.webp"
                alt="Must-Eat"
                className={styles.rowMustBadge}
                draggable={false}
              />
            )}
          </div>
        )}
      </div>

      <div className={styles.rowSide}>
        {distance && <span className={styles.rowDistance}>{distance}</span>}
        {status.label && (
          <span className={`${styles.statusPill} ${status.isOpen ? styles.statusPillOpen : styles.statusPillClosed}`}>
            <span className={styles.statusDot} aria-hidden="true" />
            {status.isOpen ? t('map.open') : t('map.closed')}
          </span>
        )}
        <button
          type="button"
          className={`${styles.heartBtn} ${isFavorited ? styles.heartBtnActive : ''}`}
          aria-label={isFavorited ? 'Remove from saved' : 'Save restaurant'}
          aria-pressed={isFavorited}
          onClick={e => { e.stopPropagation(); onToggleFavorite(restaurant) }}
        >
          <svg viewBox="0 0 24 24" fill={isFavorited ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>
    </button>
  )
}

interface RestaurantListProps {
  restaurants: MapRestaurant[]
  userLocation: UserLocation | null
  selectedId: string | null
  favoriteIds: Set<string>
  onSelect: (r: MapRestaurant) => void
  onToggleFavorite: (r: MapRestaurant) => void
}

export default function RestaurantList({ restaurants, userLocation, selectedId, favoriteIds, onSelect, onToggleFavorite }: RestaurantListProps) {
  const { t } = useTranslation()
  if (restaurants.length === 0) {
    return (
      <div className={styles.empty}>{t('map.nothingInArea')}</div>
    )
  }
  return (
    <>
      {restaurants.map(r => (
        <Item
          key={r._id}
          restaurant={r}
          userLocation={userLocation}
          isSelected={selectedId === r._id}
          isFavorited={favoriteIds.has(r._id)}
          onClick={onSelect}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </>
  )
}
