'use client'
import { useState } from 'react'
import type { MapRestaurant, MapMustEat } from '@/lib/types'
import { getOpenStatus } from '@/lib/map'
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

function GoogleLogo() {
  return (
    <svg
      className={styles.detailLinkGoogleLogo}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg
      className={styles.detailLinkIcon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
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
      className={styles.detailLinkIcon}
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

export default function RestaurantDetail({
  restaurant,
  mustEats,
  unlockedIds,
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

  // Strip protocol + trailing slash for display so the URL reads as
  // "www.example.com" instead of the noisy full canonical form.
  const prettyWebsite = restaurant.website
    ? restaurant.website.replace(/^https?:\/\//, '').replace(/\/$/, '')
    : null

  return (
    <div className={styles.detailInSheet} role="dialog" aria-label={restaurant.name}>
      <div className={styles.detailInSheetScroll} data-detail-scroll>
        {/* Desktop sidebar — full-bleed photo at top with close X overlay,
            unchanged from the previous design the user liked. Hidden on
            mobile via CSS; mobile renders an inline magazine-style figure
            inside the body further down. */}
        <div className={styles.detailHeroTop}>
          {restaurant.photo ? (
            <img src={restaurant.photo} alt={restaurant.name} className={styles.detailHero} />
          ) : (
            <div className={styles.detailHeroPlaceholder} aria-hidden="true">🍽</div>
          )}
          {restaurant.photo && (
            <span className={styles.detailHeroCredit} aria-label="Photo credit">via Instagram</span>
          )}
          <button
            type="button"
            className={styles.detailHeroClose}
            aria-label="Close"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>

        <div className={styles.detailBody}>
          <header className={styles.detailHeader}>
            <h3 className={styles.detailName}>{restaurant.name}</h3>
            {(district || status.label) && (
              <div className={styles.detailMetaRow}>
                {district && <span className={styles.detailDistrict}>{district}</span>}
                {status.label && (
                  <span
                    className={`${styles.statusPill} ${
                      status.isOpen ? styles.statusPillOpen : styles.statusPillClosed
                    }`}
                  >
                    {status.label}
                  </span>
                )}
              </div>
            )}
            {(restaurant.price || (restaurant.categories?.length ?? 0) > 0) && (
              <div className={styles.detailChipsRow}>
                {restaurant.price && (
                  <span className={`${styles.detailChip} ${styles.detailChipPrice}`}>{restaurant.price}</span>
                )}
                {restaurant.categories?.slice(0, 3).map(c => (
                  <span key={c} className={styles.detailChip}>{c}</span>
                ))}
              </div>
            )}
          </header>

          {/* Action links — sit directly under the header so the primary CTAs
              are reachable at the mid snap, before the body prose begins. */}
          <div className={styles.detailLinks}>
            {restaurant.reservationUrl && (
              <a
                href={restaurant.reservationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.detailLink} ${styles.detailLinkPrimary}`}
              >
                {t('map.reserve')}
              </a>
            )}
            {onToggleFavorite && (
              <button
                type="button"
                className={`${styles.detailLink} ${isFavorite ? styles.detailLinkSaved : ''}`}
                aria-label={isFavorite ? 'Remove from saved' : 'Save restaurant'}
                aria-pressed={!!isFavorite}
                onClick={(e) => { e.stopPropagation(); onToggleFavorite() }}
              >
                <HeartIcon filled={!!isFavorite} />
                {t('map.save')}
              </button>
            )}
            {restaurant.website && (
              <a
                href={restaurant.website}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.detailLink}
              >
                {t('map.website')}
              </a>
            )}
            {restaurant.mapsUrl && (
              <a
                href={restaurant.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.detailLink} ${styles.detailLinkGoogle}`}
              >
                <GoogleLogo />
                {t('map.googleMaps')}
              </a>
            )}
            <button type="button" className={styles.detailLink} onClick={handleShare}>
              <ShareIcon />
              {t('map.share')}
            </button>
          </div>

          {/* Mobile photo — magazine-style inline image. Full-bleed past the
              body padding (negative horizontal margin), square corners, no
              shadow. Caption sits below as a small italic credit line.
              Hidden on desktop where the top hero takes over. */}
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

          {restaurant.website && prettyWebsite && (
            <section className={styles.detailSection}>
              <h4 className={styles.detailSectionTitle}>{t('map.website')}</h4>
              <a
                href={restaurant.website}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.detailWebsiteLink}
              >
                {prettyWebsite}
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
