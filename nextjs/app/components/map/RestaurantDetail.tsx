'use client';
import type { CSSProperties } from 'react';
import { useMemo, useRef, useState } from 'react';
import { useRestaurantDetail, type RestaurantGalleryImage } from '@/lib/map/useRestaurantDetail';
import type { MapRestaurant, MapMustEat } from '@/lib/types';
import {
  abbreviateBezirk,
  formatWalkingTime,
  getOpenStatus,
  haversineDistance,
  type UserLocation,
  type UserTier,
} from '@/lib/map';
import { useTranslation } from '@/lib/i18n';
import { useLocale } from 'next-intl';
import { routing } from '@/i18n/routing';
import styles from './map.module.css';
import { HeartIcon, CloseIcon } from './icons';
import { useHeartCount } from '@/lib/map/useHeartCount';
import { heartCountShort } from '@/lib/map/heartLabel';
import { classifyWebsite, formatPriceLabel, splitStatusLabel } from './restaurantDetail.helpers';
import { normalizeName } from '@/lib/normalizeName';
import { useSwipePager } from './useSwipePager';
import RestaurantGallery from './RestaurantGallery';
import { trackEvent } from '@/lib/analytics';

const DAY_ALIASES: Record<string, number> = {
  su: 0,
  sun: 0,
  sunday: 0,
  so: 0,
  mo: 1,
  mon: 1,
  monday: 1,
  tu: 2,
  tue: 2,
  tuesday: 2,
  di: 2,
  we: 3,
  wed: 3,
  wednesday: 3,
  mi: 3,
  th: 4,
  thu: 4,
  thursday: 4,
  do: 4,
  fr: 5,
  fri: 5,
  friday: 5,
  sa: 6,
  sat: 6,
  saturday: 6,
};

const DAY_LABELS = {
  de: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
} as const;

function localizeOpeningDays(days: string, locale: string) {
  const lang = locale === 'en' ? 'en' : 'de';
  const labels = DAY_LABELS[lang];
  return days
    .split(',')
    .map((group) => {
      const parts = group
        .trim()
        .split(/[–-]/)
        .map((part) => part.trim());
      const localized = parts.map((part) => {
        const idx = DAY_ALIASES[part.toLowerCase()];
        return idx === undefined ? part : labels[idx];
      });
      return localized.join('–');
    })
    .join(', ');
}

function localizeOpeningHours(hours: string, locale: string) {
  if (/closed|ruhetag|geschlossen/i.test(hours)) {
    return locale === 'en' ? 'closed' : 'geschlossen';
  }
  return hours;
}

function MustEatMiniCard({
  mustEat,
  unlocked,
  onClick,
}: {
  mustEat: MapMustEat;
  unlocked: boolean;
  onClick: () => void;
}) {
  const dish = mustEat.dish ?? 'Must Eat';

  return (
    <li>
      <button
        type="button"
        className={styles.medish}
        onClick={onClick}
        aria-label={unlocked ? dish : 'Locked Must Eat'}
      >
        <div className={styles.medishPh}>
          <img
            src={unlocked && mustEat.image ? mustEat.image : '/pics/card-back.webp?v=6'}
            alt={unlocked ? dish : ''}
            loading="lazy"
          />
        </div>
      </button>
    </li>
  );
}

