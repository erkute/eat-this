'use client'
import { useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import type { MapMustEat } from '@/lib/types'
import { Link } from '@/i18n/navigation'
import { formatLocalizedDistance } from '@/lib/map'
import { useTranslations } from 'next-intl'
import { useTranslation } from '@/lib/i18n'
import { pickLocale } from '@/lib/i18n/pickLocale'
import { normalizeName } from '@/lib/normalizeName'
import styles from './MapDetails.module.css'
import { UNLOCK_RADIUS_METERS, type MustEatDetailState } from './useMustEatDetailState'
import { useSwipePager } from './useSwipePager'
import { CloseIcon, PagerArrowIcon } from './icons'

const CARD_BACK = '/pics/card-back.webp?v=6'

interface Props {
  mustEat: MapMustEat
  isUnlocked: boolean
  /** True for the brief window after the card lands: the "VERDECKT" stamp
   *  burns away and the name un-blurs into view. */
  nameBurning?: boolean
  onClose: () => void
  onViewRestaurant?: () => void
  /** Global must-eat pager — adjacent cards + page handlers. */
  prevMustEat?: MapMustEat | null
  nextMustEat?: MapMustEat | null
  /** Whether the adjacent cards are revealed — a locked neighbour must NOT
   *  leak its dish name in the pager (it'd spoil the surprise). */
  prevUnlocked?: boolean
  nextUnlocked?: boolean
  onPagePrev?: () => void
  onPageNext?: () => void
  state: MustEatDetailState
}

// Poster sheet: card hero → huge dish name → prose → spot action. Horizontal
// must-eat paging works both as a swipe gesture and as a quiet bottom nav.
export default function MustEatDetailMobile({
  mustEat,
  isUnlocked,
  nameBurning,
  onClose,
  onViewRestaurant,
  prevMustEat,
  nextMustEat,
  prevUnlocked,
  nextUnlocked,
  onPagePrev,
  onPageNext,
  state,
}: Props) {
  const { t, lang } = useTranslation()
  // Legacy t() can't interpolate ICU values — parametrized keys go through next-intl directly.
  const tMap = useTranslations('map')
  const localizedDescription = pickLocale(mustEat.description, mustEat.descriptionEn, lang)
  const {
    distance,
    canUnlock,
    proximityProgress,
    vibrateIntensity,
    tapping,
    unlocking,
    unlockError,
    revealOrigin,
    handleCardClick,
    handleCardZoom,
  } = state
  const { name: restaurantName } = mustEat.restaurant
  const restaurantPhoto = mustEat.restaurant.photo
  const open = isUnlocked && !revealOrigin
  const showDistanceMeter = !unlocking && !unlockError && !canUnlock && distance !== null
  const nameRevealed = open && !nameBurning
  const dishName = mustEat.dish ? normalizeName(mustEat.dish) : t('mustEats.covered')
  const dishNameWeight = dishName.replace(/\s+/g, '').length
  const dishNameSizeClass = dishNameWeight > 22
    ? styles.fdNameCompact
    : dishNameWeight > 12
      ? styles.fdNameLong
      : ''
  const closeAction = onViewRestaurant ?? onClose
  const previousLabel = lang === 'en' ? 'Previous' : 'Zurück'
  const nextLabel = lang === 'en' ? 'Next' : 'Weiter'
  const previousName = prevMustEat
    ? prevUnlocked
      ? normalizeName(prevMustEat.dish ?? '') || previousLabel
      : t('mustEats.covered')
    : previousLabel
  const nextName = nextMustEat
    ? nextUnlocked
      ? normalizeName(nextMustEat.dish ?? '') || nextLabel
      : t('mustEats.covered')
    : nextLabel

  // Swipe anywhere on the sheet (hero, name, pager band) pages to the
  // neighbouring must-eat — same gesture as the restaurant detail.
  const rootRef = useRef<HTMLDivElement>(null)
  const topCardRef = useRef<HTMLDivElement>(null)
  const cardEnterDirRef = useRef<'prev' | 'next' | null>(null)
  const [cardHiddenForPage, setCardHiddenForPage] = useState(false)
  useLayoutEffect(() => {
    const target = topCardRef.current
    const enterDir = cardEnterDirRef.current
    cardEnterDirRef.current = null
    setCardHiddenForPage(false)
    if (!target) return

    target.style.removeProperty('transition')
    target.style.removeProperty('transform')

    if (enterDir) {
      const root = rootRef.current
      const startX = enterDir === 'next'
        ? (root?.clientWidth ?? window.innerWidth)
        : -(root?.clientWidth ?? window.innerWidth)

      target.style.setProperty('transition', 'none', 'important')
      target.style.setProperty('transform', `translateX(${startX}px)`, 'important')
      void target.offsetWidth
      window.requestAnimationFrame(() => {
        target.style.setProperty('transition', 'transform .3s cubic-bezier(0.2, 0.8, 0.2, 1)', 'important')
        target.style.setProperty('transform', 'translateX(0)', 'important')
        window.setTimeout(() => {
          target.style.removeProperty('transition')
          target.style.removeProperty('transform')
        }, 320)
      })
    }
  }, [mustEat._id])
  useSwipePager(rootRef, {
    onPrev: onPagePrev,
    onNext: onPageNext,
    hasPrev: !!prevMustEat,
    hasNext: !!nextMustEat,
    transformRef: topCardRef,
    animateIn: true,
    flushPage: true,
  })

  const pageWithCard = (dir: 'prev' | 'next') => {
    const target = topCardRef.current
    const root = rootRef.current
    const page = dir === 'prev' ? onPagePrev : onPageNext
    if (!target || !root || !page) {
      page?.()
      return
    }
    const outX = dir === 'next' ? -root.clientWidth : root.clientWidth
    target.style.setProperty('transition', 'transform .22s cubic-bezier(0.2, 0.8, 0.2, 1)', 'important')
    target.style.setProperty('transform', `translateX(${outX}px)`, 'important')
    window.setTimeout(() => {
      cardEnterDirRef.current = dir
      flushSync(() => page())
    }, 220)
  }

  return (
    <div
      ref={rootRef}
      className={`${styles.detailV13} ${styles.detailV13MustEat}`}
      data-detail-root="must-eat"
      role="dialog"
      aria-label={tMap('mustEatAtAria', { name: restaurantName })}
    >
      {/* Nachbar-Bilder vorladen, damit beim Swipen die nächste Karte sofort
          komplett dasteht statt nachzuladen (Card-Back der Locked-Karten ist
          eh im Cache). React hoisted die link-Tags in den <head>. */}
      {prevUnlocked && prevMustEat?.image && <link rel="preload" as="image" href={prevMustEat.image} />}
      {nextUnlocked && nextMustEat?.image && <link rel="preload" as="image" href={nextMustEat.image} />}
      <div className={styles.detailV13Scroll} data-detail-scroll>
        <button
          type="button"
          className={styles.fdClose}
          aria-label={onViewRestaurant ? t('map.toSpot') : t('map.searchClose')}
          onClick={closeAction}
        >
          <CloseIcon />
        </button>

        {/* HERO — freigestellte Karte mit Glow-Halo. Open: dish card (3D-Tilt
            via CSS, tap-to-zoom). Locked: card-back (flach + Wackeln, tap to
            reveal in range — flach bleibt wichtig für die Reveal-Fly-Origin). */}
        <div className={styles.fdHeroWrap} data-detail-hero>
          <div className={styles.fdCardStack}>
            <img className={`${styles.fdStackCard} ${styles.fdStackCardOne}`} src={CARD_BACK} alt="" aria-hidden="true" />
            <img className={`${styles.fdStackCard} ${styles.fdStackCardTwo}`} src={CARD_BACK} alt="" aria-hidden="true" />
            <img className={`${styles.fdStackCard} ${styles.fdStackCardThree}`} src={CARD_BACK} alt="" aria-hidden="true" />
            <div className={`${styles.fdTopCard}${cardHiddenForPage ? ` ${styles.fdTopCardHidden}` : ''}`} ref={topCardRef}>
              {open ? (
                <button
                  type="button"
                  className={styles.fdHero}
                  onClick={mustEat.image ? handleCardZoom : undefined}
                  disabled={!mustEat.image}
                  aria-label={t('map.zoomCard')}
                  /* Während des Zooms (inkl. Fly-Back) verstecken, sonst liegt die
                    Karte doppelt da — Zoom-Klon + statische Slot-Karte. */
                  style={state.zoomActive ? { visibility: 'hidden' } : undefined}
                >
                  <img
                    src={mustEat.image || CARD_BACK}
                    alt={mustEat.image ? mustEat.dish : t('mustEats.covered')}
                  />
                </button>
              ) : (
                <button
                  type="button"
                  className={`${styles.fdHero} ${styles.fdHeroLocked} ${canUnlock && !unlocking ? styles.mustEatCardCanUnlock : ''} ${tapping ? styles.mustEatCardTapping : ''}`}
                  onClick={handleCardClick}
                  disabled={unlocking}
                  aria-busy={unlocking || undefined}
                  aria-label={
                    unlocking
                      ? t('map.revealSaving')
                      : canUnlock
                        ? t('map.revealHere')
                        : t('map.tooFarToReveal')
                  }
                  style={{
                    ...(revealOrigin ? { visibility: 'hidden' } : {}),
                    ['--vibrate-intensity' as string]: tapping ? '2.4' : vibrateIntensity.toFixed(3),
                  }}
                >
                  <img src={CARD_BACK} alt={t('mustEats.covered')} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Clip-sicherer Mittelteil: Gericht-Name + Beschreibung (open) bzw.
            Näherungs-Hinweis (locked) hängen direkt unter der Karte; läuft der
            Text über, klemmt fdMid statt den fixen Footer zu verdrängen. */}
        <div className={`${styles.fdMid}${!open ? ` ${styles.fdMidLocked}` : ''}`}>
          {/* Gericht-Name — unten im 2-Zeilen-Feld verankert, sitzt direkt über
              der Beschreibung; eine 2. Zeile füllt nach oben → nichts darunter
              springt. Locked: stark verschwommen (kein Stempel). */}
          <h1
            className={`${styles.fdName}${dishNameSizeClass ? ` ${dishNameSizeClass}` : ''}`}
            aria-label={nameRevealed ? undefined : t('mustEats.covered')}
          >
            <span
              className={`${styles.fdNameText}${!open ? ` ${styles.fdNameBlur}` : ''}${nameBurning ? ` ${styles.fdNameUnblurring}` : ''}`}
              aria-hidden={nameRevealed ? undefined : true}
            >
              {dishName}
            </span>
          </h1>

          {/* Beschreibung — komplett (keine Klemmung), in der Marken-Schrift. */}
          {open && localizedDescription && <p className={styles.fdText}>{localizedDescription}</p>}

          {/* Locked: Näherungs-Hinweis statt Beschreibung. */}
          {!open && (
            <div
              className={`${styles.fdProximity}${unlockError ? ` ${styles.fdProximityError}` : canUnlock ? ` ${styles.fdProximityReady}` : ` ${styles.fdProximityAway}`}`}
              role={unlockError ? 'alert' : 'status'}
              aria-live="polite"
            >
              <p className={styles.fdProximityHead}>
                {unlocking
                  ? t('map.revealSaving')
                  : unlockError
                    ? t('map.revealError')
                    : canUnlock
                      ? tMap('proximityHere')
                      : distance !== null
                        ? tMap('proximityAway', {
                            distance: formatLocalizedDistance(distance, lang),
                          })
                        : tMap('proximityCloser')}
              </p>
              {showDistanceMeter ? (
                <div className={styles.fdDistanceMeter} data-must-eat-distance-meter>
                  <div className={styles.fdDistanceTrack} aria-hidden="true">
                    <span
                      className={styles.fdDistanceFill}
                      style={{
                        ['--fd-distance-progress' as string]: `${Math.round((proximityProgress ?? 0) * 100)}%`,
                      }}
                    />
                  </div>
                  <p className={styles.fdDistanceCaption}>
                    {tMap('proximityDistanceGoal', { meters: UNLOCK_RADIUS_METERS })}
                  </p>
                </div>
              ) : (
                <p className={styles.fdProximitySub}>
                  {unlocking
                    ? t('map.revealSavingHint')
                    : unlockError
                      ? t('map.revealRetry')
                      : canUnlock
                        ? tMap('proximityTapReveal')
                        : lang === 'en'
                          ? <>Get within <span className={styles.fdDistanceBadge}>{UNLOCK_RADIUS_METERS} m</span> of the spot, then you can reveal the Must Eat.</>
                          : <>Komm auf <span className={styles.fdDistanceBadge}>{UNLOCK_RADIUS_METERS} m</span> an den Spot heran, dann kannst du das Must Eat aufdecken.</>}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Restaurant / price / Zum Spot — one thick stripe underneath. */}
        <div className={`${styles.fdRest} ${styles.fdRestInline}`}>
          {restaurantPhoto && (
            <img className={styles.fdRestPhoto} src={restaurantPhoto} alt="" aria-hidden="true" />
          )}
          <div className={styles.fdRestName}>
            <div className={styles.fdK}>{t('map.inRestaurant')}</div>
            <div className={styles.fdV}>{normalizeName(restaurantName)}</div>
          </div>
          {onViewRestaurant ? (
            <button type="button" className={styles.ctaPill} onClick={onViewRestaurant}>
              {t('map.toSpot')}
            </button>
          ) : (
            <Link href={`/restaurant/${mustEat.restaurant.slug}`} className={styles.ctaPill}>
              {t('map.toSpot')}
            </Link>
          )}
        </div>

        {(prevMustEat || nextMustEat) && (
          <div className={styles.fdPager} data-detail-pager aria-label="Must Eat wechseln">
            <button type="button" className={styles.fdPagerPrev} disabled={!prevMustEat} onClick={() => pageWithCard('prev')}>
              <span className={styles.fdPagerArrow}><PagerArrowIcon /></span>
              <span className={styles.fdPagerCopy}>
                <span className={styles.fdPagerLabel}>{previousLabel}</span>
                <span className={styles.fdPagerName}>{previousName}</span>
              </span>
            </button>
            <button type="button" className={styles.fdPagerNext} disabled={!nextMustEat} onClick={() => pageWithCard('next')}>
              <span className={styles.fdPagerCopy}>
                <span className={styles.fdPagerLabel}>{nextLabel}</span>
                <span className={styles.fdPagerName}>{nextName}</span>
              </span>
              <span className={styles.fdPagerArrow}><PagerArrowIcon /></span>
            </button>
          </div>
        )}

      </div>

      <div className={`${styles.fdRest} ${styles.fdRestDock}`} aria-hidden={false}>
        {restaurantPhoto && (
          <img className={styles.fdRestPhoto} src={restaurantPhoto} alt="" aria-hidden="true" />
        )}
        <div className={styles.fdRestName}>
          <div className={styles.fdK}>{t('map.inRestaurant')}</div>
          <div className={styles.fdV}>{normalizeName(restaurantName)}</div>
        </div>
        {onViewRestaurant ? (
          <button type="button" className={styles.ctaPill} onClick={onViewRestaurant}>
            {t('map.toSpot')}
          </button>
        ) : (
          <Link href={`/restaurant/${mustEat.restaurant.slug}`} className={styles.ctaPill}>
            {t('map.toSpot')}
          </Link>
        )}
      </div>
    </div>
  )
}
