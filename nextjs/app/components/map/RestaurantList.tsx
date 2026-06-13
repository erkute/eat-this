'use client'
import { memo, useCallback, useEffect, useRef } from 'react'
import { useLocale } from 'next-intl'
import { routing } from '@/i18n/routing'
import type { MapRestaurant, MapMustEat, OpenStatus } from '@/lib/types'
import { haversineDistance, formatWalkingTime, getOpenStatus, abbreviateBezirk, resolvePeek, type UserLocation, type UserTier, type Peek } from '@/lib/map'
import { useTranslation } from '@/lib/i18n'
import { localizedCategoryName } from '@/lib/categories'
import { normalizeName } from '@/lib/normalizeName'
import sanityImageLoader from '@/lib/sanityImageLoader'
import { prefetchRestaurantDetail } from '@/lib/map/useRestaurantDetail'
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
  /** Suppress the per-card "Freischalten" lock badge (used in the calmer
   *  locked-bezirk view where a single block carries the upsell instead). */
  hideBadge?: boolean
  onClick: (r: MapRestaurant) => void
}

// `resolvePeek` returns a fresh object per render, so the memo comparison
// checks it by value — everything else is identity-stable from the parent.
function peekEqual(a: Peek, b: Peek): boolean {
  if (a.kind !== b.kind) return false
  return a.kind !== 'open' || b.kind !== 'open' || a.image === b.image
}

