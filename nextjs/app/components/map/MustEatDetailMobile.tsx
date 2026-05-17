'use client'
import type { MapMustEat } from '@/lib/types'
import {
  formatDistance,
  formatWalkingTime,
} from '@/lib/map'
import { Link } from '@/i18n/navigation'
import { useTranslation } from '@/lib/i18n'
import styles from './map.module.css'
import BoosterOfferInline from './BoosterOfferInline'
import { UNLOCK_RADIUS_METERS, type MustEatDetailState } from './useMustEatDetailState'
import {
  BackIcon,
  CloseIcon,
  HomeIcon,
  LockIcon,
  PinIcon,
  UnlockIcon,
  WalkIcon,
} from './icons'

interface Props {
  mustEat: MapMustEat
  isUnlocked: boolean
  onClose: () => void
  onBack?: () => void
  onViewRestaurant?: () => void
  uid?: string | null
  state: MustEatDetailState
}

export default function MustEatDetailMobile({
  mustEat,
  isUnlocked,
  onClose,
  onBack,
  onViewRestaurant,
  uid,
  state,
}: Props) {
  const { t } = useTranslation()
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
  const walkDirHref = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`
  const mapsViewHref = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`

  /* When unlocked, the dish is the headline; when locked, the restaurant name
     stands in (since the dish would spoil the unlock surprise). */
  const peekTitle = isUnlocked ? mustEat.dish : restaurantName

  const metaParts: { text: string; isPrice: boolean }[] = []
  if (isUnlocked) metaParts.push({ text: restaurantName, isPrice: false })
  if (district)   metaParts.push({ text: district, isPrice: false })
  if (mustEat.price) metaParts.push({ text: mustEat.price, isPrice: true })

  return (
    <div className={styles.detailInSheet} role="dialog" aria-label={`Must Eat at ${restaurantName}`}>
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
              ? <><UnlockIcon /> Must Eat · freigeschaltet</>
              : <><LockIcon /> Must Eat · verschlossen</>}
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

          {/* Travel-row — walk-time only (Luftlinie estimate, fine inner-city). */}
          {distance !== null && walkingTime && (
            <div className={styles.detailTravelRow}>
              <a
                href={walkDirHref}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.detailTravelLink}
                aria-label={`Zu Fuß: ${walkingTime}`}
              >
                <WalkIcon /><span>{walkingTime}</span>
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
                  {distance === null && 'T'}ippe auf die Karte, um dein Must Eat aufzudecken.
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

          {/* Booster offer — locked state only. State-aware via uid:
              signed-out users see the free Starter Pack; signed-in users
              see the paid Berlin lineup. */}
          {!isUnlocked && (
            <BoosterOfferInline uid={uid ?? null} variant="detail" />
          )}

          {/* Unlocked: dish description as magazine paragraph */}
          {isUnlocked && mustEat.description && (
            <p className={styles.detailDescription}>{mustEat.description}</p>
          )}

          {/* Compact action row — Maps / Restaurant / Alle Must Eats. Same
              visual language as the travel-row above. */}
          <nav className={styles.mustEatActions} aria-label="Must Eat actions">
            <a
              href={mapsViewHref}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.mustEatActionLink}
            >
              <PinIcon />
              <span>{t('map.googleMaps')}</span>
            </a>
            {onViewRestaurant ? (
              <button type="button" onClick={onViewRestaurant} className={styles.mustEatActionLink}>
                <HomeIcon />
                <span>Restaurant</span>
              </button>
            ) : (
              <Link href={`/restaurant/${mustEat.restaurant.slug}`} className={styles.mustEatActionLink}>
                <HomeIcon />
                <span>Restaurant</span>
              </Link>
            )}
            {/* "Alle Must Eats"-Link entfernt — Must-Eats-Liste ist seit dem
                Layer-Toggle-Remove keine eigene Top-Level-Ansicht mehr. */}
          </nav>
        </div>
      </div>
    </div>
  )
}
