'use client'
import { Fragment } from 'react'
import type { MapRestaurant, OpenStatus } from '@/lib/types'
import { haversineDistance, formatWalkingTime, getOpenStatus, abbreviateBezirk, type UserLocation, type UserTier } from '@/lib/map'
import { useTranslation } from '@/lib/i18n'
import { localizedCategoryName } from '@/lib/categories'
import { formatPriceLabel } from './restaurantDetail.helpers'
import { normalizeName } from '@/lib/normalizeName'
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

  // Prenzlauer Berg shortens to P'berg so the mustard sticker stays one line.
  const district = abbreviateBezirk(restaurant.bezirk?.name ?? restaurant.district ?? null)

  // One category in the eyebrow — the detail page is where the full set lives.
  const categoryLabel = restaurant.categories?.[0]
    ? localizedCategoryName(restaurant.categories[0], loc)
    : null

  const priceLabel = formatPriceLabel(restaurant)

  // Status label: `getOpenStatus` returns "Geöffnet · schließt 22:00" /
  // "Geschlossen · öffnet 9:00". The main word drives the dot-lockup;
  // the suffix becomes the small `bis 22:00` under it.
  const [statusMain, ...statusRest] = status.label ? status.label.split(' · ') : []
  const statusSub = statusRest.join(' · ')

  return (
    <button
      type="button"
      className={`${styles.rrow} ${isSelected ? styles.rrowActive : ''}`}
      onClick={() => onClick(restaurant)}
    >
      <div
        className={styles.rrowCoral}
        style={restaurant.photo ? { backgroundImage: `url(${restaurant.photo})` } : undefined}
      >
        {restaurant.mustEatCount > 0 && (
          <img
            src="/pics/card-back.webp"
            alt=""
            className={styles.rrowMust}
            aria-hidden="true"
            draggable={false}
          />
        )}
      </div>

      <div className={styles.rrowMeta}>
        <p className={styles.rrowEye}>
          {district && <span className={styles.rrowBezirk}>{district}</span>}
          {categoryLabel && <span className={styles.rrowCat}>{categoryLabel}</span>}
        </p>
        <h3 className={styles.rrowTitle}>{normalizeName(restaurant.name)}</h3>
        <p className={styles.rrowInfo}>
          {priceLabel && <span>{priceLabel}</span>}
          {priceLabel && walkingTime && <span className={styles.rrowInfoSep} aria-hidden="true" />}
          {walkingTime && (
            <span>
              <svg className={styles.walkIco} viewBox="0 0 24 24" aria-hidden="true">
                <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7" />
              </svg>
              {walkingTime}
            </span>
          )}
        </p>
      </div>

      <div className={styles.rrowAside}>
        {statusMain && (
          <span
            className={`${styles.rrowStatus} ${status.isOpen ? '' : styles.rrowStatusClosed}`}
            role="status"
          >
            {statusMain}
          </span>
        )}
        {statusSub && <span className={styles.rrowWhen}>{statusSub}</span>}
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

// Booster CTA gets injected after the 10th restaurant for everyone who
// hasn't bought the All-Berlin pack yet — anon visitors AND signed-in
// starters both still have something to buy, so the promo is relevant
// for both. Hidden only for All-Berlin owners (nothing left to upsell).
const BOOSTER_AT = 10

export default function RestaurantList({
  restaurants, userLocation, selectedId, uid, userTier, onSelect,
}: RestaurantListProps) {
  if (restaurants.length === 0) return <MapListEmpty />

  const showBooster = userTier !== 'allBerlin'
  const insertAt = Math.min(BOOSTER_AT, restaurants.length)

  // Booster appears either AFTER row 10 (long list) or appended at the
  // end (short list — e.g. after a filter narrows things down). Either
  // way the upgrade pitch is in the scroll for anon/starter users.
  const boosterAtEnd = showBooster && restaurants.length < BOOSTER_AT

  return (
    <>
      {restaurants.map((r, i) => (
        <Fragment key={r._id}>
          {showBooster && !boosterAtEnd && i === insertAt && (
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
      {boosterAtEnd && <BoosterOfferInline uid={uid} variant="list" />}
    </>
  )
}