const Item = memo(function Item({ restaurant, userLocation, isSelected, peek, locked, hideBadge, onClick }: ItemProps) {
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

  // Warm the on-demand detail fields once a card scrolls near the viewport —
  // by the time the user taps it, the story text is already cached and the
  // detail opens complete (no skeleton). Locked rows route to the booster
  // flow, so there is nothing to prefetch for them.
  const cardRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (locked) return
    const el = cardRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          prefetchRestaurantDetail(restaurant.slug)
          io.disconnect()
        }
      },
      { rootMargin: '300px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [locked, restaurant.slug])

  return (
    <button
      ref={cardRef}
      type="button"
      className={`${styles.rcard} ${isSelected ? styles.rcardActive : ''} ${locked ? styles.rcardBlur : ''}`}
      onClick={() => onClick(restaurant)}
      aria-label={locked ? t('map.starterEyebrow') : undefined}
    >
      {locked && !hideBadge && (
        <span className={styles.rcardBlurBadge}>
          <svg className={styles.rcardBlurLock} viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <rect x="5" y="11" width="14" height="9" rx="1" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          </svg>
          {t('map.lockedCardBadge')}
        </span>
      )}

      {/* Real <img> instead of a CSS background so the browser can natively
          lazy-load off-screen card photos (backgrounds always fetch eagerly). */}
      <div className={styles.rcardImg}>
        {restaurant.photo && (
          <img
            // Locked cards render the photo behind a blur (.rcardBlur), so a
            // low-res variant is visually identical and saves ~270 spots'
            // worth of full-size image bytes for the anon teaser.
            src={sanityImageLoader({ src: restaurant.photo, width: locked ? 224 : 600 })}
            alt=""
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        )}
      </div>

      {statusMain && (
        <span className={`${styles.openPill} ${status.isOpen ? '' : styles.openPillClosed}`} role="status">
          {statusMain}
        </span>
      )}

      {peek.kind !== 'none' && !locked && (
        <span className={styles.mustPeek}>
          <img
            src={peek.kind === 'open' ? sanityImageLoader({ src: peek.image, width: 160 }) : '/pics/card-back-sm.webp?v=6'}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
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
}, (prev, next) =>
  prev.restaurant === next.restaurant &&
  prev.userLocation === next.userLocation &&
  prev.isSelected === next.isSelected &&
  prev.locked === next.locked &&
  prev.hideBadge === next.hideBadge &&
  prev.onClick === next.onClick &&
  peekEqual(prev.peek, next.peek))

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
  /** Active bezirk filter name, if any. When a district has ONLY locked spots
   *  we swap the triple upsell (divider + per-card badges + end-cap) for a
   *  single calm block that pitches All Berlin. */
  activeBezirk?: string | null
}

export default function RestaurantList({
  restaurants, lockedRestaurants = [], userLocation, selectedId, uid, userTier, onSelect,
  primaryMustEats, unlockedIds, revealedMustEatIds, onResetFilters, activeBezirk,
}: RestaurantListProps) {
  const locale = useLocale()
  const { t } = useTranslation()

  // Locked-row click routes to the same upgrade target the booster banner
  // CTA uses — anon → /login, signed-in → /#hub-packs. Keeps the
  // conversion path consistent regardless of which surface the user clicks.
  const upgradeHref = uid
    ? (locale === routing.defaultLocale ? '/#hub-packs' : `/${locale}#hub-packs`)
    : (locale === routing.defaultLocale ? '/login' : `/${locale}/login`)

  const handleLockedClick = useCallback(() => {
    window.location.assign(upgradeHref)
  }, [upgradeHref])

  const onUpgradeClick = useCallback(() => {
    window.location.assign(upgradeHref)
  }, [upgradeHref])

  if (restaurants.length === 0 && lockedRestaurants.length === 0) return <MapListEmpty onReset={onResetFilters} />

  // Booster CTA sits between unlocked and locked groups — communicates
  // „these are yours / these unlock with signup". Hidden only for the
  // All-Berlin tier (nothing left to upsell). When the unlocked list is
  // empty (filter mismatched the trial set) the banner sits at the very
  // top so the user still sees the upsell.
  const showBooster = userTier !== 'allBerlin'

  // A district the user can't browse yet (filter active, every spot locked).
  // Show one calm All-Berlin block instead of divider + badges + end-cap.
  const bezirkLockedOnly = !!activeBezirk && showBooster && restaurants.length === 0 && lockedRestaurants.length > 0
  const allBerlinHref = locale === routing.defaultLocale ? '/pack/all-berlin' : `/${locale}/pack/all-berlin`

  return (
    <>
      {restaurants.map((r) => (
        <div key={r._id} className={styles.rcardSlot}>
          <Item
            restaurant={r}
            userLocation={userLocation}
            isSelected={selectedId === r._id}
            // Beide Sets werden gebraucht: bei Anon-Nutzern enthält `unlockedIds` die
            // pre-revealed Must-Eat-IDs NICHT, daher prüft `resolvePeek` `revealedMustEatIds`
            // separat. Bei eingeloggten Nutzern ist `revealedMustEatIds` leer — harmloser No-op.
            peek={resolvePeek(primaryMustEats.get(r._id), unlockedIds, revealedMustEatIds)}
            onClick={onSelect}
          />
        </div>
      ))}
      {bezirkLockedOnly ? (
        <section className={styles.bezirkLocked}>
          <h3 className={styles.bezirkLockedTitle}>{activeBezirk} {t('map.bezirkLockedTitleSuffix')}</h3>
          <p className={styles.bezirkLockedBody}>{t('map.bezirkLockedBodyPre')}{activeBezirk}{t('map.bezirkLockedBodyPost')}</p>
          <a href={allBerlinHref} className={styles.bezirkLockedCta}>
            <span>{t('map.bezirkLockedCta')}</span>
            <svg viewBox="0 0 14 10" width="15" height="11" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M1 5h11M8 1l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </a>
        </section>
      ) : (
        showBooster && (lockedRestaurants.length > 0 || restaurants.length === 0) && (
          <BoosterOfferInline uid={uid} variant="list" />
        )
      )}
      {lockedRestaurants.map((r) => (
        <div key={`locked-${r._id}`} className={styles.rcardSlot}>
          <Item
            restaurant={r}
            userLocation={userLocation}
            isSelected={false}
            peek={{ kind: 'covered' }}
            locked
            hideBadge={bezirkLockedOnly}
            onClick={handleLockedClick}
          />
        </div>
      ))}
      {showBooster && !bezirkLockedOnly && (
        <div className={styles.listEnd}>
          <h3 className={styles.listEndTitle}>{t('map.listEndTitle')}</h3>
          <button type="button" className={styles.listEndCta} onClick={() => onUpgradeClick()}>
            <span>{t(uid ? 'map.boosterCta' : 'map.starterCta')}</span>
            <svg viewBox="0 0 14 10" width="15" height="11" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M1 5h11M8 1l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      )}
    </>
  )
}
