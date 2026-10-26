'use client';
import type { CSSProperties } from 'react';
import { useLayoutEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { useRestaurantDetail, type RestaurantGalleryImage } from '@/lib/map/useRestaurantDetail';
import type { MapRestaurant, MapMustEat } from '@/lib/types';
import { localizedCuisine } from '@/lib/cuisineLabels';
import {
  formatWalkingTime,
  haversineDistance,
  type UserLocation,
  showsPackPromos,
  type UserTier,
} from '@/lib/map';
import { useTranslation } from '@/lib/i18n';
import { pickLocale } from '@/lib/i18n/pickLocale';
import { useLocale } from 'next-intl';
import { routing } from '@/i18n/routing';
import styles from './RestaurantDetail.module.css';
import type { DetailOrigin } from '@/lib/map/phoneSheetSnaps';
import { HeartIcon, CloseIcon } from './icons';
import { useHeartCount } from '@/lib/map/useHeartCount';
import { heartCountShort } from '@/lib/map/heartLabel';
import { classifyWebsite, formatPriceLabel } from './restaurantDetail.helpers';
import { normalizeName } from '@/lib/normalizeName';
import { useLoginModal } from '@/lib/auth';
import ShareButton from '../ShareButton';
import RestaurantGallery from './RestaurantGallery';
import { spotGallery } from '@/lib/map/spotGallery';
import RestaurantDetailArticles from './RestaurantDetailArticles';
import { trackEvent } from '@/lib/analytics';
import {
  berlinNow,
  localizeOpeningDays,
  localizeOpeningHours,
  slotCoversDay,
  withDash,
} from '@/lib/map/openingHours';
import { useInkSafeLeading } from '@/lib/dom/inkSafeLeading';
import { spotPhotoSrc } from '@/lib/map/spotPhoto';
import { UNLOCK_RADIUS_METERS } from './useMustEatDetailState';

function MustEatMiniCard({
  mustEat,
  unlocked,
  inReach,
  onClick,
}: {
  mustEat: MapMustEat;
  unlocked: boolean;
  /** Innerhalb des Aufdeck-Radius. Eine verdeckte Karte zittert dann schon
   *  hier, wie im Must-Eat-Detail — wer im Lokal steht, sieht, dass es etwas
   *  aufzudecken gibt, bevor er die Karte antippt (Betreiber, 24.09.2026). */
  inReach: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const dish = mustEat.dish ?? 'Must Eat';
  const ready = !unlocked && inReach;

  return (
    <li>
      <button
        type="button"
        className={`${styles.medish}${ready ? ` ${styles.medishReady}` : ''}`}
        onClick={onClick}
        aria-label={unlocked ? dish : ready ? t('map.revealHere') : t('map.hiddenMustEatAria')}
        data-reveal-ready={ready ? '' : undefined}
      >
        <div className={styles.medishPh}>
          <img
            src={unlocked && mustEat.image ? mustEat.image : '/pics/card-back.webp?v=8'}
            alt={unlocked ? dish : ''}
            loading="lazy"
          />
        </div>
      </button>
    </li>
  );
}

/* Die Uhr für den Öffnungs-Tag, auf die Minute. Auf dem Server null: die Map
   wird vorgerendert, ein „Geöffnet" aus dem Build wäre bald falsch. Geht das
   Detail per Tipp auf, steht der Tag dagegen schon im ersten Bild — aus einem
   Effekt käme er einen Frame später in die Zeile gerutscht. */
const subscribeMinute = (onChange: () => void) => {
  const timer = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(timer);
};
const currentMinute = () => Math.floor(Date.now() / 60_000);
const serverMinute = () => null;

interface RestaurantDetailProps {
  restaurant: MapRestaurant;
  mustEats: MapMustEat[];
  unlockedIds: Set<string>;
  revealedMustEatIds: Set<string>;
  userLocation: UserLocation | null;
  uid: string | null;
  userTier: UserTier;
  onClose: () => void;
  /** Where the X lands: the list row the spot was opened from, or the map
   *  the marker was tapped on. Only the accessible name changes. */
  closeTarget?: DetailOrigin;
  onMustEatClick: (m: MapMustEat) => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
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
  closeTarget = 'list',
  onMustEatClick,
  isFavorite,
  onToggleFavorite,
}: RestaurantDetailProps) {
  const { t } = useTranslation();
  const locale = useLocale();
  const { open: openLoginModal } = useLoginModal();
  const { count: heartCount } = useHeartCount(restaurant._id);

  // The map list payload is now trimmed to hero/list fields; the editorial +
  // contact fields (address, phone, tip, description, …) load on demand when
  // the sheet opens and merge over the list object. Cached per slug, so paging
  // back or re-opening is instant. `r` is the merged view used for rendering.
  const { detail, loading: detailLoading } = useRestaurantDetail(restaurant.slug);
  const r = useMemo(
    () => (detail ? { ...restaurant, ...detail } : restaurant),
    [restaurant, detail]
  );

  /* Ein anderer Spot beginnt oben. Das Detail bleibt beim Wechsel gemountet
     (Pager, Pin-Klick auf der Karte, Suche) und damit auch sein Scroller — auf
     Desktop stand der neue Spot sonst dort, wo man im alten hingescrollt hatte
     (Nutzer, 28.09.2026). Hier statt in jedem Aufrufer, damit kein Weg in ein
     anderes Detail es vergisst. Vor dem Paint, sonst blitzt die alte Position. */
  const scrollRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [restaurant._id]);

  const hasHours = !!r.openingHours?.length;
  const minute = useSyncExternalStore(subscribeMinute, currentMinute, serverMinute);
  /* Heute in Berlin, für die Markierung in den Öffnungszeiten. Erst nach der
     Hydrierung (minute ist auf dem Server null), und nur bei mehr als einer
     Zeile: steht da nur „Täglich", gibt es nichts zu unterscheiden. */
  const today =
    minute !== null && (r.openingHours?.length ?? 0) > 1
      ? berlinNow(new Date(minute * 60_000)).getDay()
      : null;

  // Scale the hero name down for long single words so they fit on one line
  // (no ugly mid-word break). Upper bound ≈ usableWidth / (longestWord · 0.62).
  // Budget is the REAL hero text width on desktop (~285px inside the 360px
  // panel), not the old 360 — that was too optimistic and only survived with
  // narrow Schoolbell; a wider display font overflowed and the
  // last letter got clipped by the hero's overflow:hidden (e.g. "Schüsseldienst").
  const displayName = normalizeName(r.name);
  const nameRef = useRef<HTMLHeadingElement>(null);
  useInkSafeLeading(nameRef, displayName);
  const longestWord = displayName.split(/\s+/).reduce((m, w) => Math.max(m, w.length), 0);
  const nameMaxPx = Math.max(26, Math.min(56, Math.round(311 / (Math.max(longestWord, 1) * 0.62))));
  const galleryImages = useMemo<RestaurantGalleryImage[]>(() => {
    if (!detail) return [];
    return spotGallery(
      r.photo
        ? {
            _key: `${r._id}-hero`,
            thumb: restaurant.photo ?? r.photo,
            full: r.photo,
            alt: displayName,
            credit: r.photoCredit,
            creditUrl: r.photoCreditUrl,
          }
        : null,
      detail.gallery
    );
  }, [detail, displayName, r._id, r.photo, r.photoCredit, r.photoCreditUrl, restaurant.photo]);

  const district = r.bezirk?.name ?? r.district ?? null;
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

  const backLabel =
    closeTarget === 'map'
      ? locale === 'en'
        ? 'Map'
        : 'Karte'
      : locale === 'en'
        ? 'List'
        : 'Liste';

  const showBooster = showsPackPromos(userTier);
  const isAnon = !uid;
  const boosterHref = locale === routing.defaultLocale ? '/packs' : `/${locale}/packs`;
  const openStarterLogin = () => {
    trackEvent('login_start', { method: 'starter_pack_banner' });
    openLoginModal();
  };

  const heroCredit = r.photo ? r.photoCredit?.trim() : undefined;
  const heroStyle =
    r.photo && heroCredit
      ? ({
          /* The list card's own file (lib/map/spotPhoto.ts), so it stands
             there from the cache before the gallery on top of it loads. */
          '--rd-hero-image': `url(${JSON.stringify(spotPhotoSrc(r.photo))})`,
          backgroundImage: `url(${JSON.stringify(spotPhotoSrc(r.photo))})`,
        } as CSSProperties)
      : undefined;

  return (
    <div className={styles.detail} data-detail-root="restaurant" role="dialog" aria-label={r.name}>
      <div ref={scrollRef} className={styles.scroll} data-detail-scroll>
        {/* HERO — full-bleed photo, save bookmark, name. */}
        <header className={styles.rdHero} data-detail-hero style={heroStyle}>
          <RestaurantGallery
            key={r._id}
            images={galleryImages}
            restaurantName={displayName}
            slug={r.slug}
          />
          <button
            type="button"
            className={styles.rdCloseGlass}
            aria-label={backLabel}
            onClick={onClose}
          >
            <CloseIcon />
          </button>

          {/* Free heart icon and public count; tapping toggles the favorite. */}
          {onToggleFavorite && (
            <button
              type="button"
              className={styles.rdHeartToggle}
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
                <span>
                  {heartCountShort(heartCount, locale)}
                </span>
              )}
            </button>
          )}
          {/* Name und Angaben als Etiketten im Foto, wie auf den Karten der
              Liste: das Foto bleibt hell, nichts wird abgedunkelt. Kein
              „Geöffnet" hier — die Liste zeigt den Zustand, das Detail die
              Woche mit dem heutigen Tag markiert (Ansage 22.10.2026). */}
          <div className={styles.rdOverlay}>
            {/* h2, nicht h1: die H1 der Seite ist „Berlin Food Map" und
                schwebt über der Karte (MapIntro) — die URL bleibt /map, das
                Detail ist ein Panel darin. */}
            <h2
              ref={nameRef}
              className={styles.rdNameOv}
              style={{ ['--rd-name-max' as string]: `${nameMaxPx}px` }}
            >
              <span className="et-label-title">{displayName}</span>
            </h2>
            <div className={styles.rdTagsOv}>
              {(district || cuisine) && (
                <span className="et-label et-label-paper">
                  {[district, cuisine].filter(Boolean).join(' · ')}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* BODY — Fließtext wie auf der Spot-Seite. Solange das Detail noch
            lädt, halten Platzhalterzeilen den Raum, damit nichts springt. */}
        {hasStory ? (
          <div className={styles.rdBody}>
            {storyText.split('\n\n').map((para, idx) => (
              <p key={idx}>{para}</p>
            ))}
          </div>
        ) : detailLoading ? (
          <div className={`${styles.rdBody} ${styles.rdBodySkel}`} aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
        ) : null}

        {/* INSIDER-TIPP — kleiner Zwischentitel über grossem Zitat, wie auf
            der Spot-Seite; kein Kasten. */}
        {hasTipp && (
          <section className={styles.rdTipp}>
            <h3 className={`et-label ${styles.rdSecH}`}>{t('map.insiderTip')}</h3>
            <p className={styles.rdTippText}>„{tipText}“</p>
          </section>
        )}

        {/* MUST EATS — reveal state mirrors the map/list (unlocked OR proximity-revealed) */}
        {mustEats.length > 0 && (
          <section className={styles.rdMustSection}>
            <div className={styles.rdMustHead}>
              <h3 className={`et-label ${styles.rdSecH}`}>Must Eats</h3>
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
                  inReach={meters !== null && meters <= UNLOCK_RADIUS_METERS}
                  onClick={() => onMustEatClick(m)}
                />
              ))}
            </ol>
          </section>
        )}

        {/* FAKTEN — eine Fläche für alles, was man zum Hingehen braucht:
            Adresse, die Woche (heute fett), Preis und Instagram, darunter
            die Knöpfe (Ansage 22.10.2026: „eine einheitliche Ebene, ein
            bisschen dezenter"). Bezirk und Küche stehen schon im Foto. */}
        <section className={styles.rdFacts} aria-label={locale === 'en' ? 'Details' : 'Steckbrief'}>
          {addressLines && (
            <div className={styles.rdBlock}>
              <h3 className={styles.rdK}>{t('map.address')}</h3>
              <a
                className={styles.rdAddress}
                href={mapsHref ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('restaurant_maps_clicked', {
                  restaurant_id: r._id,
                  restaurant_slug: r.slug,
                })}
              >
                {addressLines.street}
                {addressLines.locality && <span>{addressLines.locality}</span>}
              </a>
              {walkingTime && (
                <p className={styles.rdVMeta}>
                  {walkingTime} {t('map.walkMinutes')}
                </p>
              )}
            </div>
          )}
          {hasHours && (
            <div className={styles.rdBlock}>
              <h3 className={styles.rdK}>{t('map.openingHours')}</h3>
              <dl className={styles.rdHours}>
                {r.openingHours!.map((slot, i) => {
                  const isToday = today !== null && slotCoversDay(slot.days, today);
                  return (
                    <div
                      key={i}
                      className={isToday ? styles.rdHoursRowToday : styles.rdHoursRow}
                      aria-current={isToday ? 'date' : undefined}
                    >
                      <dt>{localizeOpeningDays(slot.days, locale)}</dt>
                      {/* Jede Zeitspanne eine eigene, unbrechbare Zeile —
                          „18:00-" / „01:00" bricht so nie mehr auseinander. */}
                      <dd>
                        {withDash(localizeOpeningHours(slot.hours, locale))
                          .split(/,\s*/)
                          .map((range, j) => (
                            <span key={j} className={styles.rdHoursSpan}>
                              {range}
                            </span>
                          ))}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          )}
          {(priceLabel || igUrl) && (
            <div className={`${styles.rdBlock} ${styles.rdPair}`}>
              {priceLabel && (
                <div>
                  <h3 className={styles.rdK}>{t('map.price')}</h3>
                  <p className={styles.rdV}>{priceLabel}</p>
                </div>
              )}
              {igUrl && (
                <div>
                  <h3 className={styles.rdK}>Instagram</h3>
                  <p className={styles.rdV}>
                    <a className={styles.rdVLink} href={igUrl} target="_blank" rel="noopener noreferrer">
                      {igHandle ? `@${igHandle}` : 'Profil'}
                    </a>
                  </p>
                </div>
              )}
            </div>
          )}

          <div className={styles.rdActs}>
            {r.reservationUrl && (
              <a
                className={`et-btn et-btn-sm ${styles.rdActBtn}`}
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
                {t('map.reserve')}
              </a>
            )}
            {mapsHref && (
              <a
                className={`et-btn et-btn-sm ${styles.rdActBtn}`}
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
                {t('map.maps')}
              </a>
            )}
            {r.phone && (
              <a className={`et-btn et-btn-sm ${styles.rdActBtn}`} href={`tel:${r.phone.replace(/\s+/g, '')}`}>
                {locale === 'en' ? 'Call' : 'Anrufen'}
              </a>
            )}
            {websiteInfo?.kind === 'web' && (
              <a
                className={`et-btn et-btn-sm ${styles.rdActBtn}`}
                href={websiteInfo.url}
                target="_blank"
                rel="noopener nofollow noreferrer"
              >
                Website
              </a>
            )}
            {r.menuUrl && (
              <a
                className={`et-btn et-btn-sm ${styles.rdActBtn}`}
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
                {locale === 'en' ? 'Menu' : 'Speisekarte'}
              </a>
            )}
            <ShareButton
              title={r.name}
              slug={r.slug}
              contentType="restaurant"
              className={`et-btn et-btn-sm ${styles.rdActBtn}`}
              label={t('map.share')}
              copiedLabel={locale === 'en' ? 'Copied' : 'Kopiert'}
            />
          </div>
        </section>

        {/* IM MAGAZIN — die Artikel, in denen der Spot vorkommt; derselbe Block
            wie auf der Restaurant-Seite. Nach den Fakten: erst, was man zum
            Hingehen braucht, dann, was man darüber lesen kann. Kommt mit dem
            Detail-Fetch, also erst nach dem Öffnen — kein Platzhalter, der
            Block steht ganz unten und schiebt nichts. */}
        <RestaurantDetailArticles articles={detail?.articles ?? []} locale={loc} />

        {/* PACK PROMO — anon + starter only, qualitative (no counts/prices).
            Set apart by colour, not by an outline: the ink board right above
            it already frames the facts and actions, and a second frame under
            it read as clutter. */}
        {showBooster && (
          <section className={styles.packPromo}>
            <div className={styles.packPromoCardWrap} aria-hidden="true">
              <img
                src={
                  isAnon ? '/pics/home/starter-pack-front.webp' : '/pics/booster/booster_lunch.webp?v=3'
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
                  <button type="button" className={`et-btn et-btn-light-hover ${styles.btnPackPromo}`} onClick={openStarterLogin}>
                    <span className={styles.btnPackPromoLbl}>{t('map.starterCta')}</span>
                  </button>
                ) : (
                  <a href={boosterHref} className={`et-btn et-btn-light-hover ${styles.btnPackPromo}`}>
                    <span className={styles.btnPackPromoLbl}>{t('map.boosterCta')}</span>
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
