'use client'
import { Fragment, useCallback } from 'react'
import { useLocale } from 'next-intl'
import { routing } from '@/i18n/routing'
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
  /** Visual-only blurred preview row — click routes to the booster/signup
   *  flow instead of opening restaurant detail. */
  locked?: boolean
  onClick: (r: MapRestaurant) => void
}

function Item({ restaurant, userLocation, isSelected, locked, onClick }: ItemProps) {
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
      className={`${styles.rrow} ${isSelected ? styles.rrowActive : ''} ${locked ? styles.rrowLocked : ''}`}
      onClick={() => onClick(restaurant)}
      aria-label={locked ? t('map.starterEyebrow') : undefined}
    >
      <div
        className={styles.rrowCoral}
        style={restaurant.photo ? { backgroundImage: `url(${restaurant.photo})` } : undefined}
      >
        {restaurant.mustEatCount > 0 && !locked && (
          <img
            src="/pics/card-back.webp?v=4"
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
  /** Locked-preview rows rendered after the booster banner. Empty for
   *  All-Berlin owners (nothing to upsell). */
  lockedRestaurants?: MapRestaurant[]
  userLocation: UserLocation | null
  selectedId: string | null
  uid: string | null
  userTier: UserTier
  onSelect: (r: MapRestaurant) => void
}

export default function RestaurantList({
  restaurants, lockedRestaurants = [], userLocation, selectedId, uid, userTier, onSelect,
}: RestaurantListProps) {
  const locale = useLocale()

  // Locked-row click routes to the same upgrade target the booster banner
  // CTA uses — anon → /login, signed-in → /profile#booster. Keeps the
  // conversion path consistent regardless of which surface the user clicks.
  const upgradeHref = uid
    ? (locale === routing.defaultLocale ? '/profile#booster' : `/${locale}/profile#booster`)
    : (locale === routing.defaultLocale ? '/login' : `/${locale}/login`)

  const handleLockedClick = useCallback((_r: MapRestaurant) => {
    window.location.assign(upgradeHref)
  }, [upgradeHref])

  if (restaurants.length === 0 && lockedRestaurants.length === 0) return <MapListEmpty />

  // Booster CTA sits between unlocked and locked groups — communicates
  // „these are yours / these unlock with signup". Hidden only for the
  // All-Berlin tier (nothing left to upsell). When the unlocked list is
  // empty (filter mismatched the trial set) the banner sits at the very
  // top so the user still sees the upsell.
  const showBooster = userTier !== 'allBerlin'

  return (
    <>
      {restaurants.map((r) => (
        <Item
          key={r._id}
          restaurant={r}
          userLocation={userLocation}
          isSelected={selectedId === r._id}
          onClick={onSelect}
        />
      ))}
      {showBooster && (lockedRestaurants.length > 0 || restaurants.length === 0) && (
        <BoosterOfferInline uid={uid} variant="list" />
      )}
      {lockedRestaurants.map((r) => (
        <Item
          key={`locked-${r._id}`}
          restaurant={r}
          userLocation={userLocation}
          isSelected={false}
          locked
          onClick={handleLockedClick}
        />
      ))}
    </>
  )
}
