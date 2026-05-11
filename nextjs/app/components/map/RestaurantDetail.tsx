'use client'
import { useState } from 'react'
import type { MapRestaurant, MapMustEat } from '@/lib/types'
import {
  getOpenStatus,
  haversineDistance,
  formatWalkingTime,
  type UserLocation,
} from '@/lib/map'
import { useTranslation } from '@/lib/i18n'
import { localizedCategoryName } from '@/lib/categories'
import styles from './map.module.css'
import {
  ArrowOutIcon,
  CloseIcon,
  HeartIcon,
  InstagramIcon,
  ShareIcon,
  WalkIcon,
} from './icons'
import {
  classifyWebsite,
  formatPriceLabel,
  splitStatusLabel,
} from './restaurantDetail.helpers'

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
      aria-label={unlocked ? mustEat.dish : 'Locked Must Eat'}
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
  const { t, lang } = useTranslation()
  const loc = lang === 'de' ? 'de' : 'en'
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
  /* Walk-time is a Luftlinie-based estimate, fine for inner-city Berlin.
     formatWalkingTime returns null beyond ~1600 m so a far-away spot
     doesn't read as a discouraging "90 Min" — for those, the Maps button
     in the address section is the right tool. Transit/Car were dropped
     for the same reason: heuristic minutes mislead. */
  const walkDirHref = `https://www.google.com/maps/dir/?api=1&destination=${restaurant.lat},${restaurant.lng}&travelmode=walking`

  // Status label is split into a colored primary word + muted suffix —
  // same vocabulary as the list row.
  const { main: statusMain, sub: statusSub } = splitStatusLabel(status.label)

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

  const websiteInfo = classifyWebsite(restaurant.website)
  const priceLabel = formatPriceLabel(restaurant)

  // Bezirk · Kategorie1 · Kategorie2 · Preis — flat dotted line.
  const metaParts: { text: string; isPrice: boolean }[] = []
  if (district) metaParts.push({ text: district, isPrice: false })
  if (restaurant.categories?.length) {
    for (const c of restaurant.categories.slice(0, 3)) {
      metaParts.push({ text: localizedCategoryName(c, loc), isPrice: false })
    }
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

          {walkingTime !== null && (
            <div className={styles.detailTravelRow}>
              <a
                href={walkDirHref}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.detailTravelLink}
                aria-label={`Zu Fuß: ${walkingTime}`}
              >
                <WalkIcon />
                <span>{walkingTime}</span>
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
              <figcaption className={styles.detailHeroCaption}>
                {restaurant.photoCredit ? (
                  restaurant.photoCreditUrl ? (
                    <a href={restaurant.photoCreditUrl} target="_blank" rel="noopener noreferrer">
                      {restaurant.photoCredit}
                    </a>
                  ) : (
                    restaurant.photoCredit
                  )
                ) : (
                  'via Instagram'
                )}
              </figcaption>
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
              <h4 className={styles.detailSectionTitle}>{t('map.address')}</h4>
              <a
                href={addressMapsHref}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.detailAddress}
                aria-label={`${restaurant.address} — ${t('map.googleMaps')}`}
              >
                <span>{restaurant.address}</span>
                <ArrowOutIcon className={styles.detailAddressArrow} />
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
