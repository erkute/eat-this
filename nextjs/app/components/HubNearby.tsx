'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { useMapData } from '@/lib/map';
import { useUserLocationContext } from '@/lib/map/UserLocationContext';
import { haversineDistance, formatWalkingTime } from '@/lib/map/distance';
import { getLocationStatus } from '@/lib/map/locationStatus';
import { normalizeName } from '@/lib/normalizeName';
import { nearestRestaurants } from '@/lib/home/nearby';
import type { InitialMapData } from '@/lib/map/server-initial-map-data';
import MapIntentLink from './MapIntentLink';
import styles from './HubNearby.module.css';

const MITTE = { lat: 52.52, lng: 13.405 };

interface Props {
  initialMapData: InitialMapData;
  mode?: 'guest' | 'auth';
  locale?: 'de' | 'en';
}

export default function HubNearby({ initialMapData, mode = 'guest', locale = 'de' }: Props) {
  const t = useTranslations('hub.nearby');
  const authMode = mode === 'auth';
  const { user, loading: authLoading } = useAuth();
  const uid = user?.uid ?? null;
  const live = useMapData({ uid, authLoading, initialMapData });
  const { location, loading: locating, error: locError, request } = useUserLocationContext();
  const locationStatus = getLocationStatus({ locale, location, locationError: locError, locateLoading: locating });
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
  const loc = activeLocation ?? MITTE;

  const cards = nearestRestaurants(restaurants, loc, authMode ? 2 : 4);
  if (cards.length === 0) return null;

  const title = locale === 'en' ? 'Around you' : 'Um dich herum';
  const locateLabel = locale === 'en' ? 'Locate' : 'Standort';
  const showLocationStatus = Boolean(
    mounted && locationStatus.copy && locationStatusKey !== dismissedLocationStatusKey
  );
  const showLocationSuccess = Boolean(mounted && locationSuccessKey && !showLocationStatus);
  const locationSuccessCopy =
    locale === 'en'
      ? 'Location locked. Berlin is sorting around you.'
      : 'Standort sitzt. Berlin sortiert sich um dich herum.';
  const handleLocate = async () => {
    setDismissedLocationStatusKey(null);
    setLocationSuccessKey(0);
    const nextLocation = await request();
    if (nextLocation) setLocationSuccessKey(Date.now());
  };
  const handleDismissLocationStatus = () => {
    if (locationStatusKey) setDismissedLocationStatusKey(locationStatusKey);
  };

  return (
    <>
      <section
        className="homeV2 hv-section hv-wrap"
        data-hub-nearby=""
        data-auth-nearby={authMode ? '' : undefined}
        data-auth-only={authMode ? '' : undefined}
      >
        <div className="hv-head">
          <h2 className={`hv-title ${styles.title}`}>
            <span className="hv-mk" aria-hidden="true" />
            {title}
          </h2>
          <button
            type="button"
            className={styles.locBtn}
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
            <span>{locating ? t('locating') : locateLabel}</span>
          </button>
        </div>

        <p className={styles.sub}>{activeLocation ? t('sub') : t('subFallback')}</p>

        <div className={`hv-rail ${styles.rail}`}>
          {cards.map((r) => {
            const walk = formatWalkingTime(haversineDistance(loc.lat, loc.lng, r.lat, r.lng));
            const district = r.district ?? r.bezirk?.name ?? r.categories?.[0]?.name;
            return (
              <MapIntentLink
                key={r._id}
                href={`/map?r=${r.slug}`}
                rel="nofollow"
                className={styles.card}
              >
                <span className={`hv-photo ${styles.photo}`}>
                  {r.photo && (
                    <Image
                      src={r.photo}
                      alt={normalizeName(r.name)}
                      fill
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

      {(showLocationStatus || showLocationSuccess) && (
        <div
          className={`${styles.locationLayer} ${locationStatus.isError ? styles.locationLayerError : ''} ${showLocationSuccess ? styles.locationLayerSuccess : ''}`}
          role={locationStatus.isError ? 'alert' : 'status'}
        >
          <span className={styles.locationText}>
            {showLocationSuccess ? locationSuccessCopy : locationStatus.copy}
          </span>
          {locationStatus.isError && (
            <button
              type="button"
              className={styles.locationAction}
              onClick={handleLocate}
              disabled={locating}
            >
              {locale === 'en' ? 'Retry' : 'Nochmal'}
            </button>
          )}
          <button
            type="button"
            className={styles.locationDismiss}
            onClick={handleDismissLocationStatus}
            aria-label={
              locale === 'en' ? 'Dismiss location notice' : 'Standort-Hinweis ausblenden'
            }
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
