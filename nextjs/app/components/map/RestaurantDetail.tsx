'use client'
import { useState } from 'react'
import type { MapRestaurant, MapMustEat } from '@/lib/types'
import {
  getOpenStatus,
  haversineDistance,
  formatWalkingTime,
  formatTransitTime,
  formatDrivingTime,
  type UserLocation,
} from '@/lib/map'
import { useTranslation } from '@/lib/i18n'
import styles from './map.module.css'

function MustEatMiniCard({
  mustEat,
  unlocked,
  onClick,
}: { mustEat: MapMustEat; unlocked: boolean; onClick: () => void }) {
  const [wiggling, setWiggling] = useState(false)
  const className = [
    styles.mustCard,
    unlocked && styles.mustCardFront,
    !unlocked && wiggling && styles.cardWiggling,
  ].filter(Boolean).join(' ')
  return (
    <button
      type="button"
      className={className}
      onClick={() => { if (!unlocked) setWiggling(true); onClick() }}
      onAnimationEnd={() => setWiggling(false)}
      aria-label={unlocked ? mustEat.dish : 'Locked Must-Eat'}
    >
      {unlocked && (
        <img src={mustEat.image} alt={mustEat.dish} loading="lazy" />
      )}
    </button>
  )
}

interface RestaurantDetailProps {
  restaurant: MapRestaurant
  mustEats: MapMustEat[]
  unlockedIds: Set<string>
  userLocation: UserLocation | null
  onClose: () => void
  onMustEatClick: (m: MapMustEat) => void
  isFavorite?: boolean
  onToggleFavorite?: () => void
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function MapPinIcon() {
  /* Google Maps app-icon style — pin shape with the brand colors arranged as
     parallel diagonal slices (blue at top, then red, yellow, green dominant
     on the lower-right + tail). Each slice is a parallelogram clipped to the
     pin silhouette so the colors meet cleanly along the diagonals. */
  return (
    <svg viewBox="0 0 24 32" aria-hidden="true">
      <defs>
        <clipPath id="restaurantDetailMapPinClip">
          <path d="M12 1 C5.5 1 1 5.5 1 11 C1 18 12 31 12 31 C12 31 23 18 23 11 C23 5.5 18.5 1 12 1z" />
        </clipPath>
      </defs>
      <g clipPath="url(#restaurantDetailMapPinClip)">
        <polygon points="-2,-2 26,-2 26,5 -2,12" fill="#1A73E8" />
        <polygon points="-2,12 26,5 26,8 -2,16"  fill="#EA4335" />
        <polygon points="-2,16 26,8 26,11 -2,20" fill="#FBBC04" />
        <polygon points="-2,20 26,11 26,34 -2,34" fill="#34A853" />
      </g>
      <circle cx="12" cy="10" r="3.2" fill="#ffffff" />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  )
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function WalkIcon() {
  // Material `directions_walk` silhouette — recognizable mid-stride pose.
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9 7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7" />
    </svg>
  )
}

function TransitIcon() {
  // Material `directions_transit` — front view of an S/U-Bahn carriage.
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-3.58-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm3.5-7H6V6h5v4zm5.5 7c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-7h-5V6h5v4z" />
    </svg>
  )
}

