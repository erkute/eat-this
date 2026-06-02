'use client'
import { useEffect, useRef } from 'react'
import type { MapRestaurant, MapMustEat } from '@/lib/types'
import {
  abbreviateBezirk,
  formatWalkingTime,
  getOpenStatus,
  haversineDistance,
  type UserLocation,
  type UserTier,
} from '@/lib/map'
import { useTranslation } from '@/lib/i18n'
import { useLocale } from 'next-intl'
import { routing } from '@/i18n/routing'
import styles from './map.module.css'
import { HeartIcon } from './icons'
import {
  classifyWebsite,
  formatPriceLabel,
  splitStatusLabel,
} from './restaurantDetail.helpers'
import { normalizeName } from '@/lib/normalizeName'

function MustEatMiniCard({
  mustEat,
  unlocked,
  onClick,
}: { mustEat: MapMustEat; unlocked: boolean; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        className={styles.medish}
        onClick={onClick}
        aria-label={unlocked ? mustEat.dish : 'Locked Must Eat'}
      >
        <div className={styles.medishPh}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={unlocked ? mustEat.image : '/pics/card-back.webp?v=5'} alt={unlocked ? mustEat.dish : ''} loading="lazy" />
        </div>
        {!unlocked && (
          <div className={styles.medishLbl}>
            <h4 className={styles.medishNm}>Verdeckt</h4>
          </div>
        )}
      </button>
    </li>
  )
}

interface RestaurantDetailProps {
  restaurant: MapRestaurant
  mustEats: MapMustEat[]
  unlockedIds: Set<string>
  userLocation: UserLocation | null
  uid: string | null
  userTier: UserTier
  onClose: () => void
  onMustEatClick: (m: MapMustEat) => void
  isFavorite?: boolean
  onToggleFavorite?: () => void
  prevRestaurant?: MapRestaurant | null
  nextRestaurant?: MapRestaurant | null
  onPagePrev?: () => void
  onPageNext?: () => void
}

