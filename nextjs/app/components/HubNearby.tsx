'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { useMapData } from '@/lib/map';
import { useUserLocationContext } from '@/lib/map/UserLocationContext';
import { haversineDistance, formatWalkingTime } from '@/lib/map/distance';
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
  // The first client render must match SSR (anon initialMapData + Mitte). Only
  // after mount switch to live data (which may be the cached signed-in payload)
  // + the resolved geolocation — otherwise the nearby list/distances mismatch
  // on hydrate.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  const restaurants = mounted ? live.restaurants : initialMapData.restaurants;
  const activeLocation = mounted ? location : null;
  const loc = activeLocation ?? MITTE;

  const cards = nearestRestaurants(restaurants, loc, authMode ? 2 : 4);
  if (!authMode && mounted && user) return null;
  if (cards.length === 0) return null;

  const title = locale === 'en' ? 'Around you' : 'Um dich herum';
  const locateLabel = locale === 'en' ? 'Locate' : 'Standort';

  return (
    <section
      className="homeV2 hv-section hv-wrap"
      data-hub-nearby=""
      data-auth-nearby={authMode ? '' : undefined}
      data-auth-only={authMode ? '' : undefined}
      data-guest-only={authMode ? undefined : ''}
    >
      <div className="hv-head">
        <h2 className="hv-title">
          <span className="hv-mk" aria-hidden="true" />
          {title}
        </h2>
        <button
          type="button"
          className={styles.locBtn}
          onClick={() => request()}
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

      {/* Geolocation failed → tell the user instead of silently staying on the
          Mitte fallback (denied permission no-ops on every further click). */}
      {mounted && locError && !activeLocation ? (
        <p className={`${styles.sub} ${styles.subError}`} role="status">
          {locError === 'denied' ? t('errDenied') : t('errRetry')}
        </p>
      ) : (
        <p className={styles.sub}>{activeLocation ? t('sub') : t('subFallback')}</p>
      )}

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
  );
}