function CarIcon() {
  // Material `directions_car` — three-quarter sedan silhouette.
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

export default function RestaurantDetail({
  restaurant,
  mustEats,
  unlockedIds,
  userLocation,
  onClose,
  onMustEatClick,
  isFavorite,
  onToggleFavorite,
}: RestaurantDetailProps) {
  const { t } = useTranslation()
  const status = restaurant.openingHours
    ? getOpenStatus(restaurant.openingHours, new Date(), {
        open: t('map.open'),
        closed: t('map.closed'),
        opens: t('map.opens'),
        closes: t('map.closes'),
        unitH: t('map.unitsH'),
        unitMin: t('map.unitsMin'),
      })
    : { isOpen: false, label: '', minutesUntilChange: null }

  const district = restaurant.bezirk?.name ?? restaurant.district

  const meters = userLocation
    ? haversineDistance(userLocation.lat, userLocation.lng, restaurant.lat, restaurant.lng)
    : null
  const walkingTime = meters !== null ? formatWalkingTime(meters) : null
  const transitTime = meters !== null ? formatTransitTime(meters) : null
  const drivingTime = meters !== null ? formatDrivingTime(meters) : null
  /* Tap-through to Google Maps with the right travel mode pre-selected so
     the user lands on a real route (the on-page minutes are estimates only). */
  const dirHref = (mode: 'walking' | 'transit' | 'driving') =>
    `https://www.google.com/maps/dir/?api=1&destination=${restaurant.lat},${restaurant.lng}&travelmode=${mode}`

  /* Status label split into colored primary word + muted suffix — same
     vocabulary as the list row. */
  const [statusMain, ...statusRest] = status.label ? status.label.split(' · ') : []
  const statusSub = statusRest.join(' · ')

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    const shareData = {
      title: restaurant.name,
      text: restaurant.shortDescription || restaurant.name,
      url,
    }
    try {
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        await navigator.share(shareData)
        return
      }
    } catch {
      // user cancelled or share failed — fall through to clipboard
    }
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url)
      }
    } catch {
      // noop
    }
  }

  const addressMapsHref =
    restaurant.mapsUrl ||
    (restaurant.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address)}`
      : null)

  /* Classify the website link: an Instagram URL becomes a glyph + @handle
     (no point spelling out www.instagram.com), every other URL is rendered
     as the full "www.example.de" host so the user sees where they're going. */
  type WebsiteInfo =
    | { kind: 'instagram'; url: string; handle: string | null }
    | { kind: 'web';        url: string; display: string }
  const websiteInfo: WebsiteInfo | null = (() => {
    if (!restaurant.website) return null
    try {
      const u = new URL(restaurant.website)
      const host = u.hostname.toLowerCase()
      if (host === 'instagram.com' || host === 'www.instagram.com') {
        const handle = u.pathname.split('/').filter(Boolean)[0] ?? null
        return { kind: 'instagram', url: restaurant.website, handle }
      }
      let display = u.hostname
      if (!display.startsWith('www.') && display.split('.').length === 2) {
        display = `www.${display}`
      }
      return { kind: 'web', url: restaurant.website, display }
    } catch {
      return {
        kind: 'web',
        url: restaurant.website,
        display: restaurant.website.replace(/^https?:\/\//, '').replace(/\/$/, ''),
      }
    }
  })()

  /* Bezirk · Kategorie1 · Kategorie2 · Preis — flat dotted line. Prefer the
     real Places-API price range ("10–20 €") over the generic € symbol when
     the restaurant has it filled in. */
  const priceLabel = (() => {
    const r = restaurant.priceRange
    if (r && r.min != null && r.max != null) {
      const cur = r.currency === 'EUR' || !r.currency ? '€' : r.currency
      return `${r.min}–${r.max} ${cur}`
    }
    if (r && r.min != null) return `ab ${r.min} €`
    return restaurant.price ?? null
  })()
  const metaParts: { text: string; isPrice: boolean }[] = []
  if (district) metaParts.push({ text: district, isPrice: false })
  if (restaurant.categories?.length) {
    for (const c of restaurant.categories.slice(0, 3)) metaParts.push({ text: c, isPrice: false })
  }
  if (priceLabel) metaParts.push({ text: priceLabel, isPrice: true })

  return (
    <div className={styles.detailInSheet} role="dialog" aria-label={restaurant.name}>
      {/* Peek-visible header — name + 3 circular actions. Stays pinned at the
          top of the sheet so when collapsed to peek snap (110 px) the user
          still sees the name and the action buttons. */}
      <div className={styles.detailPeekHeader}>
        <h3 className={styles.detailName}>{restaurant.name}</h3>
        <div className={styles.detailPeekActions}>
          <button
            type="button"
            className={styles.detailPeekActionBtn}
            aria-label={t('map.share')}
            onClick={handleShare}
          >
            <ShareIcon />
          </button>
          {onToggleFavorite && (
            <button
              type="button"
              className={`${styles.detailPeekActionBtn} ${isFavorite ? styles.detailPeekActionBtnSaved : ''}`}
              aria-label={isFavorite ? 'Remove from saved' : t('map.save')}
              aria-pressed={!!isFavorite}
              onClick={(e) => { e.stopPropagation(); onToggleFavorite() }}
            >
              <HeartIcon filled={!!isFavorite} />
            </button>
          )}
          <button
            type="button"
            className={styles.detailPeekActionBtn}
            aria-label="Close"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      <div className={styles.detailInSheetScroll} data-detail-scroll>
        <div className={styles.detailBody}>
          {metaParts.length > 0 && (
            <div className={styles.detailMetaLine}>
              {metaParts.map((p, i) => (
                <span
                  key={`${p.text}-${i}`}
                  className={p.isPrice ? styles.detailMetaPrice : undefined}
                >
                  {p.text}
                </span>
              ))}
            </div>
          )}

          {statusMain && (
            <div className={styles.detailStatusLine} role="status">
              <span
                className={`${styles.detailStatusMain} ${
                  status.isOpen ? styles.detailStatusOpen : styles.detailStatusClosed
                }`}
              >
                {statusMain}
              </span>
              {statusSub && (
                <span className={styles.detailStatusSub}>· {statusSub}</span>
              )}
            </div>
          )}

          {meters !== null && (
            <div className={styles.detailTravelRow}>
              <a
                href={dirHref('walking')}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.detailTravelLink}
                aria-label={`Zu Fuß: ${walkingTime}`}
              >
                <WalkIcon />
                <span>{walkingTime}</span>
              </a>
              <a
                href={dirHref('transit')}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.detailTravelLink}
                aria-label={`Mit ÖPNV: ${transitTime}`}
              >
                <TransitIcon />
                <span>{transitTime}</span>
              </a>
              <a
                href={dirHref('driving')}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.detailTravelLink}
                aria-label={`Mit Auto: ${drivingTime}`}
              >
                <CarIcon />
                <span>{drivingTime}</span>
              </a>
            </div>
          )}

          {restaurant.reservationUrl && (
            <div className={styles.detailCtaRow}>
              <a
                href={restaurant.reservationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.detailCtaBtn} ${styles.detailCtaBtnPrimary}`}
              >
                {t('map.reserve')}
              </a>
            </div>
          )}

          {restaurant.photo ? (
            <figure className={styles.detailHeroInline}>
              <img src={restaurant.photo} alt={restaurant.name} className={styles.detailHero} />
              <figcaption className={styles.detailHeroCaption}>via Instagram</figcaption>
            </figure>
          ) : (
            <div
              className={`${styles.detailHeroInline} ${styles.detailHeroInlineEmpty}`}
              aria-hidden="true"
            >
              🍽
            </div>
          )}

          {restaurant.shortDescription && (
            <p className={styles.detailDescription}>{restaurant.shortDescription}</p>
          )}

          {restaurant.tip && (
            <div className={styles.detailTipBlock}>
              <strong>{t('map.insiderTip')}: </strong>
              {restaurant.tip}
            </div>
          )}

          {websiteInfo && (
            <section className={styles.detailSection}>
              <h4 className={styles.detailSectionTitle}>
                {websiteInfo.kind === 'instagram' ? 'Instagram' : t('map.website')}
              </h4>
              {websiteInfo.kind === 'instagram' ? (
                <a
                  href={websiteInfo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.detailInstagramLink}
                  aria-label={websiteInfo.handle ? `Instagram @${websiteInfo.handle}` : 'Instagram'}
                >
                  <InstagramIcon />
                  {websiteInfo.handle && <span>@{websiteInfo.handle}</span>}
                </a>
              ) : (
                <a
                  href={websiteInfo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.detailWebsiteLink}
                >
                  {websiteInfo.display}
                </a>
              )}
            </section>
          )}

          {restaurant.phone && (
            <section className={styles.detailSection}>
              <h4 className={styles.detailSectionTitle}>{t('map.phone')}</h4>
              <a
                href={`tel:${restaurant.phone.replace(/\s+/g, '')}`}
                className={styles.detailPhoneLink}
              >
                {restaurant.phone}
              </a>
            </section>
          )}

          {restaurant.address && addressMapsHref && (
            <section className={styles.detailSection}>
              <div className={styles.detailSectionHead}>
                <h4 className={styles.detailSectionTitle}>{t('map.address')}</h4>
                {restaurant.mapsUrl && (
                  <a
                    href={restaurant.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.detailMapsBtn}
                    aria-label={t('map.googleMaps')}
                  >
                    <MapPinIcon />
                  </a>
                )}
              </div>
              <a
                href={addressMapsHref}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.detailAddress}
              >
                {restaurant.address}
              </a>
            </section>
          )}

          {restaurant.openingHours && restaurant.openingHours.length > 0 && (
            <section className={styles.detailSection}>
              <h4 className={styles.detailSectionTitle}>{t('map.openingHours')}</h4>
              <ul className={styles.hoursList}>
                {restaurant.openingHours.map((slot, i) => (
                  <li key={i} className={styles.hoursRow}>
                    <span className={styles.hoursDay}>{slot.days}</span>
                    <span className={styles.hoursTime}>{slot.hours}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {mustEats.length > 0 && (
            <section className={styles.detailSection}>
              <h4 className={styles.detailSectionTitle}>{t('map.mustEatsCount')} ({mustEats.length})</h4>
              <div className={styles.mustGrid}>
                {mustEats.map(m => (
                  <MustEatMiniCard
                    key={m._id}
                    mustEat={m}
                    unlocked={unlockedIds.has(m._id)}
                    onClick={() => onMustEatClick(m)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
