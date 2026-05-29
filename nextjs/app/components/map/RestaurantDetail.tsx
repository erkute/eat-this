'use client'
import { useEffect, useRef, useState } from 'react'
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
import { CloseIcon, HeartIcon, ShareIcon } from './icons'
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
    <button
      type="button"
      className={styles.mustCardV13}
      onClick={onClick}
      aria-label={unlocked ? mustEat.dish : 'Locked Must Eat'}
    >
      {unlocked
        ? <div className={styles.mustCardImg} style={{ backgroundImage: `url(${mustEat.image})` }} />
        /* eslint-disable-next-line @next/next/no-img-element */
        : <img src="/pics/card-back.webp?v=5" alt="" className={styles.mustCardBack} loading="lazy" />
      }
    </button>
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
}

export default function RestaurantDetail({
  restaurant,
  mustEats,
  unlockedIds,
  userLocation,
  uid,
  userTier,
  onClose,
  onMustEatClick,
  isFavorite,
  onToggleFavorite,
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
  const showTabs = hasStory && hasTipp
  const [activeTab, setActiveTab] = useState<'story' | 'tipp'>(hasStory ? 'story' : 'tipp')


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
    ? (locale === routing.defaultLocale ? '/profile#booster' : `/${locale}/profile#booster`)
    : (locale === routing.defaultLocale ? '/login' : `/${locale}/login`)

  return (
    <div className={styles.detailV13} role="dialog" aria-label={restaurant.name}>
      <div className={styles.detailV13Scroll} data-detail-scroll>

        {/* 1. HERO — name + meta. data-detail-hero marks the block whose
            height the bottom-sheet measures to size the peek snap (so peek
            always shows everything above the photo, regardless of name
            wrap). Desktop icons sit absolutely inside the coral hero;
            mobile renders the same icons on the sheet handle. */}
        <header className={styles.heroYellow} data-detail-hero>
          <div className={styles.heroActionsDesktop}>
            <button
              type="button"
              className={`${styles.heroAction} ${styles.heroActionOnHandle}`}
              aria-label={t('map.share') ?? 'Teilen'}
              onClick={async () => {
                const url = typeof window !== 'undefined' ? window.location.href : ''
                const shareData = { title: restaurant.name, url }
                try {
                  if (typeof navigator !== 'undefined' && 'share' in navigator) {
                    await navigator.share(shareData)
                    return
                  }
                } catch {}
                try {
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    await navigator.clipboard.writeText(url)
                  }
                } catch {}
              }}
            >
              <ShareIcon />
            </button>
            {onToggleFavorite && (
              <button
                type="button"
                className={`${styles.heroAction} ${styles.heroActionOnHandle} ${isFavorite ? styles.heroActionSaved : ''}`}
                aria-label={isFavorite ? 'Remove from saved' : (t('map.save') ?? 'Speichern')}
                aria-pressed={!!isFavorite}
                onClick={(e) => { e.stopPropagation(); onToggleFavorite() }}
              >
                <HeartIcon filled={!!isFavorite} />
              </button>
            )}
            <button
              type="button"
              className={`${styles.heroAction} ${styles.heroActionOnHandle} ${styles.heroActionClose}`}
              aria-label="Close"
              onClick={onClose}
            >
              <CloseIcon />
            </button>
          </div>
          <h2 className={styles.heroName}>{normalizeName(restaurant.name)}</h2>
          <p className={styles.heroMeta}>
            {district && <span className={styles.heroDistrict}>{district}</span>}
            {(cuisine || priceLabel) && (
              <span className={styles.heroCuisine}>
                {cuisine}
                {priceLabel && <span className={styles.heroPrice}>{priceLabel}</span>}
              </span>
            )}
          </p>
        </header>

        {/* 3. PHOTO STRIP */}
        {restaurant.photo && (
          <figure className={styles.photoStrip}>
            <div
              className={styles.photoStripImg}
              style={{ backgroundImage: `url(${restaurant.photo})` }}
            />
            {restaurant.photoCredit && (
              <figcaption className={styles.photoStripTag}>
                {restaurant.photoCreditUrl ? (
                  <a href={restaurant.photoCreditUrl} target="_blank" rel="noopener noreferrer">
                    {restaurant.photoCredit}
                  </a>
                ) : (
                  restaurant.photoCredit
                )}
              </figcaption>
            )}
          </figure>
        )}

        {/* 4. INFO STRIP — editorial plaque, each row stamped with a mustard label */}
        {(statusMain || restaurant.address || restaurant.phone || igUrl) && (
          <section className={styles.infoStrip}>
            {statusMain && (
              <div className={styles.infoLine}>
                <span className={`${styles.infoLineLabel} ${status.isOpen ? styles.infoLineLabelOpen : ''}`}>{status.isOpen ? t('map.open') : t('map.closed')}</span>
                <div className={styles.infoLineBody}>
                  {restaurant.openingHours && restaurant.openingHours.length > 0 ? (
                    <details ref={statusDetailsRef} className={styles.statusDetails}>
                      <summary className={`${styles.statusLockup} ${status.isOpen ? '' : styles.statusLockupClosed}`}>
                        <span>{statusSub || statusMain}</span>
                        <svg className={styles.statusChevron} viewBox="0 0 10 6" aria-hidden="true">
                          <polyline points="1 1 5 5 9 1" />
                        </svg>
                      </summary>
                      <dl className={styles.infoHoursList}>
                        {restaurant.openingHours.map((slot, i) => (
                          <div key={i} className={styles.infoHoursRow}>
                            <dt>{slot.days}</dt>
                            <dd>{slot.hours}</dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                  ) : (
                    <span className={`${styles.statusLockup} ${status.isOpen ? '' : styles.statusLockupClosed}`}>
                      <span>{statusSub || statusMain}</span>
                    </span>
                  )}
                </div>
              </div>
            )}
            {restaurant.address && (
              <div className={styles.infoLine}>
                <span className={styles.infoLineLabel}>{t('map.address')}</span>
                <div className={styles.infoLineBody}>
                  <a
                    className={styles.addressLink}
                    href={addressMapsGoogleHref ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {restaurant.address}
                  </a>
                  <div className={styles.addressMeta}>
                    {walkingTime && (
                      <>
                        {walkingTime} {t('map.walkMinutes')}
                        <span className={styles.metaSep}>·</span>
                      </>
                    )}
                    <details ref={mapsDetailsRef} className={styles.metaMapsPop}>
                      <summary>{t('map.inMaps')}</summary>
                      <div className={styles.metaMapsPopMenu}>
                        {addressMapsAppleHref && (
                          <a href={addressMapsAppleHref} target="_blank" rel="noopener noreferrer">
                            {t('map.mapsApple')}
                          </a>
                        )}
                        {addressMapsGoogleHref && (
                          <a href={addressMapsGoogleHref} target="_blank" rel="noopener noreferrer">
                            {t('map.mapsGoogle')}
                          </a>
                        )}
                      </div>
                    </details>
                  </div>
                </div>
              </div>
            )}
            {restaurant.phone && (
              <div className={styles.infoLine}>
                <span className={styles.infoLineLabel}>{t('map.phone')}</span>
                <div className={styles.infoLineBody}>
                  <a className={styles.infoRowLink} href={`tel:${restaurant.phone.replace(/\s+/g, '')}`}>
                    {restaurant.phone}
                  </a>
                </div>
              </div>
            )}
            {igUrl && (
              <div className={styles.infoLine}>
                <span className={styles.infoLineLabel}>Instagram</span>
                <div className={styles.infoLineBody}>
                  <a className={styles.infoRowLink} href={igUrl} target="_blank" rel="noopener noreferrer">
                    {igHandle ? `@${igHandle}` : 'Profil ↗'}
                  </a>
                </div>
              </div>
            )}
          </section>
        )}

        {/* 5. TABS + PANELS */}
        {showTabs && (
          <div className={styles.tabs}>
            <button
              type="button"
              className={`${styles.tab} ${activeTab === 'story' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('story')}
            >
              <span>{t('map.tabStory')}</span>
            </button>
            <button
              type="button"
              className={`${styles.tab} ${activeTab === 'tipp' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('tipp')}
            >
              <span>{t('map.tabTipp')}</span>
            </button>
          </div>
        )}

        {(hasStory || hasTipp) && (
          <div className={styles.tabPanels}>
            {(activeTab === 'story' || !showTabs) && hasStory && (
              <div className={styles.tabPanel}>
                <div className={styles.storyProse}>
                  {storyText.split('\n\n').map((para, idx) => {
                    if (idx === 0 && para.length > 0) {
                      return (
                        <p key={idx}>
                          <span className={styles.dropCap}>{para[0]}</span>
                          {para.slice(1)}
                        </p>
                      )
                    }
                    return <p key={idx}>{para}</p>
                  })}
                </div>
              </div>
            )}

            {(activeTab === 'tipp' || (!hasStory && hasTipp)) && hasTipp && (
              <div className={styles.tabPanel}>
                <h4 className={styles.tipEyebrow}>{t('map.insiderTip')}</h4>
                <p className={styles.tipBody}>{restaurant.tip}</p>
              </div>
            )}
          </div>
        )}

        {/* Must-Eats — always shown regardless of tab. The visual hook of
            the page; hiding them behind a tab would be a regression. */}
        {mustEats.length > 0 && (
          <section className={`${styles.tabPanel} ${styles.mustSection}`}>
            <h3 className={styles.mustSectionH}>Eat This</h3>
            <ol className={styles.mustGridV13}>
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

        {/* 6. PACK PROMO — editorial ticket: asymmetric two-column with one
            big tilted booster card. Anon + starter only. */}
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

        {/* 7. ACTIONS — big coral Reservieren + OpenTable lockup */}
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

      </div>
    </div>
  )
}
