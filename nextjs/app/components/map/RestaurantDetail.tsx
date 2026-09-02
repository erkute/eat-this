'use client';
import type { CSSProperties } from 'react';
import { Fragment, useMemo, useRef } from 'react';
import { useRestaurantDetail, type RestaurantGalleryImage } from '@/lib/map/useRestaurantDetail';
import type { MapRestaurant, MapMustEat } from '@/lib/types';
import { localizedCuisine } from '@/lib/cuisineLabels';
import {
  abbreviateBezirk,
  formatWalkingTime,
  formatOpenStateChip,
  haversineDistance,
  type UserLocation,
  showsPackPromos,
  type UserTier,
} from '@/lib/map';
import { useTranslation } from '@/lib/i18n';
import { pickLocale } from '@/lib/i18n/pickLocale';
import { useLocale } from 'next-intl';
import { routing } from '@/i18n/routing';
import styles from './MapDetails.module.css';
import { HeartIcon, CloseIcon } from './icons';
import {
  RouteIcon,
  ReserveIcon,
  PhoneIcon,
  WebsiteIcon,
  MenuCardIcon,
  ShareIcon,
} from '../actionIcons';
import { useHeartCount } from '@/lib/map/useHeartCount';
import { heartCountShort } from '@/lib/map/heartLabel';
import { classifyWebsite, formatPriceLabel } from './restaurantDetail.helpers';
import { normalizeName } from '@/lib/normalizeName';
import { hasAmbiguousDropCap } from '@/lib/dropCap';
import { useLoginModal } from '@/lib/auth';
import ShareButton from '../ShareButton';
import { useSwipePager } from './useSwipePager';
import RestaurantGallery from './RestaurantGallery';
import { trackEvent } from '@/lib/analytics';
import { safeHttpUrl } from '@/lib/safeHttpUrl';
import { localizeOpeningDays, localizeOpeningHours } from '@/lib/map/openingHours';

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
            src={unlocked && mustEat.image ? mustEat.image : '/pics/card-back.webp?v=7'}
            alt={unlocked ? dish : ''}
            loading="lazy"
          />
        </div>
      </button>
    </li>
  );
}

function galleryAssetKey(url: string) {
  return url.split('?')[0];
}

