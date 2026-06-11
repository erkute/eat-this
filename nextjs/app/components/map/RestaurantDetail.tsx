'use client'
import { useMemo, useRef, useState } from 'react'
import { useRestaurantDetail } from '@/lib/map/useRestaurantDetail'
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
import { BookmarkIcon, CloseIcon } from './icons'
import {
  classifyWebsite,
  formatPriceLabel,
  splitStatusLabel,
} from './restaurantDetail.helpers'
import { normalizeName } from '@/lib/normalizeName'
import { useSwipePager } from './useSwipePager'

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
          <img src={unlocked ? mustEat.image : '/pics/card-back.webp?v=6'} alt={unlocked ? mustEat.dish : ''} loading="lazy" />
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
  revealedMustEatIds: Set<string>
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
  revealedMustEatIds,
  userLocation,
  uid,
  userTier,
  onClose,
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
  const [shareDone, setShareDone] = useState(false)
  const scrollWrapRef = useRef<HTMLDivElement>(null)

  // The map list payload is now trimmed to hero/list fields; the editorial +
  // contact fields (address, phone, tip, description, …) load on demand when
  // the sheet opens and merge over the list object. Cached per slug, so paging
  // back or re-opening is instant. `r` is the merged view used for rendering.
  const detail = useRestaurantDetail(restaurant.slug)
  const r = useMemo(
    () => (detail ? { ...restaurant, ...detail } : restaurant),
    [restaurant, detail],
  )

  useSwipePager(scrollWrapRef, {
    onPrev: onPagePrev,
    onNext: onPageNext,
    hasPrev: !!prevRestaurant,
    hasNext: !!nextRestaurant,
  })

  const status = r.openingHours
    ? getOpenStatus(r.openingHours, new Date(), {
        open: t('map.open'),
        closed: t('map.closed'),
        opens: t('map.opens'),
        closes: t('map.closes'),
        unitH: t('map.unitsH'),
        unitMin: t('map.unitsMin'),
      })
    : { isOpen: false, label: '', minutesUntilChange: null }
  const { sub: statusSub } = splitStatusLabel(status.label)
  const hasHours = !!(r.openingHours && r.openingHours.length > 0)
  const closeTime = status.isOpen ? (statusSub.match(/(\d{1,2}:\d{2})/)?.[1] ?? null) : null
  const openTag = status.isOpen
    ? (closeTime ? `${t('map.open')} bis ${closeTime}` : t('map.open'))
    : t('map.closed')

  // Scale the hero name down for long single words so they fit on one line
  // (no ugly mid-word break). Upper bound ≈ heroWidth / (longestWord · 0.62).
  const displayName = normalizeName(r.name)
  const longestWord = displayName.split(/\s+/).reduce((m, w) => Math.max(m, w.length), 0)
  const nameMaxPx = Math.max(26, Math.min(56, Math.round(360 / (Math.max(longestWord, 1) * 0.62))))

  const district = abbreviateBezirk(r.bezirk?.name ?? r.district ?? null)

  const meters = userLocation
    ? haversineDistance(userLocation.lat, userLocation.lng, r.lat, r.lng)
    : null
  const walkingTime = meters !== null ? formatWalkingTime(meters) : null

  const priceLabel = formatPriceLabel(r)
  const cuisine = r.cuisineType ?? null

  const websiteInfo = classifyWebsite(r.website)
  let igHandle: string | null = null
  let igUrl: string | null = null
  if (r.instagramHandle) {
    igHandle = r.instagramHandle
    igUrl = `https://instagram.com/${r.instagramHandle}`
  } else if (websiteInfo?.kind === 'instagram') {
    igHandle = websiteInfo.handle
    igUrl = websiteInfo.url
  }

  // Single Maps button (mockup). Prefer a name+address Google search — it
  // always resolves to a result — over a possibly-stale curated mapsUrl.
  const mapsHref = r.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.name}, ${r.address}`)}`
    : (r.mapsUrl ?? null)

  // Split a single-line address ("Street 1, 10119 Berlin, Deutschland") into
  // street on line 1 and PLZ + city on line 2; drop the country.
  const addressLines = r.address
    ? (() => {
        const parts = r.address
          .split(',')
          .map((p) => p.trim())
          .filter((p) => p && !/^(deutschland|germany)$/i.test(p))
        const [street, ...rest] = parts
        return { street, locality: rest.join(', ') }
      })()
    : null

  const storyText = r.description ?? r.shortDescription ?? ''
  const hasStory = !!storyText
  const hasTipp = !!r.tip

  // Detect booking provider from host for the OpenTable lockup.
  let reservationProvider: string | null = null
  if (r.reservationUrl) {
    try {
      const host = new URL(r.reservationUrl).hostname.toLowerCase()
      if (host.includes('opentable')) reservationProvider = 'OpenTable'
      else if (host.includes('resy.com')) reservationProvider = 'Resy'
      else if (host.includes('thefork')) reservationProvider = 'TheFork'
      else if (host.includes('quandoo')) reservationProvider = 'Quandoo'
      else if (host.includes('bookatable')) reservationProvider = 'Bookatable'
      else if (host.includes('resmio')) reservationProvider = 'Resmio'
      else if (host.includes('sevenrooms')) reservationProvider = 'SevenRooms'
    } catch {}
  }

  const backLabel = locale === 'en' ? 'List' : 'Liste'

  const showBooster = userTier !== 'allBerlin'
  const isAnon = !uid
  const boosterHref = uid
    ? (locale === routing.defaultLocale ? '/#hub-packs' : `/${locale}#hub-packs`)
    : (locale === routing.defaultLocale ? '/login' : `/${locale}/login`)

  return (
    <div className={styles.detailV13} role="dialog" aria-label={r.name}>
      <div className={styles.detailV13Scroll} data-detail-scroll ref={scrollWrapRef}>

        {/* HERO — full-bleed photo, back-to-list pill, save bookmark, name. */}
        <header
          className={styles.rdHero}
          data-detail-hero
          style={r.photo ? { backgroundImage: `url(${r.photo})` } : undefined}
        >
          <div className={styles.rdHeroActions}>
            {onToggleFavorite && (
              <button
                type="button"
                className={`${styles.rdHeroSave} ${isFavorite ? styles.rdHeroSaveActive : ''}`}
                aria-label={isFavorite ? 'Remove from saved' : t('map.save')}
                aria-pressed={!!isFavorite}
                onClick={(e) => { e.stopPropagation(); onToggleFavorite() }}
              >
                <BookmarkIcon filled={!!isFavorite} />
              </button>
            )}
            <button type="button" className={styles.rdClose} aria-label={backLabel} onClick={onClose}>
              <CloseIcon />
            </button>
          </div>
          <div className={styles.rdOverlay}>
            <h1 className={styles.rdNameOv} style={{ ['--rd-name-max' as string]: `${nameMaxPx}px` }}>{displayName}</h1>
            <div className={styles.rdTagsOv}>
              {district && <span className={styles.rdTag}>{district}</span>}
              {cuisine && <span className={styles.rdTagAlt}>{cuisine}</span>}
              {hasHours && <span className={styles.rdTagAlt}>{openTag}</span>}
            </div>
          </div>
          {r.photoCredit && (
            <span className={styles.rdCredit}>
              {r.photoCreditUrl
                ? <a href={r.photoCreditUrl} target="_blank" rel="noopener noreferrer">{r.photoCredit}</a>
                : r.photoCredit}
            </span>
          )}
        </header>

        {/* PAGER — prev/next restaurant in the filtered list */}
        {(prevRestaurant || nextRestaurant) && (
          <nav className={styles.rdPager} aria-label="Restaurant pager">
            <button type="button" className={styles.rdPagerBtn} disabled={!prevRestaurant} onClick={onPagePrev}>
              {prevRestaurant && (
                <>
                  <svg className={styles.rdPagerArrow} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
                  <span className={styles.rdPagerName}>{normalizeName(prevRestaurant.name)}</span>
                </>
              )}
            </button>
            <button type="button" className={`${styles.rdPagerBtn} ${styles.rdPagerBtnRight}`} disabled={!nextRestaurant} onClick={onPageNext}>
              {nextRestaurant && (
                <>
                  <span className={styles.rdPagerName}>{normalizeName(nextRestaurant.name)}</span>
                  <svg className={styles.rdPagerArrow} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
                </>
              )}
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
            <p className={styles.rdTippText}>{r.tip}</p>
          </div>
        )}

        {/* MUST EATS — reveal state mirrors the map/list (unlocked OR proximity-revealed) */}
        {mustEats.length > 0 && (
          <section>
            <h2 className={styles.rdSecH}>Must Eats</h2>
            <ol className={styles.rdMustGrid}>
              {mustEats.slice(0, 4).map(m => (
                <MustEatMiniCard
                  key={m._id}
                  mustEat={m}
                  unlocked={unlockedIds.has(m._id) || revealedMustEatIds.has(m._id)}
                  onClick={() => onMustEatClick(m)}
                />
              ))}
            </ol>
          </section>
        )}

        {/* FACTS — opening hours shown in full, no expander */}
        <div className={styles.rdFacts}>
          {addressLines && (
            <div className={styles.rdRow}>
              <span className={styles.rdK}>{t('map.address')}</span>
              <span className={styles.rdV}>
                {addressLines.street}
                {addressLines.locality && (
                  <span className={styles.rdAddrLine}>{addressLines.locality}</span>
                )}
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
          {hasHours && (
            <div className={styles.rdRow}>
              <span className={styles.rdK}>{t('map.openingHours')}</span>
              <div className={`${styles.rdV} ${styles.rdHours}`}>
                {r.openingHours!.map((slot, i) => (
                  <div key={i} style={{ display: 'contents' }}>
                    <span className={styles.rdHoursD}>{slot.days}</span>
                    <span className={styles.rdHoursT}>{slot.hours}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {priceLabel && (
            <div className={styles.rdRow}>
              <span className={styles.rdK}>{t('map.price')}</span>
              <span className={styles.rdV}>{priceLabel}</span>
            </div>
          )}
          {r.phone && (
            <div className={styles.rdRow}>
              <span className={styles.rdK}>{t('map.phone')}</span>
              <span className={styles.rdV}><a href={`tel:${r.phone.replace(/\s+/g, '')}`}>{r.phone}</a></span>
            </div>
          )}
          {websiteInfo?.kind === 'web' && (
            <div className={styles.rdRow}>
              <span className={styles.rdK}>Website</span>
              <span className={styles.rdV}>
                <a href={websiteInfo.url} target="_blank" rel="noopener noreferrer">{websiteInfo.display}</a>
              </span>
            </div>
          )}
          {igUrl && (
            <div className={styles.rdRow}>
              <span className={styles.rdK}>Instagram</span>
              <span className={styles.rdV}>
                <a href={igUrl} target="_blank" rel="noopener noreferrer">{igHandle ? `@${igHandle}` : 'Profil ↗'}</a>
              </span>
            </div>
          )}
        </div>

        {/* ACTIONS — Maps + Teilen, 50/50 */}
        <div className={styles.rdActs}>
          {mapsHref && (
            <a className={`${styles.rdActBtn} ${styles.rdActPrimary}`} href={mapsHref} target="_blank" rel="noopener noreferrer">
              {t('map.maps')}
            </a>
          )}
          <button
            type="button"
            className={styles.rdActBtn}
            onClick={async () => {
              const url = typeof window !== 'undefined' ? window.location.href : ''
              const shareData = { title: r.name, text: r.name, url }
              // Native share sheet only on touch devices (mobile). Desktop
              // Chrome exposes navigator.share but it's a poor fit there — so
              // desktop always copies the link and shows a confirmation.
              const isTouch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
              if (isTouch && typeof navigator !== 'undefined' && 'share' in navigator) {
                try { await navigator.share(shareData); return } catch { return }
              }
              try {
                if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(url)
                else {
                  // readonly = no iOS keyboard; restore scroll after select() —
                  // the map page is 100lvh tall (URL-bar apron) and iOS scrolls
                  // it to "reveal" the focused textarea, which left every
                  // floating control sitting a bar-height too high.
                  const sx = window.scrollX, sy = window.scrollY
                  const ta = document.createElement('textarea')
                  ta.value = url; ta.readOnly = true
                  ta.style.position = 'fixed'; ta.style.top = '0'; ta.style.opacity = '0'
                  document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove()
                  window.scrollTo(sx, sy)
                }
              } catch {}
              setShareDone(true)
              window.setTimeout(() => setShareDone(false), 1800)
            }}
          >
            {shareDone ? (locale === 'en' ? 'Link copied ✓' : 'Link kopiert ✓') : t('map.share')}
          </button>
        </div>

        {/* RESERVIEREN — kept */}
        {r.reservationUrl && (
          <section className={styles.actions}>
            <a
              href={r.reservationUrl}
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
                  href={r.reservationUrl}
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

        {/* PACK PROMO — anon + starter only, qualitative (no counts) */}
        {showBooster && (
          <section className={styles.packPromo}>
            <div className={styles.packPromoCardWrap} aria-hidden="true">
              <img
                src={isAnon ? '/pics/booster/booster_free.webp' : '/pics/booster/booster_lunch.webp'}
                alt=""
                loading="lazy"
                className={styles.packPromoSingleCard}
              />
            </div>
            <div className={styles.packPromoCopy}>
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
