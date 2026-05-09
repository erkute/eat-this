'use client'
import { useLocale } from 'next-intl'
import { routing } from '@/i18n/routing'
import type { MapMustEat } from '@/lib/types'
import {
  formatDistance,
  formatDrivingTime,
  formatTransitTime,
  formatWalkingTime,
} from '@/lib/map'
import { Link } from '@/i18n/navigation'
import { useTranslation } from '@/lib/i18n'
import styles from './map.module.css'
import { UNLOCK_RADIUS_METERS, type MustEatDetailState } from './useMustEatDetailState'

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

function UnlockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 7.5-1.5" />
    </svg>
  )
}

function WalkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9 7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7" />
    </svg>
  )
}

function TransitIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-3.58-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm3.5-7H6V6h5v4zm5.5 7c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-7h-5V6h5v4z" />
    </svg>
  )
}

function CarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
    </svg>
  )
}

interface Props {
  mustEat: MapMustEat
  isUnlocked: boolean
  onClose: () => void
  onBack?: () => void
  onViewRestaurant?: () => void
  onShowMustEatList?: () => void
  uid?: string | null
  state: MustEatDetailState
}

export default function MustEatDetailMobile({
  mustEat,
  isUnlocked,
  onClose,
  onBack,
  onViewRestaurant,
  onShowMustEatList,
  uid,
  state,
}: Props) {
  const { t } = useTranslation()
  const locale = useLocale()
  const {
    distance,
    canUnlock,
    vibrateIntensity,
    tapping,
    revealOrigin,
    handleCardClick,
    handleCardZoom,
  } = state

  const { lat, lng, name: restaurantName, district } = mustEat.restaurant
  const walkingTime = distance != null ? formatWalkingTime(distance) : null
  const transitTime = distance != null ? formatTransitTime(distance) : null
  const drivingTime = distance != null ? formatDrivingTime(distance) : null
  const dirHref = (mode: 'walking' | 'transit' | 'driving') =>
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=${mode}`
  const mapsViewHref = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`

  /* When unlocked, the dish is the headline; when locked, the restaurant name
     stands in (since the dish would spoil the unlock surprise). */
  const peekTitle = isUnlocked ? mustEat.dish : restaurantName

  const metaParts: { text: string; isPrice: boolean }[] = []
  if (isUnlocked) metaParts.push({ text: restaurantName, isPrice: false })
  if (district)   metaParts.push({ text: district, isPrice: false })
  if (mustEat.price) metaParts.push({ text: mustEat.price, isPrice: true })

  return (
    <div className={styles.detailInSheet} role="dialog" aria-label={`Must-Eat at ${restaurantName}`}>
      {/* Apple-style sticky peek-header — title + 2 round actions (back + close).
          Replaces the floating frosted-glass overlays that used to sit on the
          card image. Same visual vocabulary as the restaurant detail header. */}
      <div className={styles.detailPeekHeader}>
        <h3 className={styles.detailName}>{peekTitle}</h3>
        <div className={styles.detailPeekActions}>
          {onBack && (
            <button
              type="button"
              className={styles.detailPeekActionBtn}
              aria-label={t('map.backToRestaurant') ?? 'Zurück zum Restaurant'}
              onClick={onBack}
            >
              <BackIcon />
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
          {/* Eyebrow first — sets the lock state context before the visual */}
          <span className={styles.mustEatEyebrow}>
            {isUnlocked
              ? <><UnlockIcon /> Must-Eat · freigeschaltet</>
              : <><LockIcon /> Must-Eat · verschlossen</>}
          </span>

          {/* Hero — clean card on cream gradient. No overlay buttons; the
              wobble + tap-to-unlock interaction is the centerpiece. */}
          <div
            className={styles.mustEatHero}
            style={!isUnlocked ? { ['--vibrate-intensity' as string]: vibrateIntensity.toFixed(3) } : undefined}
          >
            {isUnlocked && !revealOrigin ? (
              <button
                type="button"
                className={styles.mustEatPhotoFlip}
                onClick={handleCardZoom}
                aria-label="Karte vergrößern"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mustEat.image} alt={mustEat.dish} className={styles.mustEatPhotoFront} />
              </button>
            ) : (
              <button
                type="button"
                className={`${styles.mustEatCard} ${canUnlock ? styles.mustEatCardCanUnlock : ''} ${tapping ? styles.mustEatCardTapping : ''}`}
                onClick={handleCardClick}
                aria-label={canUnlock ? t('map.revealHere') : t('map.tooFarToReveal')}
                style={revealOrigin ? { visibility: 'hidden' } : undefined}
              />
            )}
          </div>

          {/* Magazine meta line — same vocabulary as restaurant detail */}
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

          {/* Travel-time row — Walk/Transit/Car estimates, tap-through to Maps */}
          {distance !== null && walkingTime && transitTime && drivingTime && (
            <div className={styles.detailTravelRow}>
              <a
                href={dirHref('walking')}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.detailTravelLink}
                aria-label={`Zu Fuß: ${walkingTime}`}
              >
                <WalkIcon /><span>{walkingTime}</span>
              </a>
              <a
                href={dirHref('transit')}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.detailTravelLink}
                aria-label={`Mit ÖPNV: ${transitTime}`}
              >
                <TransitIcon /><span>{transitTime}</span>
              </a>
              <a
                href={dirHref('driving')}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.detailTravelLink}
                aria-label={`Mit Auto: ${drivingTime}`}
              >
                <CarIcon /><span>{drivingTime}</span>
              </a>
            </div>
          )}

          {/* Locked-state messaging — banner when within unlock radius,
              tip-style block otherwise. Reuses the restaurant detail's
              insider-tip vocabulary so the visual language stays consistent.
              Includes the live distance so the user always knows how far
              they are from the unlock radius. */}
          {!isUnlocked && (canUnlock ? (
            <div className={styles.mustEatCanUnlockBanner}>
              <div>
                <strong>Du bist nah genug!</strong>
                <span>
                  {distance !== null && <>Nur noch {formatDistance(distance)} — t</>}
                  {distance === null && 'T'}ippe auf die Karte, um dein Must-Eat aufzudecken.
                </span>
              </div>
            </div>
          ) : (
            <div className={styles.detailTipBlock}>
              <strong>Verschlossen.</strong>{' '}
              {distance !== null
                ? <>Du bist <strong className={styles.detailTipDistance}>{formatDistance(distance)}</strong> entfernt — komm auf {UNLOCK_RADIUS_METERS} m heran und tippe die Karte auf.</>
                : <>Komm auf {UNLOCK_RADIUS_METERS} m heran und tippe die Karte auf.</>}
            </div>
          ))}

          {/* Booster offer — locked state only */}
          {!isUnlocked && (
            <div className={styles.boosterOffer}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/pics/booster/booster5.webp" alt="" className={styles.boosterImg} loading="lazy" />
              <div className={styles.boosterInfo}>
                <div className={styles.boosterTitle}>Hunger auf mehr?</div>
                <div className={styles.boosterDesc}>Cafés, Lunch, Dinner oder direkt ganz Berlin ab 0,99 €.</div>
                <button
                  type="button"
                  className={styles.boosterCta}
                  onClick={() => {
                    if (uid) {
                      window.location.href = locale === routing.defaultLocale ? '/profile#booster' : `/${locale}/profile#booster`
                    } else {
                      window.location.assign(locale === routing.defaultLocale ? '/login' : `/${locale}/login`)
                    }
                  }}
                >
                  Ansehen
                </button>
              </div>
            </div>
          )}

          {/* Unlocked: dish description as magazine paragraph */}
          {isUnlocked && mustEat.description && (
            <p className={styles.detailDescription}>{mustEat.description}</p>
          )}

          {/* Compact action row — Maps / Restaurant / Alle Must-Eats. Same
              visual language as the travel-row above. */}
          <nav className={styles.mustEatActions} aria-label="Must-Eat actions">
            <a
              href={mapsViewHref}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.mustEatActionLink}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>{t('map.googleMaps')}</span>
            </a>
            {onViewRestaurant ? (
              <button type="button" onClick={onViewRestaurant} className={styles.mustEatActionLink}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 11l9-8 9 8v10a2 2 0 01-2 2h-4v-7H9v7H5a2 2 0 01-2-2V11z" />
                </svg>
                <span>Restaurant</span>
              </button>
            ) : (
              <Link href={`/restaurant/${mustEat.restaurant.slug}`} className={styles.mustEatActionLink}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 11l9-8 9 8v10a2 2 0 01-2 2h-4v-7H9v7H5a2 2 0 01-2-2V11z" />
                </svg>
                <span>Restaurant</span>
              </Link>
            )}
            {onShowMustEatList && (
              <button type="button" onClick={onShowMustEatList} className={styles.mustEatActionLink}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
                <span>Alle Must-Eats</span>
              </button>
            )}
          </nav>
        </div>
      </div>
    </div>
  )
}