function hasLinkedCredit(img: Pick<RestaurantGalleryImage, 'credit' | 'creditUrl'>) {
  return !!img.credit?.trim() && !!safeHttpUrl(img.creditUrl);
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
  /** This sheet just replaced LockedDetail because a sign-up opened the spot.
   *  Plays the unroll instead of cutting in — see .detailV13Unlocked. */
  justUnlocked?: boolean;
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
  justUnlocked = false,
}: RestaurantDetailProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const { open: openLoginModal } = useLoginModal();
  const { count: heartCount } = useHeartCount(restaurant._id);
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
    // Der Nachbar kann ein gesperrter Spot sein — dann rendert nicht mehr diese
    // Komponente, sondern LockedDetail, und heroRef ist im Moment der Einfahrt
    // leer. Die einfahrende Karte wird deshalb im Dokument gesucht statt über
    // den Ref, der sie nicht mehr kennt.
    entrySelector: '[data-detail-hero]',
  });

  // Gleiche Kurzform wie der Zustands-Chip der Spot-Seite. Vorher stand hier
  // ein getOpenStatus-Aufruf mit sechs übersetzten Labels, dessen Ergebnis nur
  // noch zerlegt wurde, um die Uhrzeit per Regex zurückzuholen — Formulierung
  // und Griff wären auf der Spot-Seite ein zweites Mal entstanden.
  const openState = formatOpenStateChip(r.openingHours, locale === 'en' ? 'en' : 'de');
  const hasHours = !!(r.openingHours && r.openingHours.length > 0);
  const openTag = openState?.text ?? t('map.closed');

  // Scale the hero name down for long single words so they fit on one line
  // (no ugly mid-word break). Upper bound ≈ usableWidth / (longestWord · 0.62).
  // Budget is the REAL hero text width on desktop (~285px inside the 360px
  // panel), not the old 360 — that was too optimistic and only survived with
  // narrow Schoolbell; a wider display font overflowed and the
  // last letter got clipped by the hero's overflow:hidden (e.g. "Schüsseldienst").
  const displayName = normalizeName(r.name);
  const longestWord = displayName.split(/\s+/).reduce((m, w) => Math.max(m, w.length), 0);
  const nameMaxPx = Math.max(26, Math.min(56, Math.round(311 / (Math.max(longestWord, 1) * 0.62))));
  const galleryImages = useMemo<RestaurantGalleryImage[]>(() => {
    if (!detail) return [];

    const images: RestaurantGalleryImage[] = [];
    const seen = new Set<string>();
    const add = (img: RestaurantGalleryImage | null) => {
      if (!img?.thumb || !img.full) return;
      if (!hasLinkedCredit(img)) return;
      const key = galleryAssetKey(img.full);
      if (seen.has(key)) return;
      seen.add(key);
      images.push(img);
    };

    add(
      r.photo
        ? {
            _key: `${r._id}-hero`,
            thumb: restaurant.photo ?? r.photo,
            full: r.photo,
            alt: displayName,
            credit: r.photoCredit,
            creditUrl: r.photoCreditUrl,
          }
        : null
    );
    detail.gallery?.forEach(add);
    return images;
  }, [detail, displayName, r._id, r.photo, r.photoCredit, r.photoCreditUrl, restaurant.photo]);

  const district = abbreviateBezirk(r.bezirk?.name ?? r.district ?? null);

  const meters = userLocation
    ? haversineDistance(userLocation.lat, userLocation.lng, r.lat, r.lng)
    : null;
  const walkingTime = meters !== null ? formatWalkingTime(meters) : null;

  const loc = locale === 'en' ? 'en' : 'de';
  const priceLabel = formatPriceLabel(r, loc);
  const cuisine = r.cuisineType ? localizedCuisine(r.cuisineType, loc) : null;

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

  // Editorial prose is DE-base with an optional EN override, same convention
  // as the public /restaurant/[slug] page — without pickLocale the /en map
  // served German descriptions and tips. (`loc` steht weiter oben, es trägt
  // jetzt auch das Küchen-Label.)
  const storyText =
    pickLocale(r.description, r.descriptionEn, loc) ??
    pickLocale(r.shortDescription, r.shortDescriptionEn, loc) ??
    '';
  const tipText = pickLocale(r.tip, r.tipEn, loc);
  const hasStory = !!storyText;
  const hasTipp = !!tipText;

  // Booking provider, from the reservation host — named on the Reservieren
  // button so you know where the link lands before you leave the map.
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

  const showBooster = showsPackPromos(userTier);
  const isAnon = !uid;
  const boosterHref = locale === routing.defaultLocale ? '/packs' : `/${locale}/packs`;
  const openStarterLogin = () => {
    trackEvent('login_start', { method: 'starter_pack_banner' });
    openLoginModal('starter');
  };
  const openSigninLogin = () => {
    trackEvent('login_start', { method: 'starter_pack_existing_user' });
    openLoginModal('signin');
  };

  const heroCredit = r.photo ? r.photoCredit?.trim() : undefined;
  const heroStyle =
    r.photo && heroCredit
      ? ({
          '--rd-hero-image': `url(${JSON.stringify(r.photo)})`,
          backgroundImage: `url(${r.photo})`,
        } as CSSProperties)
      : undefined;

  return (
    <div
      className={`${styles.detailV13}${justUnlocked ? ` ${styles.detailV13Unlocked}` : ''}`}
      data-detail-root="restaurant"
      role="dialog"
      aria-label={r.name}
    >
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
            {/* h2, nicht h1: die H1 der Seite ist „Berlin Food Map" und
                schwebt über der Karte (MapIntro) — die URL bleibt /map, das
                Detail ist ein Panel darin. Bis zum 01.09.2026 standen hier
                zwei H1 nebeneinander. */}
            <h2
              className={styles.rdNameOv}
              style={{ ['--rd-name-max' as string]: `${nameMaxPx}px` }}
            >
              {displayName}
            </h2>
            <div className={styles.rdTagsOv}>
              {district && <span className={styles.rdTag}>{district}</span>}
              {cuisine && <span className={styles.rdTagAlt}>{cuisine}</span>}
              {hasHours && (
                <span
                  className={`${styles.rdTagAlt} ${openState?.isOpen ? styles.rdTagOpen : styles.rdTagClosed}`}
                >
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

        {/* BODY — story prose with drop cap. While the on-demand detail fetch
            is still in flight, hold the space with skeleton lines so the
            sections below don't jump up and the text doesn't pop in. */}
        {hasStory ? (
          <div className={styles.rdBody}>
            {storyText.split('\n\n').map((para, idx) =>
              /* The drop cap is a ::first-letter on the paragraph, not a
                 <span> around para[0]. Splitting the text made screen readers
                 announce it as its own word — "A", pause, "n der Torstraße" —
                 and broke text selection across the first character. Every
                 property the cap needs (float, font, colour, padding) is
                 ::first-letter-legal, so nothing is lost visually. */
              idx === 0 && para.length > 0 ? (
                <p
                  key={idx}
                  className={`${styles.rdStoryLead} ${
                    hasAmbiguousDropCap(para) ? styles.rdStoryLeadPlain : ''
                  }`}
                >
                  {para}
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

        {/* GALLERY — curated Places photos, after the description and before the insider tip. */}
        {galleryImages.length > 0 && (
          <RestaurantGallery images={galleryImages} restaurantName={displayName} />
        )}

        {/* INSIDER TIPP */}
        {hasTipp && (
          <div className={styles.rdTipp}>
            <span className={styles.rdTippLabel}>{t('map.insiderTip')}</span>
            <p className={styles.rdTippText}>{tipText}</p>
          </div>
        )}

        {/* MUST EATS — reveal state mirrors the map/list (unlocked OR proximity-revealed) */}
        {mustEats.length > 0 && (
          <section className={styles.rdMustSection}>
            <div className={styles.rdMustHead}>
              <h2 className={styles.rdSecH}>Must Eats</h2>
              {/* „Must Eat" ist ein Hauswort — wer zum ersten Mal auf der Karte
                  landet, sieht hier nur Karten und keine Erklärung.

                  Der Satz nennt bewusst KEINE Anzahl: ein Spot kann mehrere
                  Must Eats haben (Bar Basta hat zwei), und „das eine Gericht"
                  wäre unter der Überschrift schlicht falsch. */}
              <p className={styles.rdMustSub}>{t('map.mustEatsExplainer')}</p>
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
                    {/* Geteilte Schichten („10:00-15:00, 18:00-01:00") kamen als
                        EIN String an, und `overflow-wrap: anywhere` auf der Zelle
                        durfte deshalb mitten in einer Uhrzeit umbrechen —
                        „18:00-" / „01:00". Jede Spanne bekommt ihre eigene,
                        unbrechbare Box; gebrochen wird nur noch am Komma. */}
                    <span className={styles.rdHoursT}>
                      {localizeOpeningHours(slot.hours, locale)
                        .split(/,\s*/)
                        .map((range, j, all) => (
                          <Fragment key={j}>
                            {j > 0 ? ' ' : null}
                            <span className={styles.rdHoursSpan}>
                              {range}
                              {j < all.length - 1 ? ',' : ''}
                            </span>
                          </Fragment>
                        ))}
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

          {/* ACTIONS — same icon'd button system as the public /restaurant/[slug]
              page, so a spot looks the same wherever you meet it. They sit ON
              the ink board with the facts, one object like the spot page's
              Tafel. Three weights: book a table (accent — ink on ink would
              vanish here), go there (red), everything else paper. Phone and
              website live here as buttons instead of as rows above. */}
          <div className={styles.rdActs}>
            {r.reservationUrl && (
              <a
                className={`${styles.rdActBtn} ${styles.rdActStrong} ${styles.rdActReserve}`}
                href={r.reservationUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  trackEvent('restaurant_reservation_clicked', {
                    restaurant_id: r._id,
                    restaurant_slug: r.slug,
                    provider: reservationProvider ?? 'other',
                  })
                }
              >
                <span className={styles.rdActLabel}>
                  <ReserveIcon />
                  <span>{t('map.reserve')}</span>
                </span>
                {reservationProvider && (
                  <span className={styles.rdActProvider}>
                    {reservationProvider === 'OpenTable' && (
                      <span className={styles.rdActProviderMark} aria-hidden="true">
                        ot
                      </span>
                    )}
                    <span className={styles.rdActProviderWord}>{reservationProvider}</span>
                  </span>
                )}
              </a>
            )}
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
                <RouteIcon />
                <span>{t('map.maps')}</span>
              </a>
            )}
            <ShareButton
              title={r.name}
              slug={r.slug}
              contentType="restaurant"
              className={styles.rdActBtn}
              label={t('map.share')}
              copiedLabel={locale === 'en' ? 'Copied' : 'Kopiert'}
              icon={<ShareIcon />}
            />
            {r.phone && (
              <a className={styles.rdActBtn} href={`tel:${r.phone.replace(/\s+/g, '')}`}>
                <PhoneIcon />
                <span>{locale === 'en' ? 'Call' : 'Anrufen'}</span>
              </a>
            )}
            {websiteInfo?.kind === 'web' && (
              <a
                className={styles.rdActBtn}
                href={websiteInfo.url}
                target="_blank"
                rel="noopener nofollow noreferrer"
              >
                <WebsiteIcon />
                <span>Website</span>
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
                <MenuCardIcon />
                <span>{locale === 'en' ? 'Menu' : 'Speisekarte'}</span>
              </a>
            )}
          </div>
        </div>

        {/* PACK PROMO — anon + starter only, qualitative (no counts/prices).
            Set apart by colour, not by an outline: the ink board right above
            it already frames the facts and actions, and a second frame under
            it read as clutter. */}
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
                {isAnon ? (
                  <button type="button" className={styles.btnPackPromo} onClick={openStarterLogin}>
                    <span className={styles.btnPackPromoLbl}>{t('map.starterCta')}</span>
                  </button>
                ) : (
                  <a href={boosterHref} className={styles.btnPackPromo}>
                    <span className={styles.btnPackPromoLbl}>{t('map.boosterCta')}</span>
                  </a>
                )}
                {isAnon && (
                  <button type="button" className={styles.linkPromo} onClick={openSigninLogin}>
                    {t('map.starterPromoLogin')}
                  </button>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
