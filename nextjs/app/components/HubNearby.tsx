'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useUserLocationContext } from '@/lib/map/UserLocationContext';
import { haversineDistance, formatWalkingTime } from '@/lib/map/distance';
import { getLocationNoticeCopy, getLocationStatus } from '@/lib/map/locationStatus';
import { normalizeName } from '@/lib/normalizeName';
import { nearestRestaurants, rotatingRestaurants } from '@/lib/home/nearby';
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
  const locationStatusKey = locationStatus.copy
    ? `${locationStatus.copy}:${locationStatus.isError ? 'error' : 'ok'}:${locating ? 'loading' : 'idle'}`
    : null;
  const [dismissedLocationStatusKey, setDismissedLocationStatusKey] = useState<string | null>(null);
  const [locationSuccessKey, setLocationSuccessKey] = useState(0);
  // The first client render must match SSR (anon initialMapData + Mitte). Only
  // after mount switch to live data (which may be the cached signed-in payload)
  // + the resolved geolocation — otherwise the nearby list/distances mismatch
  // on hydrate.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    if (!locationSuccessKey) return;
    const timeout = window.setTimeout(() => setLocationSuccessKey(0), 3600);
    return () => window.clearTimeout(timeout);
  }, [locationSuccessKey]);
  const restaurants = mounted ? live.restaurants : initialMapData.restaurants;
  const activeLocation = mounted ? location : null;
  const count = 4;

  const showLocationStatus = Boolean(
    mounted && locationStatus.copy && locationStatusKey !== dismissedLocationStatusKey
  );
  const showLocationSuccess = Boolean(mounted && locationSuccessKey && !showLocationStatus);
  const handleLocate = useCallback(async () => {
    setDismissedLocationStatusKey(null);
    setLocationSuccessKey(0);
    const nextLocation = await request();
    if (nextLocation) setLocationSuccessKey(Date.now());
  }, [request]);
  const handleDismissLocationStatus = useCallback(() => {
    if (locationStatusKey) setDismissedLocationStatusKey(locationStatusKey);
  }, [locationStatusKey]);

  /* Die Standort-Meldung laeuft durch die zentrale Info-Karte, genau wie die
     der Karte (MapSectionBody). Vorher stand hier eine eigene Leiste am
     unteren Bildrand — auf der langen Startseite lag sie meist ausserhalb des
     Blicks, waehrend der Knopf, den sie beantwortet, oben im Aufmacher sitzt.
     Der Zustandsautomat bleibt hier, die Karte zeigt nur; `duration: 0`, weil
     dieser Automat das Abraeumen besitzt. */
  const successCopy =
    locale === 'en'
      ? {
          eyebrow: 'Location',
          title: 'Location locked',
          detail: 'Berlin is sorting around you.',
        }
      : {
          eyebrow: 'Standort',
          title: 'Standort sitzt',
          detail: 'Berlin sortiert sich um dich herum.',
        };
  const noticeCopy = showLocationSuccess
    ? successCopy
    : showLocationStatus
      ? getLocationNoticeCopy(locale, locating ? null : locError, locating)
      : null;
  /* Ueber die einzelnen Zeilen statt ueber das Objekt: das entsteht bei jedem
     Rendern neu und wuerde die Meldung sonst dauernd neu aufziehen. */
  const noticeEyebrow = noticeCopy?.eyebrow ?? null;
  const noticeTitle = noticeCopy?.title ?? null;
  const noticeDetail = noticeCopy?.detail ?? null;
  const noticeIsError = Boolean(locationStatus.isError && !showLocationSuccess);
  const noticeCanRetry = Boolean(locationStatus.canRetry && !showLocationSuccess);
  useEffect(() => {
    if (!noticeTitle || !noticeEyebrow) return;
    /* Der Rueckgabewert raeumt genau diese Meldung ab und laesst eine
       inzwischen nachgerueckte stehen. */
    return window.showNotice?.({
      tone: noticeIsError ? 'warning' : showLocationSuccess ? 'success' : 'info',
      icon: noticeIsError ? 'pin' : showLocationSuccess ? 'check' : 'pin',
      eyebrow: noticeEyebrow,
      title: noticeTitle,
      detail: noticeDetail ?? undefined,
      action: noticeCanRetry
        ? { label: locale === 'en' ? 'Retry' : 'Nochmal', onClick: handleLocate }
        : undefined,
      /* Nur die Fehler bekommen einen Wegklick-Knopf; der Erfolg raeumt sich
         nach seiner eigenen Frist selbst ab. */
      onDismiss: noticeIsError ? handleDismissLocationStatus : undefined,
      duration: 0,
      layer: true,
    });
  }, [
    noticeEyebrow,
    noticeTitle,
    noticeDetail,
    noticeIsError,
    noticeCanRetry,
    showLocationSuccess,
    locale,
    handleLocate,
    handleDismissLocationStatus,
  ]);

  // With a grant: genuinely nearest. Without: a daily rotation across Berlin
  // rather than the same four spots around a Mitte centroid the visitor never
  // asked for.
  const cards = activeLocation
    ? nearestRestaurants(restaurants, activeLocation, count)
    : rotatingRestaurants(restaurants, today, count);
  if (cards.length === 0) return null;

  // `loc` falls back to Mitte, so without a grant the walking time below is
  // measured from a place the user isn't. A denial is indistinguishable from a
  // question never asked — the silent resume only runs on an existing grant —
  // which leaves `activeLocation` as the only honest split there is.
  const title = activeLocation ? t('title') : t('titleFallback');

  return (
    <section className="homeV2 hv-section hv-wrap" data-hub-nearby="">
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
          <p className={styles.sub}>{activeLocation ? t('sub') : t('subFallback')}</p>
          <button
            type="button"
            className={styles.locBtn}
            data-primary={activeLocation ? undefined : ''}
            onClick={handleLocate}
            disabled={locating}
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
            <span>
              {locating ? t('locating') : activeLocation ? t('location') : t('locationRequest')}
            </span>
          </button>
        </div>

        <div className={`hv-rail ${styles.rail}`}>
          {cards.map((r) => {
            const walk = activeLocation
              ? formatWalkingTime(
                  haversineDistance(activeLocation.lat, activeLocation.lng, r.lat, r.lng)
                )
              : null;
            const district = r.district ?? r.bezirk?.name ?? r.categories?.[0]?.name;
            return (
              // Every card on the home page leads back to the map — that is
              // the product, and the spot is already pinned there.
              <MapIntentLink
                key={r._id}
                href={`/map?r=${r.slug}`}
                rel="nofollow"
                className={styles.card}
              >
                <span className={`hv-photo ${styles.photo}`}>
                  {r.photo && (
                    // Deliberately bypass the App Hosting image proxy, like
                    // HubSection and HubMustEatsTeaser next door: `r.photo` is
                    // already a Sanity URL carrying ?w=600&auto=format&q=80
                    // (mapCard preset), so routing it through /_next/image
                    // re-optimised an optimised file on Cloud Run for nothing.
                    // These were the last seven images on the home page still
                    // taking that detour.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      className={styles.photoImg}
                      src={sanityImageLoader({ src: r.photo, width: 560, quality: 80 })}
                      srcSet={sanitySrcSet(r.photo, [280, 380, 560, 760], 80)}
                      alt={normalizeName(r.name)}
                      loading="lazy"
                      decoding="async"
                      sizes="(max-width:760px) 78vw, 280px"
                    />
                  )}
                </span>
                <span className="hv-cap">{normalizeName(r.name)}</span>
                {(walk || district) && (
                  <span className="hv-sub">{[walk, district].filter(Boolean).join(' · ')}</span>
                )}
              </MapIntentLink>
            );
          })}
        </div>
      </section>

  );
}