interface RestaurantDetailProps {
  restaurant: MapRestaurant;
  mustEats: MapMustEat[];
  unlockedIds: Set<string>;
  revealedMustEatIds: Set<string>;
  userLocation: UserLocation | null;
  uid: string | null;
  userTier: UserTier;
  onClose: () => void;
  onMustEatClick: (m: MapMustEat) => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  prevRestaurant?: MapRestaurant | null;
  nextRestaurant?: MapRestaurant | null;
  onPagePrev?: () => void;
  onPageNext?: () => void;
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
  const { t } = useTranslation();
  const locale = useLocale();
  const { count: heartCount } = useHeartCount(restaurant._id);
  const [shareDone, setShareDone] = useState(false);
  const scrollWrapRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);

  // The map list payload is now trimmed to hero/list fields; the editorial +
  // contact fields (address, phone, tip, description, …) load on demand when
  // the sheet opens and merge over the list object. Cached per slug, so paging
  // back or re-opening is instant. `r` is the merged view used for rendering.
  const { detail, loading: detailLoading } = useRestaurantDetail(restaurant.slug);
  const r = useMemo(
    () => (detail ? { ...restaurant, ...detail } : restaurant),
    [restaurant, detail]
  );

  useSwipePager(scrollWrapRef, {
    onPrev: onPagePrev,
    onNext: onPageNext,
    hasPrev: !!prevRestaurant,
    hasNext: !!nextRestaurant,
    // Preview + page-animate ONLY the hero (like the must-eat card), not the
    // whole scroll container. Without this the entire article slid sideways on
    // a horizontal swipe — title/tags clipped, page-bg gap on the far edge
    // ("das Bild lässt sich nach links/rechts bewegen", User 2026-07-04). The
    // hero is the "card" that pages; the article underneath swaps in place.
    transformRef: heroRef,
  });

  const status = r.openingHours
    ? getOpenStatus(r.openingHours, new Date(), {
        open: t('map.open'),
        closed: t('map.closed'),
        opens: t('map.opens'),
        closes: t('map.closes'),
        unitH: t('map.unitsH'),
        unitMin: t('map.unitsMin'),
      })
    : { isOpen: false, label: '', minutesUntilChange: null };
  const { sub: statusSub } = splitStatusLabel(status.label);
  const hasHours = !!(r.openingHours && r.openingHours.length > 0);
  const closeTime = status.isOpen ? (statusSub.match(/(\d{1,2}:\d{2})/)?.[1] ?? null) : null;
  const openTag = status.isOpen
    ? closeTime
      ? `${t('map.open')} ${locale === 'en' ? 'till' : 'bis'} ${closeTime}`
      : t('map.open')
    : t('map.closed');

  // Scale the hero name down for long single words so they fit on one line
  // (no ugly mid-word break). Upper bound ≈ usableWidth / (longestWord · 0.62).
  // Budget is the REAL hero text width on desktop (~285px inside the 360px
  // panel), not the old 360 — that was too optimistic and only survived with
  // narrow Schoolbell; a wider display font overflowed and the
  // last letter got clipped by the hero's overflow:hidden (e.g. "Schüsseldienst").
  const displayName = normalizeName(r.name);
  const longestWord = displayName.split(/\s+/).reduce((m, w) => Math.max(m, w.length), 0);
  const nameMaxPx = Math.max(26, Math.min(56, Math.round(311 / (Math.max(longestWord, 1) * 0.62))));

  const district = abbreviateBezirk(r.bezirk?.name ?? r.district ?? null);

  const meters = userLocation
    ? haversineDistance(userLocation.lat, userLocation.lng, r.lat, r.lng)
    : null;
  const walkingTime = meters !== null ? formatWalkingTime(meters) : null;

  const priceLabel = formatPriceLabel(r);
  const cuisine = r.cuisineType ?? null;

  const websiteInfo = classifyWebsite(r.website);
  let igHandle: string | null = null;
  let igUrl: string | null = null;
  if (r.instagramHandle) {
    igHandle = r.instagramHandle;
    igUrl = `https://instagram.com/${r.instagramHandle}`;
  } else if (websiteInfo?.kind === 'instagram') {
    igHandle = websiteInfo.handle;
    igUrl = websiteInfo.url;
  }

  // Single Maps button (mockup). Prefer a name+address Google search — it
  // always resolves to a result — over a possibly-stale curated mapsUrl.
  const mapsHref = r.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${r.name}, ${r.address}`)}`
    : (r.mapsUrl ?? null);

  // Split a single-line address ("Street 1, 10119 Berlin, Deutschland") into
  // street on line 1 and PLZ + city on line 2; drop the country.
  const addressLines = r.address
    ? (() => {
        const parts = r.address
          .split(',')
          .map((p) => p.trim())
          .filter((p) => p && !/^(deutschland|germany)$/i.test(p));
        const [street, ...rest] = parts;
        return { street, locality: rest.join(', ') };
      })()
    : null;

  const storyText = r.description ?? r.shortDescription ?? '';
  const hasStory = !!storyText;
  const hasTipp = !!r.tip;

  // Detect booking provider from host for the OpenTable lockup.
  let reservationProvider: string | null = null;
  if (r.reservationUrl) {
    try {
      const host = new URL(r.reservationUrl).hostname.toLowerCase();
      if (host.includes('opentable')) reservationProvider = 'OpenTable';
      else if (host.includes('resy.com')) reservationProvider = 'Resy';
      else if (host.includes('thefork')) reservationProvider = 'TheFork';
      else if (host.includes('quandoo')) reservationProvider = 'Quandoo';
      else if (host.includes('bookatable')) reservationProvider = 'Bookatable';
      else if (host.includes('resmio')) reservationProvider = 'Resmio';
      else if (host.includes('sevenrooms')) reservationProvider = 'SevenRooms';
    } catch {}
  }

  const backLabel = locale === 'en' ? 'List' : 'Liste';

  const showBooster = userTier !== 'allBerlin';
  const isAnon = !uid;
  const boosterHref = uid
    ? locale === routing.defaultLocale
      ? '/packs'
      : `/${locale}/packs`
    : locale === routing.defaultLocale
      ? '/login'
      : `/${locale}/login`;

  const galleryImages = useMemo<RestaurantGalleryImage[]>(() => {
    const images: RestaurantGalleryImage[] = [];
    const seen = new Set<string>();

    const add = (img: RestaurantGalleryImage) => {
      if (!img.thumb || !img.full) return;
      const key = img.full || img.thumb;
      if (seen.has(key)) return;
      seen.add(key);
      images.push(img);
    };

    if (r.photo) {
      add({
        _key: 'hero-photo',
        thumb: r.photo,
        full: r.photo,
        alt: displayName,
        credit: r.photoCredit,
        creditUrl: r.photoCreditUrl,
      });
    }

    for (const img of detail?.gallery ?? []) add(img);

    return images;
  }, [detail?.gallery, displayName, r.photo, r.photoCredit, r.photoCreditUrl]);

  const heroStyle = r.photo
    ? ({
        '--rd-hero-image': `url(${JSON.stringify(r.photo)})`,
        backgroundImage: `url(${r.photo})`,
      } as CSSProperties)
    : undefined;

  return (
    <div className={styles.detailV13} role="dialog" aria-label={r.name}>
      <div className={styles.detailV13Scroll} data-detail-scroll ref={scrollWrapRef}>
        {/* HERO — full-bleed photo, save bookmark, name. */}
        <header className={styles.rdHero} data-detail-hero style={heroStyle} ref={heroRef}>
          <button
            type="button"
            className={styles.rdCloseGlass}
            aria-label={backLabel}
            onClick={onClose}
          >
            <CloseIcon />
          </button>

          {/* Merged heart toggle + public count — one frosted pill, top-left.
              Outline white heart when you haven't hearted it, filled coral when
              you have; the number is the public count (≥ 1). Tapping toggles. */}
          {onToggleFavorite && (
            <button
              type="button"
              className={`${styles.rdHeartToggle} ${isFavorite ? styles.rdHeartToggleOn : ''}`}
              aria-label={
                isFavorite
                  ? locale === 'en'
                    ? 'Remove heart'
                    : 'Herz entfernen'
                  : locale === 'en'
                    ? 'Heart this spot'
                    : 'Spot herzen'
              }
              aria-pressed={!!isFavorite}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite();
              }}
            >
              <HeartIcon filled={!!isFavorite} />
              {heartCount >= 1 && (
                <span className={styles.rdHeartToggleCount}>
                  {heartCountShort(heartCount, locale)}
                </span>
              )}
            </button>
          )}
          <div className={styles.rdOverlay}>
            <h1
              className={styles.rdNameOv}
              style={{ ['--rd-name-max' as string]: `${nameMaxPx}px` }}
            >
              {displayName}
            </h1>
            <div className={styles.rdTagsOv}>
              {district && <span className={styles.rdTag}>{district}</span>}
              {cuisine && <span className={styles.rdTagAlt}>{cuisine}</span>}
              {hasHours && (
                <span className={`${styles.rdTagAlt} ${status.isOpen ? styles.rdTagOpen : ''}`}>
                  {openTag}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* PAGER — prev/next restaurant in the filtered list */}
        {(prevRestaurant || nextRestaurant) && (
          <nav className={styles.rdPager} data-detail-pager aria-label="Restaurant pager">
            <button
              type="button"
              className={styles.rdPagerBtn}
              disabled={!prevRestaurant}
              onClick={onPagePrev}
            >
              {prevRestaurant && (
                <>
                  <svg
                    className={styles.rdPagerArrow}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M15 6l-6 6 6 6" />
                  </svg>
                  <span className={styles.rdPagerCopy}>
                    <span className={styles.rdPagerName}>{normalizeName(prevRestaurant.name)}</span>
                  </span>
                </>
              )}
            </button>
            <button
              type="button"
              className={`${styles.rdPagerBtn} ${styles.rdPagerBtnRight}`}
              disabled={!nextRestaurant}
              onClick={onPageNext}
            >
              {nextRestaurant && (
                <>
                  <span className={styles.rdPagerCopy}>
                    <span className={styles.rdPagerName}>{normalizeName(nextRestaurant.name)}</span>
                  </span>
                  <svg
                    className={styles.rdPagerArrow}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </>
              )}
            </button>
          </nav>
        )}

        {/* GALLERY — curated Places photos, lazy via the same detail fetch */}
        {!!galleryImages.length && (
          <RestaurantGallery images={galleryImages} restaurantName={displayName} />
        )}

        {/* BODY — story prose with drop cap. While the on-demand detail fetch
            is still in flight, hold the space with skeleton lines so the
            sections below don't jump up and the text doesn't pop in. */}
        {hasStory ? (
          <div className={styles.rdBody}>
            {storyText.split('\n\n').map((para, idx) =>
              idx === 0 && para.length > 0 ? (
                <p key={idx}>
                  <span className={styles.rdDropCap}>{para[0]}</span>
                  {para.slice(1)}
                </p>
              ) : (
                <p key={idx}>{para}</p>
              )
            )}
          </div>
        ) : detailLoading ? (
          <div className={`${styles.rdBody} ${styles.rdBodySkel}`} aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
        ) : null}

        {/* INSIDER TIPP */}
        {hasTipp && (
          <div className={styles.rdTipp}>
            <span className={styles.rdTippLabel}>{t('map.insiderTip')}</span>
            <p className={styles.rdTippText}>{r.tip}</p>
          </div>
        )}

        {/* MUST EATS — reveal state mirrors the map/list (unlocked OR proximity-revealed) */}
        {mustEats.length > 0 && (
          <section className={styles.rdMustSection}>
            <div className={styles.rdMustHead}>
              <h2 className={styles.rdSecH}>Must Eats</h2>
            </div>
            <ol className={styles.rdMustGrid}>
              {mustEats.slice(0, 4).map((m) => (
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
                {walkingTime && (
                  <span className={styles.rdVMeta}>
                    {walkingTime} {t('map.walkMinutes')}
                  </span>
                )}
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
            <div className={`${styles.rdRow} ${styles.rdRowHours}`}>
              <span className={styles.rdK}>{t('map.openingHours')}</span>
              <div className={`${styles.rdV} ${styles.rdHours}`}>
                {r.openingHours!.map((slot, i) => (
                  <div key={i} style={{ display: 'contents' }}>
                    <span className={styles.rdHoursD}>
                      {localizeOpeningDays(slot.days, locale)}
                    </span>
                    <span className={styles.rdHoursT}>
                      {localizeOpeningHours(slot.hours, locale)}
                    </span>
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
              <span className={styles.rdV}>
                <a
                  className={styles.rdContactPlainLink}
                  href={`tel:${r.phone.replace(/\s+/g, '')}`}
                >
                  {r.phone}
                </a>
              </span>
            </div>
          )}
          {websiteInfo?.kind === 'web' && (
            <div className={styles.rdRow}>
              <span className={styles.rdK}>Website</span>
              <span className={styles.rdV}>
                <a
                  className={styles.rdContactPlainLink}
                  href={websiteInfo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {websiteInfo.display}
                </a>
              </span>
            </div>
          )}
          {igUrl && (
            <div className={styles.rdRow}>
              <span className={styles.rdK}>Instagram</span>
              <span className={`${styles.rdV} ${styles.rdVHandle}`}>
                <a
                  className={styles.rdContactPlainLink}
                  href={igUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {igHandle ? `@${igHandle}` : 'Profil ↗'}
                </a>
              </span>
            </div>
          )}
        </div>

        {/* ACTIONS — menu joins Maps + Teilen when an official URL exists. */}
        <div className={styles.rdActs}>
          {mapsHref && (
            <a
              className={`${styles.rdActBtn} ${styles.rdActPrimary}`}
              href={mapsHref}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() =>
                trackEvent('restaurant_maps_clicked', {
                  restaurant_id: r._id,
                  restaurant_slug: r.slug,
                })
              }
            >
              <span>{t('map.maps')}</span>
            </a>
          )}
          {r.menuUrl && (
            <a
              className={styles.rdActBtn}
              href={r.menuUrl}
              target="_blank"
              rel="noopener nofollow noreferrer"
              onClick={() =>
                trackEvent('restaurant_menu_clicked', {
                  restaurant_id: r._id,
                  restaurant_slug: r.slug,
                })
              }
            >
              <span>{locale === 'en' ? 'Menu' : 'Speisekarte'}</span>
            </a>
          )}
          <button
            type="button"
            className={styles.rdActBtn}
            onClick={async () => {
              const url = typeof window !== 'undefined' ? window.location.href : '';
              const shareData = { title: r.name, text: r.name, url };
              // Native share sheet only on touch devices (mobile). Desktop
              // Chrome exposes navigator.share but it's a poor fit there — so
              // desktop always copies the link and shows a confirmation.
              const isTouch =
                typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
              if (isTouch && typeof navigator !== 'undefined' && 'share' in navigator) {
                try {
                  await navigator.share(shareData);
                  trackEvent('share', {
                    content_type: 'restaurant',
                    item_id: r.slug,
                    method: 'native',
                  });
                  return;
                } catch {
                  return;
                }
              }
              try {
                if (navigator?.clipboard?.writeText) await navigator.clipboard.writeText(url);
                else {
                  // readonly = no iOS keyboard; restore scroll after select() —
                  // the map page is 100lvh tall (URL-bar apron) and iOS scrolls
                  // it to "reveal" the focused textarea, which left every
                  // floating control sitting a bar-height too high.
                  const sx = window.scrollX,
                    sy = window.scrollY;
                  const ta = document.createElement('textarea');
                  ta.value = url;
                  ta.readOnly = true;
                  ta.style.position = 'fixed';
                  ta.style.top = '0';
                  ta.style.opacity = '0';
                  document.body.appendChild(ta);
                  ta.select();
                  document.execCommand('copy');
                  ta.remove();
                  window.scrollTo(sx, sy);
                }
              } catch {}
              trackEvent('share', {
                content_type: 'restaurant',
                item_id: r.slug,
                method: 'copy_link',
              });
              setShareDone(true);
              window.setTimeout(() => setShareDone(false), 1800);
            }}
          >
            <span>{shareDone ? (locale === 'en' ? 'Copied' : 'Kopiert') : t('map.share')}</span>
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
              onClick={() =>
                trackEvent('restaurant_reservation_clicked', {
                  restaurant_id: r._id,
                  restaurant_slug: r.slug,
                  provider: reservationProvider ?? 'other',
                })
              }
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
                  onClick={() =>
                    trackEvent('restaurant_reservation_clicked', {
                      restaurant_id: r._id,
                      restaurant_slug: r.slug,
                      provider: 'OpenTable',
                    })
                  }
                >
                  <span className={styles.otMark}>ot</span>
                  <span className={styles.otWord}>OpenTable</span>
                </a>
              </div>
            )}
          </section>
        )}

        {/* PACK PROMO — anon + starter only, qualitative (no counts/prices) */}
        {showBooster && (
          <section className={styles.packPromo}>
            <div className={styles.packPromoCardWrap} aria-hidden="true">
              <img
                src={
                  isAnon ? '/pics/booster/booster_free.webp' : '/pics/booster/booster_lunch.webp'
                }
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
                  <svg className={styles.btnPackPromoIcon} viewBox="0 0 24 18" aria-hidden="true">
                    <line x1="2" y1="9" x2="20" y2="9" />
                    <polyline points="14 3 20 9 14 15" />
                  </svg>
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
  );
}
