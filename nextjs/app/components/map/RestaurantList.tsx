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
          <span className={`${styles.rowStatus} ${status.isOpen ? styles.rowStatusOpen : styles.rowStatusClosed}`}>
            {status.isOpen ? (
              <span className={styles.rowStatusMain}>{t('map.open')}</span>
            ) : (
              <>
                <span className={styles.rowStatusMain}>{t('map.closed')}</span>
                {(() => {
                  const sub = status.label.replace(new RegExp(`^${t('map.closed')}\\s*·\\s*`), '')
                  return sub && sub !== t('map.closed')
                    ? <span className={styles.rowStatusSub}>{sub}</span>
                    : null
                })()}
              </>
            )}
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
          onClick={onSelect}
        />
      ))}
    </>
  )
}
