'use client'
import type { MapRestaurant, OpenStatus } from '@/lib/types'
import { haversineDistance, formatWalkingTime, getOpenStatus, type UserLocation } from '@/lib/map'
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
  const walkingTime = meters !== null ? formatWalkingTime(meters) : null
  const district = restaurant.bezirk?.name ?? restaurant.district ?? null

  /* Split the contextual status label — `getOpenStatus` returns
     "Geöffnet · schließt 22:00" / "Geschlossen · öffnet 9:00" — into a colored
     primary word and a muted suffix. Apple/Google Maps treatment: no capsule. */
  const [statusMain, ...statusRest] = status.label ? status.label.split(' · ') : []
  const statusSub = statusRest.join(' · ')

  return (
    <button
      className={`${styles.row} ${isSelected ? styles.rowActive : ''}`}
      onClick={() => onClick(restaurant)}
    >
      <div className={styles.rowPhotoWrap}>
        {restaurant.photo ? (
          <img src={restaurant.photo} alt="" className={styles.rowPhoto} loading="lazy" />
        ) : (
          <div className={styles.rowPhotoPlaceholder} aria-hidden="true">🍽</div>
        )}
        {restaurant.mustEatCount > 0 && (
          <img
            src="/pics/card-back.webp"
            alt=""
            className={styles.rowMustOverlay}
            aria-label="Must Eat"
            draggable={false}
          />
        )}
      </div>

      <div className={styles.rowMain}>
        <div className={styles.rowName}>{restaurant.name}</div>
        {district && (
          <div className={styles.rowDistrict}>{district}</div>
        )}
        <div className={styles.rowMeta}>
          <span className={styles.rowMetaText}>
            {[
              restaurant.price,
              restaurant.categories?.slice(0, 3).join(' · '),
              walkingTime,
            ]
              .filter(Boolean)
              .join(' · ')}
          </span>
        </div>
      </div>

      <div className={styles.rowSide}>
        {statusMain && (
          <span
            className={`${styles.rowStatus} ${status.isOpen ? styles.rowStatusOpen : styles.rowStatusClosed}`}
            role="status"
          >
            {statusMain}
          </span>
        )}
        {statusSub && (
          <span className={styles.rowStatusSub}>{statusSub}</span>
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
