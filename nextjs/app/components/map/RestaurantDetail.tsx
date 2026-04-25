'use client'
import { useState } from 'react'
import type { MapRestaurant, MapMustEat } from '@/lib/types'
import { getOpenStatus } from '@/lib/map/openingHours'
import type { UserLocation } from '@/lib/map/useUserLocation'
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
        <>
          <img src={mustEat.image} alt="" loading="lazy" />
          <span className={styles.mustCardLabel}>{mustEat.dish}</span>
        </>
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
  inSheet?: boolean
  isFavorite?: boolean
  onToggleFavorite?: () => void
}

function GoogleLogo() {
  return (
    <svg
      className={styles.googleLogo}
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

function PinIcon() {
  return (
    <svg className={styles.inlineLinkIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2a8 8 0 0 0-8 8c0 5.5 8 12 8 12s8-6.5 8-12a8 8 0 0 0-8-8z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function GlobeIcon() {
  return (
    <svg className={styles.inlineLinkIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg className={styles.inlineLinkIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg className={styles.inlineLinkIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export default function RestaurantDetail({
  restaurant,
  mustEats,
  unlockedIds,
  onClose,
  onMustEatClick,
  inSheet,
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

  const heroEl = (
    <div className={styles.detailHeroWrap}>
      {restaurant.photo ? (
        <img src={restaurant.photo} alt={restaurant.name} className={styles.detailHero} />
      ) : (
        <div className={styles.detailHeroPlaceholder} aria-hidden="true">🍽</div>
      )}
      {inSheet && (
        <button
          type="button"
          className={styles.detailHeroClose}
          aria-label="Close"
          onClick={onClose}
        >
          <CloseIcon />
        </button>
      )}
      {onToggleFavorite && (
        <button
          type="button"
          className={`${styles.detailFavBtn} ${isFavorite ? styles.detailFavBtnActive : ''}`}
          aria-label={isFavorite ? 'Remove from saved' : 'Save restaurant'}
          aria-pressed={!!isFavorite}
          onClick={(e) => { e.stopPropagation(); onToggleFavorite() }}
        >
          <svg viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      )}
    </div>
  )

  const sections = (
    <>
      {restaurant.openingHours && restaurant.openingHours.length > 0 && (
        <section>
          <div className={styles.sectionLabel}>{t('map.openingHours')}</div>
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

      {restaurant.tip && (
        <section>
          <div className={styles.sectionLabel}>{t('map.insiderTip')}</div>
          <p className={styles.tipBlock}>{restaurant.tip}</p>
        </section>
      )}

      {mustEats.length > 0 && (
        <section>
          <div className={styles.sectionLabel}>{t('map.mustEatsCount')} ({mustEats.length})</div>
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
    </>
  )

  if (inSheet) {
    return (
      <div className={styles.detailInSheet} role="dialog" aria-label={restaurant.name}>
        <div className={styles.detailInSheetScroll}>
          {heroEl}
          <div className={styles.detailLeftInfo}>
            <h3 className={styles.detailName}>{restaurant.name}</h3>
            {(district || restaurant.price || restaurant.categories?.length) && (
              <div className={styles.detailDistrict}>
                {[
                  district,
                  restaurant.price,
                  restaurant.categories?.slice(0, 3).join(', '),
                ].filter(Boolean).join(' · ')}
              </div>
            )}
            {status.label && (
              <span
                className={`${styles.statusPill} ${
                  status.isOpen ? styles.statusPillOpen : styles.statusPillClosed
                }`}
              >
                {status.label}
              </span>
            )}
            {restaurant.shortDescription && (
              <p className={styles.detailDescription}>{restaurant.shortDescription}</p>
            )}
            <div className={styles.inlineLinks}>
              {restaurant.mapsUrl && (
                <a href={restaurant.mapsUrl} target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>
                  <PinIcon /> {t('map.googleMaps')}
                </a>
              )}
              {restaurant.website && (
                <a href={restaurant.website} target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>
                  <GlobeIcon /> {t('map.website')}
                </a>
              )}
              {restaurant.reservationUrl && (
                <a href={restaurant.reservationUrl} target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>
                  <CalendarIcon /> {t('map.reserve')}
                </a>
              )}
              <button type="button" className={styles.inlineLink} onClick={handleShare}>
                <ShareIcon /> {t('map.share')}
              </button>
            </div>
          </div>
          <div className={styles.detailScroll}>{sections}</div>
        </div>
      </div>
    )
  }

  // Desktop floating overlay — "Magazine" layout: 56/44 split, name overlaid
  // on the photo (bottom-left, dark gradient), meta + status + description +
  // inline links + sections all in the right column. Same design language as
  // the mobile sheet (status pill, inline links, no button row).
  const priceCatText = [
    restaurant.price,
    restaurant.categories?.slice(0, 3).join(' · '),
  ].filter(Boolean).join(' · ')

  return (
    <div className={`${styles.detail} ${styles.detailMagazine}`} role="dialog" aria-label={restaurant.name}>
      <button
        type="button"
        className={styles.detailClose}
        aria-label="Close"
        onClick={onClose}
      >
        ×
      </button>

      <div
        className={styles.detailLeft}
        style={restaurant.photo ? ({ ['--hero-image' as string]: `url("${restaurant.photo}")` }) : undefined}
        aria-label={restaurant.name}
      >
        {!restaurant.photo && (
          <div className={styles.detailHeroPlaceholder} aria-hidden="true">🍽</div>
        )}
        {onToggleFavorite && (
          <button
            type="button"
            className={`${styles.detailFavBtn} ${isFavorite ? styles.detailFavBtnActive : ''}`}
            aria-label={isFavorite ? 'Remove from saved' : 'Save restaurant'}
            aria-pressed={!!isFavorite}
            onClick={(e) => { e.stopPropagation(); onToggleFavorite() }}
          >
            <svg viewBox="0 0 24 24" fill={isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        )}
        <div className={styles.detailHeroOverlay}>
          <h3 className={styles.detailHeroName}>{restaurant.name}</h3>
        </div>
      </div>

      <div className={styles.detailRight}>
        {(district || priceCatText) && (
          <div className={styles.detailDesktopMeta}>
            {district && <div className={styles.detailDesktopMetaTop}>{district}</div>}
            {priceCatText && <div className={styles.detailDesktopMetaBottom}>{priceCatText}</div>}
          </div>
        )}
          {status.label && (
            <span
              className={`${styles.statusPill} ${
                status.isOpen ? styles.statusPillOpen : styles.statusPillClosed
              }`}
            >
              {status.label}
            </span>
          )}
          {restaurant.shortDescription && (
            <p className={styles.detailDescription}>{restaurant.shortDescription}</p>
          )}
          <div className={styles.inlineLinks}>
            {restaurant.mapsUrl && (
              <a href={restaurant.mapsUrl} target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>
                <PinIcon /> {t('map.googleMaps')}
              </a>
            )}
            {restaurant.website && (
              <a href={restaurant.website} target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>
                <GlobeIcon /> {t('map.website')}
              </a>
            )}
            {restaurant.reservationUrl && (
              <a href={restaurant.reservationUrl} target="_blank" rel="noopener noreferrer" className={styles.inlineLink}>
                <CalendarIcon /> {t('map.reserve')}
              </a>
            )}
            <button type="button" className={styles.inlineLink} onClick={handleShare}>
              <ShareIcon /> {t('map.share')}
            </button>
          </div>
        <div className={styles.detailScroll}>{sections}</div>
      </div>
    </div>
  )
}
