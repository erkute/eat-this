'use client'
import { memo, useEffect, useRef } from 'react'
import { useLocale } from 'next-intl'
import { routing } from '@/i18n/routing'
import type { MapRestaurant, MapMustEat, OpenStatus } from '@/lib/types'
import { abbreviateBezirk, getOpenStatus, resolvePeek, type UserLocation, type UserTier, type Peek } from '@/lib/map'
import { useTranslation } from '@/lib/i18n'
import { localizedCategoryName } from '@/lib/categories'
import { normalizeName } from '@/lib/normalizeName'
import sanityImageLoader from '@/lib/sanityImageLoader'
import { prefetchRestaurantDetail } from '@/lib/map/useRestaurantDetail'
import { useLoginModal } from '@/lib/auth'
import MapListEmpty from './MapListEmpty'
import styles from './RestaurantList.module.css'

interface ItemProps {
  restaurant: MapRestaurant
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

const Item = memo(function Item({ restaurant, isSelected, peek, locked, hideBadge, onClick }: ItemProps) {
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
    : { isOpen: false, label: t('map.closed'), minutesUntilChange: null }

  // Prenzlauer Berg shortens to P'berg so the mustard sticker stays one line.
  const district = abbreviateBezirk(restaurant.bezirk?.name ?? restaurant.district ?? null)

  // One category in the eyebrow — the detail page is where the full set lives.
  const categoryLabel = restaurant.categories?.[0]
    ? localizedCategoryName(restaurant.categories[0], loc)
    : null
  const [statusMain] = status.label ? status.label.split(' · ') : []

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
            src={peek.kind === 'open' ? sanityImageLoader({ src: peek.image, width: 180 }) : '/pics/card-back-sm.webp?v=6'}
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
          {district && (
            <span className={`${styles.rcardMetaChip} ${styles.rcardMetaDistrict}`}>
              <span>{district}</span>
            </span>
          )}
          {categoryLabel && (
            <span className={`${styles.rcardMetaChip} ${styles.rcardMetaCategory}`}>
              <span>{categoryLabel}</span>
            </span>
          )}
        </p>
      </div>
    </button>
  )
}, (prev, next) =>
  prev.restaurant === next.restaurant &&
  prev.isSelected === next.isSelected &&
  prev.locked === next.locked &&
  prev.hideBadge === next.hideBadge &&
  prev.onClick === next.onClick &&
  peekEqual(prev.peek, next.peek))

interface RestaurantListProps {
  restaurants: MapRestaurant[]
  /** Locked restaurants exist only as a count/upsell signal now. The list no
   *  longer renders blurred locked rows. */
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
  /** Active bezirk filter name, if any. Used for the All-Berlin banner copy
   *  when a district has only locked spots. */
  activeBezirk?: string | null
}

export default function RestaurantList({
  restaurants, lockedRestaurants = [], selectedId, uid, userTier, onSelect,
  primaryMustEats, unlockedIds, revealedMustEatIds, onResetFilters, activeBezirk,
}: RestaurantListProps) {
  const locale = useLocale()
  const { t } = useTranslation()
  const { open: openLoginModal } = useLoginModal()
  const openSigninLogin = () => openLoginModal('signin')

  if (restaurants.length === 0 && lockedRestaurants.length === 0) return <MapListEmpty onReset={onResetFilters} />

  // One calm upsell only: no blurred locked rows and no separate signup
  // banner. Guests get sign-in as a secondary text link inside this block.
  const showAllBerlinBanner = userTier !== 'allBerlin' && (lockedRestaurants.length > 0 || restaurants.length > 0)
  const allBerlinHref = locale === routing.defaultLocale ? '/pack/all-berlin' : `/${locale}/pack/all-berlin`

  return (
    <>
      {restaurants.map((r) => (
        <div key={r._id} className={styles.rcardSlot}>
          <Item
            restaurant={r}
            isSelected={selectedId === r._id}
            // Beide Sets werden gebraucht: bei Anon-Nutzern enthält `unlockedIds` die
            // pre-revealed Must-Eat-IDs NICHT, daher prüft `resolvePeek` `revealedMustEatIds`
            // separat. Bei eingeloggten Nutzern ist `revealedMustEatIds` leer — harmloser No-op.
            peek={resolvePeek(primaryMustEats.get(r._id), unlockedIds, revealedMustEatIds)}
            onClick={onSelect}
          />
        </div>
      ))}
      {showAllBerlinBanner && (
        <div className={styles.listEnd}>
          <p className={styles.listEndKicker}>{t('map.listEndKicker')}</p>
          <h3 className={styles.listEndTitle}>{t('map.listEndTitle')}</h3>
          <div className={styles.listEndFan} aria-hidden="true">
            <span className={`${styles.listEndPack} ${styles.listEndPackOne}`} />
            <span className={`${styles.listEndPack} ${styles.listEndPackTwo}`} />
            <span className={`${styles.listEndPack} ${styles.listEndPackThree}`} />
            <span className={`${styles.listEndPack} ${styles.listEndPackFour}`} />
            <span className={`${styles.listEndPack} ${styles.listEndPackFive}`} />
            <span className={`${styles.listEndPack} ${styles.listEndPackSix}`} />
          </div>
          <p className={styles.listEndSub}>
            {activeBezirk && restaurants.length === 0
              ? `${t('map.bezirkLockedBodyPre')}${activeBezirk}${t('map.bezirkLockedBodyPost')}`
              : t('map.listEndSub')}
          </p>
          <a href={allBerlinHref} className={styles.listEndCta}>
            <span>{t('map.listEndCta')}</span>
            <svg viewBox="0 0 14 10" width="15" height="11" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M1 5h11M8 1l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </a>
          {!uid && (
            <button type="button" className={styles.listEndSecondary} onClick={openSigninLogin}>
              {t('map.starterPromoLogin')}
            </button>
          )}
        </div>
      )}
    </>
  )
}
