'use client'
import type { MapRestaurant, OpenStatus } from '@/lib/types'
import { haversineDistance, formatDistance, formatWalkingTime } from '@/lib/map/distance'
import { getOpenStatus } from '@/lib/map/openingHours'
import type { UserLocation } from '@/lib/map/useUserLocation'
import { useTranslation } from '@/lib/i18n'
import styles from './map.module.css'

interface ItemProps {
  restaurant: MapRestaurant
  userLocation: UserLocation | null
  isSelected: boolean
  onClick: (r: MapRestaurant) => void
}

function Item({ restaurant, userLocation, isSelected, onClick }: ItemProps) {
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

  const meters = userLocation
    ? haversineDistance(userLocation.lat, userLocation.lng, restaurant.lat, restaurant.lng)
    : null
  const distance = meters !== null ? formatDistance(meters) : null
  const walkingTime = meters !== null ? formatWalkingTime(meters) : null

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
          <span>{[restaurant.district, restaurant.price].filter(Boolean).join(' · ')}</span>
          {distance && (
            <>
              <span className={styles.rowMetaDot} aria-hidden="true">·</span>
              <span>{distance}</span>
              <span className={styles.rowMetaDot} aria-hidden="true">·</span>
              <span>{walkingTime}</span>
            </>
          )}
          {restaurant.mustEatCount > 0 && (
            <>
              <span className={styles.rowMetaDot} aria-hidden="true">·</span>
              <img
                src="/pics/card-back.webp"
                alt="Must Eat"
                className={styles.rowMustBadge}
                draggable={false}
              />
            </>
          )}
        </div>
        {restaurant.categories && restaurant.categories.length > 0 && (
          <div className={styles.rowTags}>
            <span className={styles.rowTagsText}>
              {restaurant.categories.slice(0, 3).join(', ')}
            </span>
          </div>
        )}
      </div>

      <div className={styles.rowSide}>
        {status.label && (
          <span
            className={`${styles.rowStatusPill} ${status.isOpen ? styles.rowStatusPillOpen : styles.rowStatusPillClosed}`}
            role="status"
          >
            {status.isOpen ? t('map.openNow') : t('map.closed')}
          </span>
        )}
      </div>
    </button>
  )
}

interface RestaurantListProps {
  restaurants: MapRestaurant[]
  userLocation: UserLocation | null
  selectedId: string | null
  onSelect: (r: MapRestaurant) => void
}

export default function RestaurantList({ restaurants, userLocation, selectedId, onSelect }: RestaurantListProps) {
  const { t } = useTranslation()

  if (restaurants.length === 0) {
    return <div className={styles.empty}>{t('map.nothingInArea')}</div>
  }

  if (!userLocation) {
    return (
      <>
        {restaurants.map(r => (
          <Item key={r._id} restaurant={r} userLocation={null} isSelected={selectedId === r._id} onClick={onSelect} />
        ))}
      </>
    )
  }

  return (
    <>
      {restaurants.map(r => (
        <Item key={r._id} restaurant={r} userLocation={userLocation} isSelected={selectedId === r._id} onClick={onSelect} />
      ))}
    </>
  )
}