export default function RestaurantDetail({
  restaurant,
  mustEats,
  unlockedIds,
  userLocation,
  uid,
  userTier,
  onMustEatClick,
  isFavorite,
  onToggleFavorite,
  prevRestaurant,
  nextRestaurant,
  onPagePrev,
  onPageNext,
}: RestaurantDetailProps) {
  const { t } = useTranslation()
  const locale = useLocale()
  const mapsDetailsRef = useRef<HTMLDetailsElement>(null)
  const statusDetailsRef = useRef<HTMLDetailsElement>(null)

  // Native <details> only closes when you re-click its <summary>. Restaurants
  // expect popovers to dismiss on any outside click — wire that up for the
  // two disclosures (Maps chooser + hours expander).
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      for (const ref of [mapsDetailsRef, statusDetailsRef]) {
        const el = ref.current
        if (el && el.open && !el.contains(e.target as Node)) el.open = false
      }
    }
    document.addEventListener('pointerdown', onDocClick)
    return () => document.removeEventListener('pointerdown', onDocClick)
  }, [])

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
  const { main: statusMain, sub: statusSub } = splitStatusLabel(status.label)

  const district = abbreviateBezirk(restaurant.bezirk?.name ?? restaurant.district ?? null)

  const meters = userLocation
    ? haversineDistance(userLocation.lat, userLocation.lng, restaurant.lat, restaurant.lng)
    : null
  const walkingTime = meters !== null ? formatWalkingTime(meters) : null

  const priceLabel = formatPriceLabel(restaurant)
  const cuisine = restaurant.cuisineType ?? null

  const websiteInfo = classifyWebsite(restaurant.website)
  let igHandle: string | null = null
  let igUrl: string | null = null
  if (restaurant.instagramHandle) {
    igHandle = restaurant.instagramHandle
    igUrl = `https://instagram.com/${restaurant.instagramHandle}`
  } else if (websiteInfo?.kind === 'instagram') {
    igHandle = websiteInfo.handle
    igUrl = websiteInfo.url
  }

  const addressMapsAppleHref = restaurant.address
    ? `https://maps.apple.com/?q=${encodeURIComponent(restaurant.address)}`
    : null
  const addressMapsGoogleHref =
    restaurant.mapsUrl ||
    (restaurant.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address)}`
      : null)

  const storyText = restaurant.description ?? restaurant.shortDescription ?? ''
  const hasStory = !!storyText
  const hasTipp = !!restaurant.tip

  // Detect booking provider from host for the OpenTable lockup.
  let reservationProvider: string | null = null
  if (restaurant.reservationUrl) {
    try {
      const host = new URL(restaurant.reservationUrl).hostname.toLowerCase()
      if (host.includes('opentable')) reservationProvider = 'OpenTable'
      else if (host.includes('resy.com')) reservationProvider = 'Resy'
      else if (host.includes('thefork')) reservationProvider = 'TheFork'
      else if (host.includes('quandoo')) reservationProvider = 'Quandoo'
      else if (host.includes('bookatable')) reservationProvider = 'Bookatable'
      else if (host.includes('resmio')) reservationProvider = 'Resmio'
      else if (host.includes('sevenrooms')) reservationProvider = 'SevenRooms'
    } catch {}
  }

  const showBooster = userTier !== 'allBerlin'
  const isAnon = !uid
  const boosterHref = uid
    ? (locale === routing.defaultLocale ? '/home#hub-packs' : `/${locale}/home#hub-packs`)
    : (locale === routing.defaultLocale ? '/login' : `/${locale}/login`)

  return (
    <div className={styles.detailV13} role="dialog" aria-label={restaurant.name}>
      <div className={styles.detailV13Scroll} data-detail-scroll>

        {/* HERO — full-bleed photo, name overlay, save heart. data-detail-hero
            marks the block the bottom-sheet measures for the peek snap. */}
        <header
          className={styles.rdHero}
          data-detail-hero
          style={restaurant.photo ? { backgroundImage: `url(${restaurant.photo})` } : undefined}
        >
          {onToggleFavorite && (
            <button
              type="button"
              className={`${styles.rdHeroSave} ${isFavorite ? styles.rdHeroSaveActive : ''}`}
              aria-label={isFavorite ? 'Remove from saved' : t('map.save')}
              aria-pressed={!!isFavorite}
              onClick={(e) => { e.stopPropagation(); onToggleFavorite() }}
            >
              <HeartIcon filled={!!isFavorite} />
            </button>
          )}
          <div className={styles.rdOverlay}>
            <h1 className={styles.rdNameOv}>{normalizeName(restaurant.name)}</h1>
            <div className={styles.rdTagsOv}>
              {district && <span className={styles.rdTag}>{district}</span>}
              {cuisine && <span className={styles.rdTagAlt}>{cuisine}</span>}
              {statusMain && (
                <span className={styles.rdTagAlt}>{status.isOpen ? t('map.open') : t('map.closed')}</span>
              )}
            </div>
          </div>
          {restaurant.photoCredit && (
            <span className={styles.rdCredit}>
              {restaurant.photoCreditUrl
                ? <a href={restaurant.photoCreditUrl} target="_blank" rel="noopener noreferrer">{restaurant.photoCredit}</a>
                : restaurant.photoCredit}
            </span>
          )}
        </header>

        {/* PAGER — prev/next restaurant in the filtered list */}
        {(prevRestaurant || nextRestaurant) && (
          <nav className={styles.rdPager} aria-label="Restaurant pager">
            <button type="button" className={styles.rdPagerBtn} disabled={!prevRestaurant} onClick={onPagePrev}>
              {prevRestaurant ? `← ${normalizeName(prevRestaurant.name)}` : ''}
            </button>
            <button type="button" className={`${styles.rdPagerBtn} ${styles.rdPagerBtnRight}`} disabled={!nextRestaurant} onClick={onPageNext}>
              {nextRestaurant ? `${normalizeName(nextRestaurant.name)} →` : ''}
            </button>
          </nav>
        )}

        {/* BODY — story prose with drop cap */}
        {hasStory && (
          <div className={styles.rdBody}>
            {storyText.split('\n\n').map((para, idx) =>
              idx === 0 && para.length > 0
                ? <p key={idx}><span className={styles.rdDropCap}>{para[0]}</span>{para.slice(1)}</p>
                : <p key={idx}>{para}</p>
            )}
          </div>
        )}

        {/* INSIDER TIPP */}
        {hasTipp && (
          <div className={styles.rdTipp}>
            <span className={styles.rdTippLabel}>{t('map.insiderTip')}</span>
            <p className={styles.rdTippText}>{restaurant.tip}</p>
          </div>
        )}

        {/* FACTS */}
        <div className={styles.rdFacts}>
          {restaurant.address && (
            <div className={styles.rdRow}>
              <span className={styles.rdK}>{t('map.address')}</span>
              <span className={styles.rdV}>
                <a href={addressMapsGoogleHref ?? '#'} target="_blank" rel="noopener noreferrer">{restaurant.address}</a>
                {walkingTime && <span className={styles.rdVMeta}>{walkingTime} {t('map.walkMinutes')}</span>}
              </span>
            </div>
          )}
          {cuisine && (
            <div className={styles.rdRow}>
              <span className={styles.rdK}>{t('map.category')}</span>
              <span className={styles.rdV}>{cuisine}</span>
            </div>
          )}
          {restaurant.openingHours && restaurant.openingHours.length > 0 && (
            <div className={styles.rdRow}>
              <span className={styles.rdK}>{t('map.openingHours')}</span>
              <details className={styles.rdV} ref={statusDetailsRef}>
                <summary>{status.isOpen ? t('map.open') : t('map.closed')}{statusSub ? ` · ${statusSub}` : ''}</summary>
                <div className={styles.rdHours}>
                  {restaurant.openingHours.map((slot, i) => (
                    <div key={i} style={{ display: 'contents' }}>
                      <span className={styles.rdHoursD}>{slot.days}</span>
                      <span className={styles.rdHoursT}>{slot.hours}</span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
          {priceLabel && (
            <div className={styles.rdRow}>
              <span className={styles.rdK}>{t('map.price')}</span>
              <span className={styles.rdV}>{priceLabel}</span>
            </div>
          )}
          {restaurant.phone && (
            <div className={styles.rdRow}>
              <span className={styles.rdK}>{t('map.phone')}</span>
              <span className={styles.rdV}><a href={`tel:${restaurant.phone.replace(/\s+/g, '')}`}>{restaurant.phone}</a></span>
            </div>
          )}
          {igUrl && (
            <div className={styles.rdRow}>
              <span className={styles.rdK}>Instagram</span>
              <span className={styles.rdV}><a href={igUrl} target="_blank" rel="noopener noreferrer">{igHandle ? `@${igHandle}` : 'Profil ↗'}</a></span>
            </div>
          )}
        </div>

        {/* ACTIONS — Maps (popover) + Teilen */}
        <div className={styles.rdActs}>
          {(addressMapsAppleHref || addressMapsGoogleHref) && (
            <details className={styles.rdMapsPop} ref={mapsDetailsRef}>
              <summary className={`${styles.rdActBtn} ${styles.rdActPrimary}`}>{t('map.maps')}</summary>
              <div className={styles.rdMapsPopMenu}>
                {addressMapsAppleHref && <a href={addressMapsAppleHref} target="_blank" rel="noopener noreferrer">{t('map.mapsApple')}</a>}
                {addressMapsGoogleHref && <a href={addressMapsGoogleHref} target="_blank" rel="noopener noreferrer">{t('map.mapsGoogle')}</a>}
              </div>
            </details>
          )}
          <button
            type="button"
            className={styles.rdActBtn}
            onClick={async () => {
              const url = typeof window !== 'undefined' ? window.location.href : ''
              try { if (typeof navigator !== 'undefined' && 'share' in navigator) { await navigator.share({ title: restaurant.name, url }); return } } catch {}
              try { if (typeof navigator !== 'undefined' && navigator.clipboard) { await navigator.clipboard.writeText(url) } } catch {}
            }}
          >
            {t('map.share')}
          </button>
        </div>

        {/* RESERVIEREN — kept */}
        {restaurant.reservationUrl && (
          <section className={styles.actions}>
            <a
              href={restaurant.reservationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btnPrimary}
            >
              <span className={styles.btnPrimaryLbl}>{t('map.reserve')}</span>
              <svg className={styles.btnPrimaryArr} viewBox="0 0 24 18" aria-hidden="true">
                <line x1="2" y1="9" x2="20" y2="9" />
                <polyline points="14 3 20 9 14 15" />
              </svg>
            </a>
            {reservationProvider === 'OpenTable' && (
              <div className={styles.ctaFoot}>
                <a
                  href={restaurant.reservationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.opentableLockup}
                >
                  <span className={styles.otMark}>ot</span>
                  <span className={styles.otWord}>OpenTable</span>
                </a>
              </div>
            )}
          </section>
        )}

        {/* MUST EATS */}
        {mustEats.length > 0 && (
          <section>
            <h2 className={styles.rdSecH}>Must Eats</h2>
            <ol className={styles.rdMustGrid}>
              {mustEats.slice(0, 4).map(m => (
                <MustEatMiniCard
                  key={m._id}
                  mustEat={m}
                  unlocked={unlockedIds.has(m._id)}
                  onClick={() => onMustEatClick(m)}
                />
              ))}
            </ol>
          </section>
        )}

        {/* PACK PROMO — editorial ticket, anon + starter only */}
        {showBooster && (
          <section className={styles.packPromo}>
            <div className={styles.packPromoCardWrap} aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={isAnon ? '/pics/booster/booster_free.webp' : '/pics/booster/booster_lunch.webp'}
                alt=""
                loading="lazy"
                className={styles.packPromoSingleCard}
              />
            </div>
            <div className={styles.packPromoCopy}>
              {isAnon && (
                <p className={styles.packPromoEyebrow}>+20 Spots</p>
              )}
              <h3 className={styles.packPromoTitle}>
                {isAnon ? t('map.starterPromoTitle') : t('map.boosterTitle')}
              </h3>
              <p className={styles.packPromoBody}>
                {isAnon ? t('map.starterPromoBody') : t('map.boosterDesc')}
              </p>
              <div className={styles.packPromoActions}>
                <a href={boosterHref} className={styles.btnPackPromo}>
                  <span className={styles.btnPackPromoLbl}>
                    {isAnon ? t('map.starterCta') : t('map.boosterCta')}
                  </span>
                  {!isAnon && (
                    <span className={styles.btnPackPromoTag}>
                      {t('map.boosterPriceTag')}
                      <svg viewBox="0 0 24 18" aria-hidden="true">
                        <line x1="2" y1="9" x2="20" y2="9" />
                        <polyline points="14 3 20 9 14 15" />
                      </svg>
                    </span>
                  )}
                </a>
                {isAnon && (
                  <a href={boosterHref} className={styles.linkPromo}>
                    {t('map.starterPromoLogin')}
                  </a>
                )}
              </div>
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
