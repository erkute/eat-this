'use client'
import { Fragment, useCallback } from 'react'
import { useLocale } from 'next-intl'
import { routing } from '@/i18n/routing'
import type { MapRestaurant, MapMustEat, OpenStatus } from '@/lib/types'
import { haversineDistance, formatWalkingTime, getOpenStatus, abbreviateBezirk, resolvePeek, type UserLocation, type UserTier, type Peek } from '@/lib/map'
import { useTranslation } from '@/lib/i18n'
import { localizedCategoryName } from '@/lib/categories'
import { normalizeName } from '@/lib/normalizeName'
import BoosterOfferInline from './BoosterOfferInline'
import MapListEmpty from './MapListEmpty'
import styles from './map.module.css'

interface ItemProps {
  restaurant: MapRestaurant
  userLocation: UserLocation | null
  isSelected: boolean
  peek: Peek
  /** Visual-only blurred preview row — click routes to the booster/signup
   *  flow instead of opening restaurant detail. */
  locked?: boolean
  onClick: (r: MapRestaurant) => void
}

function Item({ restaurant, userLocation, isSelected, peek, locked, onClick }: ItemProps) {
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

  // Status label: `getOpenStatus` returns "Geöffnet · schließt 22:00" /
  // "Geschlossen · öffnet 9:00". The main word drives the dot-lockup;
  // the suffix becomes the small `bis 22:00` under it.
  const [statusMain, ...statusRest] = status.label ? status.label.split(' · ') : []
  const statusSub = statusRest.join(' · ')

  return (
    <button
      type="button"
      className={`${styles.rcard} ${isSelected ? styles.rcardActive : ''} ${locked ? styles.rcardBlur : ''}`}
      onClick={() => onClick(restaurant)}
      aria-label={locked ? t('map.starterEyebrow') : undefined}
    >
      {locked && (
        <span className={styles.rcardBlurBadge}>
          <svg className={styles.rcardBlurLock} viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <rect x="5" y="11" width="14" height="9" rx="1" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          {t('map.lockedCardBadge')}
        </span>
      )}

      <div
        className={styles.rcardImg}
        style={restaurant.photo ? { backgroundImage: `url(${restaurant.photo})` } : undefined}
      />

      {statusMain && (
        <span className={`${styles.openPill} ${status.isOpen ? '' : styles.openPillClosed}`} role="status">
          {statusMain}
        </span>
      )}

      {peek.kind !== 'none' && !locked && (
        <span className={styles.mustPeek}>
          <img
            src={peek.kind === 'open' ? peek.image : '/pics/card-back.webp?v=5'}
            alt=""
            aria-hidden="true"
            draggable={false}
          />
        </span>
      )}

      <div className={styles.rcardBody}>
        <h3 className={styles.rcardName}>{normalizeName(restaurant.name)}</h3>
        <p className={styles.rcardMeta}>
          {[district, categoryLabel].filter(Boolean).join(' · ')}
        </p>
        <p className={styles.rcardTime}>
          {statusSub && <span className={status.isOpen ? styles.rcardNow : undefined}>{statusSub}</span>}
          {statusSub && walkingTime && <span className={styles.rcardDot} aria-hidden="true" />}
          {walkingTime && <span>{walkingTime}</span>}
        </p>
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
  primaryMustEats: Map<string, MapMustEat>
  unlockedIds: Set<string>
  revealedMustEatIds: Set<string>
  onResetFilters?: () => void
}

export default function RestaurantList({
  restaurants, lockedRestaurants = [], userLocation, selectedId, uid, userTier, onSelect,
  primaryMustEats, unlockedIds, revealedMustEatIds, onResetFilters,
}: RestaurantListProps) {
  const locale = useLocale()

  // Locked-row click routes to the same upgrade target the booster banner
  // CTA uses — anon → /login, signed-in → /home#hub-packs. Keeps the
  // conversion path consistent regardless of which surface the user clicks.
  const upgradeHref = uid
    ? (locale === routing.defaultLocale ? '/home#hub-packs' : `/${locale}/home#hub-packs`)
    : (locale === routing.defaultLocale ? '/login' : `/${locale}/login`)

  const handleLockedClick = useCallback((_r: MapRestaurant) => {
    window.location.assign(upgradeHref)
  }, [upgradeHref])

  if (restaurants.length === 0 && lockedRestaurants.length === 0) return <MapListEmpty onReset={onResetFilters} />

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
          // Beide Sets werden gebraucht: bei Anon-Nutzern enthält `unlockedIds` die
          // pre-revealed Must-Eat-IDs NICHT, daher prüft `resolvePeek` `revealedMustEatIds`
          // separat. Bei eingeloggten Nutzern ist `revealedMustEatIds` leer — harmloser No-op.
          peek={resolvePeek(primaryMustEats.get(r._id), unlockedIds, revealedMustEatIds)}
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
          peek={{ kind: 'covered' }}
          locked
          onClick={handleLockedClick}
        />
      ))}
    </>
  )
}
