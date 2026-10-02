'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useTranslations } from 'next-intl';
import { useUserLocationContext } from '@/lib/map/UserLocationContext';
import { haversineDistance } from '@/lib/map/distance';
import { LOCATION_ERROR_VISIBLE_MS, getLocationStatus } from '@/lib/map/locationStatus';
import { notify, type NoticeKind } from '@/lib/notice';
import { locationBlockedOptions } from '@/lib/map/locationHelp';
import { normalizeName } from '@/lib/normalizeName';
import {
  nearbyDistance,
  nearestRestaurants,
  rotatingRestaurants,
  type NearbyDistance,
} from '@/lib/home/nearby';
import { armRailDrag } from '@/lib/home/railDrag';
import {
  COUNTER_GLYPHS,
  COUNTER_REEL,
  preloadPhotos,
  reelPercent,
  rememberCards,
  type CardsFlip,
} from '@/lib/home/nearbyMotion';
import { sanitySrcSet } from '@/lib/sanity-image-presets';
import sanityImageLoader from '@/lib/sanityImageLoader';
import MapIntentLink from './MapIntentLink';
import { useHomeMapData } from './HomeMapDataContext';
import styles from './HubNearby.module.css';

interface Props {
  locale?: 'de' | 'en';
  /** Server date (YYYY-MM-DD) seeding the no-location rotation. */
  today: string;
  /** Rendered as the second movement of the home's "what should I eat now"
      block, under the day's pick: no section chrome of its own, and a heading
      one step below the red section title above it. */
}

// Eight picks: the nearest big, seven in the rail beside it.
const COUNT = 8;
const HERO_SIZES = '(max-width: 767.98px) calc(100vw - 32px), min(42vw, 760px)';
const RAIL_SIZES = '(max-width: 767.98px) 42vw, clamp(170px, 15vw, 250px)';

/** Wie die Karte ihr Foto lädt — auch fürs Vorladen (preloadPhotos). */
const photoSource = (photo: string, hero = false) => ({
  src: sanityImageLoader({ src: photo, width: hero ? 760 : 380, quality: 80 }),
  srcSet: sanitySrcSet(
    photo,
    hero ? [380, 560, 760, 1100, 1500] : [280, 380, 560],
    80
  ),
  sizes: hero ? HERO_SIZES : RAIL_SIZES,
});

/** Der graue Stempel mit der Gehzeit. Ohne Standort steht „? Min" da; nach
 *  der Freigabe läuft jede Ziffer wie ein Zählwerk auf ihren Wert
 *  (lib/home/nearbyMotion.ts). Die Walzen sind nur Bild — Vorleser hören
 *  den Wert aus dem versteckten Text. */
function TimeStamp({ distance, hero }: { distance: NearbyDistance | null; hero?: boolean }) {
  const value = distance?.value ?? '?';
  const unit = distance?.unit ?? 'Min';
  return (
    <span className={hero ? `${styles.stamp} ${styles.stampHero}` : styles.stamp} data-stamp="">
      <span className={styles.stampFace} aria-hidden="true">
        {Array.from(value).map((glyph, i) => {
          const at = COUNTER_GLYPHS.indexOf(glyph);
          if (at < 0) return <span key={i}>{glyph}</span>;
          return (
            <span key={i} className={styles.reelWindow} data-narrow={/[,.]/.test(glyph) ? '' : undefined}>
              <span
                className={styles.reel}
                data-reel={glyph}
                style={{ '--reel-y': `${reelPercent(at)}%` } as CSSProperties}
              >
                {COUNTER_REEL}
              </span>
            </span>
          );
        })}
        <span className={styles.stampUnit}>{unit}</span>
      </span>
      {distance && <span className={styles.srOnly}>{`${value} ${unit}`}</span>}
    </span>
  );
}

