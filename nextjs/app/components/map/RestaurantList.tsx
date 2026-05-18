'use client'
import { Fragment } from 'react'
import type { MapRestaurant, OpenStatus } from '@/lib/types'
import { haversineDistance, formatWalkingTime, getOpenStatus, type UserLocation, type UserTier } from '@/lib/map'
import { useTranslation } from '@/lib/i18n'
import { localizedCategoryName } from '@/lib/categories'
import { formatPriceLabel } from './restaurantDetail.helpers'
import BoosterOfferInline from './BoosterOfferInline'
import MapListEmpty from './MapListEmpty'
import styles from './map.module.css'

interface ItemProps {
  restaurant: MapRestaurant
  userLocation: UserLocation | null
  isSelected: boolean
  onClick: (r: MapRestaurant) => void
}

function Item({ restaurant, userLocation, isSelected, onClick }: ItemProps) {
  const { t, lang } = useTranslation()
  const loc = lang === 'de' ? 'de' : 'en'
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
            aria-hidden="true"
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
              formatPriceLabel(restaurant),
              restaurant.categories?.slice(0, 3).map(c => localizedCategoryName(c, loc)).join(' · '),
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
  uid: string | null
  userTier: UserTier
  onSelect: (r: MapRestaurant) => void
}

// Booster CTA gets injected after the 10th restaurant for starter-tier
// users. Anon visitors and All-Berlin users get a clean list.
const BOOSTER_AT = 10

export default function RestaurantList({
  restaurants, userLocation, selectedId, uid, userTier, onSelect,
}: RestaurantListProps) {
  if (restaurants.length === 0) return <MapListEmpty />

  const showBooster = userTier === 'starter'
  const insertAt = Math.min(BOOSTER_AT, restaurants.length)

  return (
    <>
      {restaurants.map((r, i) => (
        <Fragment key={r._id}>
          {showBooster && i === insertAt && (
            <BoosterOfferInline uid={uid} variant="list" />
          )}
          <Item
            restaurant={r}
            userLocation={userLocation}
            isSelected={selectedId === r._id}
            onClick={onSelect}
          />
        </Fragment>
      ))}
    </>
  )
}
