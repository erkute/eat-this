'use client'
import { useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import type { MapMustEat } from '@/lib/types'
import { Link } from '@/i18n/navigation'
import { formatDistance } from '@/lib/map'
import { useTranslations } from 'next-intl'
import { useTranslation } from '@/lib/i18n'
import { pickLocale } from '@/lib/i18n/pickLocale'
import { normalizeName } from '@/lib/normalizeName'
import styles from './map.module.css'
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
  const { distance, canUnlock, vibrateIntensity, tapping, revealOrigin, handleCardClick, handleCardZoom } = state
  const { name: restaurantName } = mustEat.restaurant
  const open = isUnlocked && !revealOrigin
  const nameRevealed = open && !nameBurning

  // Swipe anywhere on the sheet (hero, name, pager band) pages to the
  // neighbouring must-eat — same gesture as the restaurant detail.
  const rootRef = useRef<HTMLDivElement>(null)
  const topCardRef = useRef<HTMLDivElement>(null)
  const [cardHiddenForPage, setCardHiddenForPage] = useState(false)
  useLayoutEffect(() => {
    const target = topCardRef.current
    if (target) {
      target.style.transition = ''
      target.style.transform = ''
    }
    setCardHiddenForPage(false)
  }, [mustEat._id])
  useSwipePager(rootRef, {
    onPrev: onPagePrev,
    onNext: onPageNext,
    hasPrev: !!prevMustEat,
    hasNext: !!nextMustEat,
    transformRef: topCardRef,
    onPageOut: () => flushSync(() => setCardHiddenForPage(true)),
    animateIn: false,
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
    target.style.transition = 'transform .17s ease-out'
    target.style.transform = `translateX(${outX}px)`
    window.setTimeout(() => {
      flushSync(() => setCardHiddenForPage(true))
      page()
      target.style.transition = 'none'
      target.style.transform = ''
    }, 170)
  }

  return (
    <div
      ref={rootRef}
      className={`${styles.detailV13} ${styles.detailV13MustEat}`}
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
          aria-label={t('map.searchClose')}
          onClick={onClose}
        >
          <CloseIcon />
        </button>

        {/* HERO — freigestellte Karte mit Glow-Halo. Open: dish card (3D-Tilt
            via CSS, tap-to-zoom). Locked: card-back (flach + Wackeln, tap to
            reveal in range — flach bleibt wichtig für die Reveal-Fly-Origin). */}
        <div className={styles.fdHeroWrap}>
          <div className={styles.fdCardStack}>
            <img className={`${styles.fdStackCard} ${styles.fdStackCardOne}`} src={CARD_BACK} alt="" aria-hidden="true" />
            <img className={`${styles.fdStackCard} ${styles.fdStackCardTwo}`} src={CARD_BACK} alt="" aria-hidden="true" />
            <div className={`${styles.fdTopCard}${cardHiddenForPage ? ` ${styles.fdTopCardHidden}` : ''}`} ref={topCardRef}>
              {open ? (
                <button
                  type="button"
                  className={styles.fdHero}
                  onClick={handleCardZoom}
                  aria-label={t('map.zoomCard')}
                  /* Während des Zooms (inkl. Fly-Back) verstecken, sonst liegt die
                    Karte doppelt da — Zoom-Klon + statische Slot-Karte. */
                  style={state.zoomActive ? { visibility: 'hidden' } : undefined}
                >
                  <img src={mustEat.image} alt={mustEat.dish} />
                </button>
              ) : (
                <button
                  type="button"
                  className={`${styles.fdHero} ${styles.fdHeroLocked} ${canUnlock ? styles.mustEatCardCanUnlock : ''} ${tapping ? styles.mustEatCardTapping : ''}`}
                  onClick={handleCardClick}
                  aria-label={canUnlock ? t('map.revealHere') : t('map.tooFarToReveal')}
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
        <div className={styles.fdMid}>
          {/* Gericht-Name — unten im 2-Zeilen-Feld verankert, sitzt direkt über
              der Beschreibung; eine 2. Zeile füllt nach oben → nichts darunter
              springt. Locked: stark verschwommen (kein Stempel). */}
          <h1 className={styles.fdName} data-detail-hero aria-label={nameRevealed ? undefined : t('mustEats.covered')}>
            <span
              className={`${styles.fdNameText}${!open ? ` ${styles.fdNameBlur}` : ''}${nameBurning ? ` ${styles.fdNameUnblurring}` : ''}`}
              aria-hidden={nameRevealed ? undefined : true}
            >
              {mustEat.dish ? normalizeName(mustEat.dish) : t('mustEats.covered')}
            </span>
          </h1>

          {/* Beschreibung — komplett (keine Klemmung), in der Marken-Schrift. */}
          {open && localizedDescription && <p className={styles.fdText}>{localizedDescription}</p>}

          {/* Locked: Näherungs-Hinweis statt Beschreibung. */}
          {!open && (
            <div className={`${styles.fdProximity}${canUnlock ? ` ${styles.fdProximityReady}` : ` ${styles.fdProximityAway}`}`}>
              <p className={styles.fdProximityHead}>
                {canUnlock
                  ? tMap('proximityHere')
                  : distance !== null
                    ? tMap('proximityAway', { distance: formatDistance(distance) })
                    : tMap('proximityCloser')}
              </p>
              <p className={styles.fdProximitySub}>
                {canUnlock
                  ? tMap('proximityTapReveal')
                  : tMap('proximityHint', { meters: UNLOCK_RADIUS_METERS })}
              </p>
            </div>
          )}
        </div>

        {/* Restaurant / price / Zum Spot — one thick stripe underneath. */}
        <div className={styles.fdRest}>
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
                <span className={styles.fdPagerLabel}>{lang === 'en' ? 'Previous' : 'Zurück'}</span>
                <span className={styles.fdPagerName}>
                  {prevMustEat ? (prevUnlocked ? normalizeName(prevMustEat.dish ?? '') : t('mustEats.covered')) : ''}
                </span>
              </span>
            </button>
            <button type="button" className={styles.fdPagerNext} disabled={!nextMustEat} onClick={() => pageWithCard('next')}>
              <span className={styles.fdPagerCopy}>
                <span className={styles.fdPagerLabel}>{lang === 'en' ? 'Next' : 'Weiter'}</span>
                <span className={styles.fdPagerName}>
                  {nextMustEat ? (nextUnlocked ? normalizeName(nextMustEat.dish ?? '') : t('mustEats.covered')) : ''}
                </span>
              </span>
              <span className={styles.fdPagerArrow}><PagerArrowIcon /></span>
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