export default function HubNearby({ locale = 'de', today }: Props) {
  const t = useTranslations('hub.nearby');
  const { initialMapData, live } = useHomeMapData();
  const { location, loading: locating, error: locError, request } = useUserLocationContext();
  const locationStatus = getLocationStatus({
    locale,
    location,
    locationError: locError,
    locateLoading: locating,
  });
  // The first client render must match SSR (anon initialMapData + Mitte). Only
  // after mount switch to live data (which may be the cached signed-in payload)
  // + the resolved geolocation — otherwise the nearby list/distances mismatch
  // on hydrate.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const restaurants = mounted ? live.restaurants : initialMapData.restaurants;
  const restaurantsRef = useRef(restaurants);
  restaurantsRef.current = restaurants;
  const activeLocation = mounted ? location : null;
  // Nach dem Tipp auf „Freigeben" bleibt die alte Reihe stehen, bis die
  // Fotos der neuen geladen sind — dann fliegen die Karten (siehe unten).
  const [holding, setHolding] = useState(false);
  const listLocation = holding ? null : activeLocation;

  /* Nur die Fehler laufen durch die zentrale Info-Karte. „Wir suchen dich"
     sagt der Knopf selbst, und ein gefundener Standort zeigt sich daran, dass
     die Liste sich umsortiert — beide Meldungen sind am 24.09.2026 raus. Der
     Schluessel ist der Fehlersatz: ein anderer Fehler kommt wieder, derselbe
     weggeklickte nicht. */
  const errorKey = mounted && locationStatus.isError ? locationStatus.copy : null;
  const [dismissedErrorKey, setDismissedErrorKey] = useState<string | null>(null);

  // Finger und Trackpad wischen die Leiste nativ; mit der Maus wird gezogen.
  // Ein Ref-Callback mit Aufräumfunktion (React 19): die Leiste entsteht
  // erst, wenn es Karten gibt.
  const railRef = useRef<HTMLUListElement | null>(null);
  const setRail = useCallback((rail: HTMLUListElement | null) => {
    if (!rail) return;
    railRef.current = rail;
    const disarm = armRailDrag(rail);
    return () => {
      disarm();
      railRef.current = null;
    };
  }, []);

  // Nach der Freigabe sortiert sich alles nach Nähe um: die neue Nächste
  // fliegt in den großen Platz, die übrigen an ihre Plätze in der Leiste,
  // die Stempel zählen auf die Gehzeit (lib/home/nearbyMotion.ts).
  // Gemerkt wird, wo die Karten beim Tipp standen; dann wartet die alte
  // Reihe, bis der Standort da ist und die ersten Fotos der neuen geladen
  // sind, und erst dann wird umgestellt und geflogen.
  const boardRef = useRef<HTMLDivElement | null>(null);
  const pendingFlip = useRef<Promise<CardsFlip | null> | null>(null);
  const handleLocate = useCallback(async () => {
    setDismissedErrorKey(null);
    const board = boardRef.current;
    const remembered = board ? rememberCards(board).catch(() => null) : null;
    pendingFlip.current = remembered;
    if (remembered) setHolding(true);
    const found = await request();
    if (!found) {
      pendingFlip.current = null;
      setHolding(false);
      return;
    }
    if (remembered && (await remembered)) {
      const next = nearestRestaurants(restaurantsRef.current, found, COUNT).slice(0, 3);
      await preloadPhotos(
        next.flatMap((r, i) => (r.photo ? [photoSource(r.photo, i === 0)] : []))
      );
    }
    setHolding(false);
  }, [request]);
  useLayoutEffect(() => {
    const pending = pendingFlip.current;
    const board = boardRef.current;
    if (!listLocation || !pending || !board) return;
    pendingFlip.current = null;
    void pending.then((flip) => flip?.play(board));
  }, [listLocation]);
  const errorKind: NoticeKind | null =
    errorKey && errorKey !== dismissedErrorKey
      ? locError === 'denied'
        ? 'locationBlocked'
        : 'locationNotFound'
      : null;
  const canRetry = locationStatus.canRetry;
  useEffect(() => {
    if (!errorKind) return;
    /* Der Rueckgabewert raeumt genau diese Meldung ab und laesst eine
       inzwischen nachgerueckte stehen. */
    if (errorKind === 'locationBlocked') {
      return notify(
        errorKind,
        locale,
        locationBlockedOptions(locale, () => setDismissedErrorKey(errorKey))
      );
    }
    return notify(errorKind, locale, {
      action: canRetry
        ? { label: locale === 'en' ? 'Retry' : 'Nochmal', onClick: handleLocate }
        : undefined,
      onDismiss: () => setDismissedErrorKey(errorKey),
      duration: LOCATION_ERROR_VISIBLE_MS,
    });
  }, [errorKind, errorKey, canRetry, locale, handleLocate]);

  // With a grant: genuinely nearest. Without: a daily rotation across Berlin
  // rather than the same four spots around a Mitte centroid the visitor never
  // asked for.
  const cards = listLocation
    ? nearestRestaurants(restaurants, listLocation, COUNT)
    : rotatingRestaurants(restaurants, today, COUNT);
  if (cards.length === 0) return null;

  // `loc` falls back to Mitte, so without a grant the walking time below is
  // measured from a place the user isn't. A denial is indistinguishable from a
  // question never asked — the silent resume only runs on an existing grant —
  // which leaves `activeLocation` as the only honest split there is.
  // (`listLocation`: dasselbe, nur wartet es nach der Freigabe auf die Fotos.)
  const title = listLocation ? t('title') : t('titleFallback');
  const [hero, ...rest] = cards;

  const renderCard = (r: (typeof cards)[number], big: boolean) => {
    const district = r.district ?? r.bezirk?.name ?? r.categories?.[0]?.name;
    const distance = listLocation
      ? nearbyDistance(haversineDistance(listLocation.lat, listLocation.lng, r.lat, r.lng), locale)
      : null;
    return (
      // Every card on the home page leads back to the map — that is the
      // product, and the spot is already pinned there.
      <MapIntentLink href={`/map?r=${r.slug}`} rel="nofollow" className={styles.card}>
        <span className={`hv-photo ${styles.photo}`}>
          {r.photo && (
            // Deliberately bypass the App Hosting image proxy, like
            // HubSection and HubMustEatsTeaser next door: `r.photo` is
            // already a Sanity URL carrying ?w=600&auto=format&q=80 (mapCard
            // preset), so routing it through /_next/image re-optimised an
            // optimised file on Cloud Run for nothing.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className={styles.photoImg}
              {...photoSource(r.photo, big)}
              alt={normalizeName(r.name)}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          )}
        </span>
        <TimeStamp distance={distance} hero={big} />
        <span className="hv-cap">{normalizeName(r.name)}</span>
        {district && <span className="hv-sub">{district}</span>}
      </MapIntentLink>
    );
  };

  return (
    <section className="homeV2 hv-section hv-wrap" data-hub-nearby="">
      <div className={styles.board} ref={boardRef}>
        {/* Heading, its own line of copy and the button that acts on it live in
            one block. Stacked on phones the button used to sit between the
            heading and the line explaining it, which put more space inside the
            heading than above it — the section read as if it belonged to
            whatever sat above. */}
        <div className={`hv-head ${styles.head}`}>
          <h2 className={`hv-title ${styles.title}`}>
            <span className="hv-mk" aria-hidden="true" />
            {title}
          </h2>
          <p className={styles.sub}>{listLocation ? t('sub') : t('subFallback')}</p>
          {/* Ist der Standort da, hat der Knopf seine Arbeit getan: die Liste
              ist nach Nähe sortiert und zeigt Gehzeiten. Ein zweiter Druck
              holte nur dieselbe Position noch einmal. */}
          {!listLocation && (
            <button
              type="button"
              className={styles.locBtn}
              onClick={handleLocate}
              disabled={locating || holding}
              aria-label={t('locationAria')}
            >
              <svg className={styles.locIcon} viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="8" />
                <line x1="12" y1="2" x2="12" y2="5" />
                <line x1="12" y1="19" x2="12" y2="22" />
                <line x1="2" y1="12" x2="5" y2="12" />
                <line x1="19" y1="12" x2="22" y2="12" />
                <circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" />
              </svg>
              <span>{locating || holding ? t('locating') : t('locationRequest')}</span>
            </button>
          )}
        </div>

        {/* Die Nächste groß, die übrigen sieben klein daneben (am Telefon
            darunter), auf jeder Karte die Gehzeit als Stempel — Wahl vom
            02.10.2026 nach dem Prototyp „D · Die Nächste". Die Leiste bleibt
            eine Querleiste (Ansage 01.10.2026: „die Restaurants alle
            anklickbar und horizontal scrollbar"): nativ gewischt, mit Snap
            auf jede Karte, jede Karte ein Link. */}
        <div
          className={styles.spread}
          data-nearby-spread=""
          data-located={listLocation ? '' : undefined}
        >
          <div key={hero._id} className={styles.hero} data-flip-id={hero._id}>
            {renderCard(hero, true)}
          </div>
          <ul
            className={styles.rail}
            role="list"
            aria-label={title}
            ref={setRail}
            data-nearby-rail=""
          >
            {rest.map((r) => (
              <li key={r._id} className={styles.slide} data-flip-id={r._id}>
                {renderCard(r, false)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
