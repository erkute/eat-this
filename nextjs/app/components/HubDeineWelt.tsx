'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth';
import { useMapData, useUnlockedMustEats, resolveUnlockedMustEatIds } from '@/lib/map';
import { useUserLocationContext } from '@/lib/map/UserLocationContext';
import { haversineDistance } from '@/lib/map/distance';
import { normalizeName } from '@/lib/normalizeName';
import type { InitialMapData } from '@/lib/map/server-initial-map-data';
import type { MapRestaurant } from '@/lib/types';
import MapIntentLink from './MapIntentLink';
import styles from './HubDeineWelt.module.css';

const CARD_BACK = '/pics/card-back.webp?v=6';
const PROFILE_MUST_EATS_HREF = '/profile#profile-panel-must-eats';
const RECOMMENDED_SPOT_LIMIT = 6;
const NEARBY_RANDOM_POOL = 18;

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededPick(restaurants: MapRestaurant[], seed: string, limit: number): MapRestaurant[] {
  return [...restaurants]
    .sort((a, b) => hashString(`${seed}:${a._id}`) - hashString(`${seed}:${b._id}`))
    .slice(0, limit);
}

interface Props {
  initialMapData: InitialMapData;
}

export default function HubDeineWelt({ initialMapData }: Props) {
  const t = useTranslations('hub.deineWelt');
  const locale = useLocale();
  const de = locale === 'de';
  const { user, loading } = useAuth();
  const uid = user?.uid ?? null;
  const { location } = useUserLocationContext();
  const { restaurants, mustEats, revealedMustEatIds } = useMapData({
    uid,
    authLoading: loading,
    initialMapData,
  });
  const { unlockedIds } = useUnlockedMustEats(uid);

  // The live face-up set depends on the per-uid localStorage cache + the live
  // /api/map-data payload, so it's client-only — until mount, fall back to the
  // SSR anon payload so the shell and first client paint match (no hydration
  // mismatch); after mount it switches to the signed-in data.
  const [mounted, setMounted] = useState(false);
  const [authHintName, setAuthHintName] = useState<string | null>(null);
  useEffect(() => {
    setMounted(true);
    try {
      const hint = JSON.parse(window.localStorage.getItem('_authHint') || 'null') as {
        n?: string;
      } | null;
      if (hint?.n) setAuthHintName(hint.n);
    } catch {}
  }, []);

  const dataMustEats = mounted ? mustEats : initialMapData.mustEats;
  const dataRestaurants = mounted ? restaurants : initialMapData.restaurants;
  const activeLocation = mounted ? location : null;

  const firstName = user
    ? (user.displayName ?? '').split(' ')[0] || (user.email ?? '').split('@')[0] || null
    : authHintName;
  const greeting = firstName ? `Hey ${firstName}` : 'Hey';

  // Face-up set for the Must-Eat pick = the SAME face-up set the map/teaser show:
  // the user's stored unlocks + live proximity/server reveals + the public curated
  // face-up cards (≈10).
  const effUid = mounted ? uid : null;
  const liveRevealed = mounted
    ? revealedMustEatIds
    : new Set<string>(initialMapData.revealedMustEatIds);
  const storedUnlocked = mounted ? unlockedIds : new Set<string>();
  const publicFaceUpIds = new Set<string>(initialMapData.revealedMustEatIds);
  const faceUp = resolveUnlockedMustEatIds({
    uid: effUid,
    storedUnlockedIds: storedUnlocked,
    revealedMustEatIds: liveRevealed,
    publicFaceUpIds,
  });
  const recommendationSeed = `${uid ?? 'anon'}:${new Date().toISOString().slice(0, 10)}`;
  const spotPreviews = useMemo(() => {
    const uniqueImageSpots = dataRestaurants.filter(
      (r, index, all) =>
        r.photo && r.slug && !r.isClosed && all.findIndex((x) => x.slug === r.slug) === index
    );
    const pool = activeLocation
      ? [...uniqueImageSpots]
          .sort(
            (a, b) =>
              haversineDistance(activeLocation.lat, activeLocation.lng, a.lat, a.lng) -
              haversineDistance(activeLocation.lat, activeLocation.lng, b.lat, b.lng)
          )
          .slice(0, NEARBY_RANDOM_POOL)
      : uniqueImageSpots;

    return seededPick(pool, recommendationSeed, RECOMMENDED_SPOT_LIMIT);
  }, [activeLocation, dataRestaurants, recommendationSeed]);
  const ownedRestaurantIds = new Set(dataRestaurants.map((r) => r._id));
  const collectionMustEats = ownedRestaurantIds.size > 0
    ? dataMustEats.filter((m) => ownedRestaurantIds.has(m.restaurant._id))
    : dataMustEats;
  const openMustEatCards = collectionMustEats.filter((m) => faceUp.has(m._id) && m.image);
  const coveredMustEatCards = collectionMustEats.filter((m) => !faceUp.has(m._id) || !m.image);
  const mustEatCards = [...openMustEatCards.slice(0, 3), ...coveredMustEatCards.slice(0, 5)]
    .slice(0, 8);

  // Resolved logged-out → render nothing (the hero stays the first block).
  // While auth is still loading (SSR + pre-hydration) the static shell is
  // rendered for everyone, and globals.css hides it unless the pre-paint
  // data-auth flag (CRITICAL_BOOTSTRAP ← _authHint) marks a signed-in visitor.
  // That way returning users see the section from the first frame instead of
  // it popping in (and shifting the hub) once Firebase auth resolves — only
  // the first name swaps into the kicker, which doesn't move the layout.
  if (!loading && !user) return null;

  return (
    <section
      className={`homeV2 ${styles.hero}`}
      data-hub-deinewelt=""
      data-auth-only=""
      aria-label={de ? 'Deine Welt' : 'Your world'}
    >
      <div className={`hv-wrap ${styles.heroInner}`}>
        {/* ── Left: copy + actions ─────────────────────────────── */}
        <div className={styles.copy}>
          <p className={styles.kicker}>{greeting}</p>
          <h2 className={styles.headline}>{de ? 'Deine Map wartet.' : 'Your map is ready.'}</h2>
          <p className={styles.sub}>
            {de
              ? 'Direkt zu empfohlenen Spots um dich herum und offenen Must Eats.'
              : 'Jump into recommended spots around you and open Must Eats.'}
          </p>

          <div className={styles.actions} aria-label={t('actionsLabel')}>
            <MapIntentLink href="/map" rel="nofollow" className={`hv-btn ${styles.mapBtn}`}>
              {t('mapAction')}
            </MapIntentLink>
            <Link
              href="/profile"
              rel="nofollow"
              prefetch={false}
              className={`hv-link-underline ${styles.profileBtn}`}
            >
              <span>{t('profileAction')}</span>
            </Link>
          </div>
        </div>

        {/* ── Right: photo rails ───────────────────────────────── */}
        <div className={styles.rails} aria-label={de ? 'Empfohlene Spots' : 'Recommended spots'}>
          {/* Recommended spots rail */}
          <div className={styles.railBlock}>
            <span className={styles.railLabel}>{de ? 'Empfohlene Spots' : 'Recommended Spots'}</span>
            <div className={`hv-rail ${styles.rail}`}>
              {spotPreviews.length > 0 ? (
                spotPreviews.map((spot) => (
                  <MapIntentLink
                    href={`/map?r=${spot.slug}`}
                    rel="nofollow"
                    className={`hv-photo ${styles.railPhoto}`}
                    key={spot._id}
                    aria-label={`${normalizeName(spot.name)} ${de ? 'auf der Map öffnen' : 'open on the map'}`}
                  >
                    <Image src={spot.photo ?? ''} alt="" fill sizes="110px" />
                    <span className={styles.railPhotoName}>{normalizeName(spot.name)}</span>
                  </MapIntentLink>
                ))
              ) : (
                <MapIntentLink
                  href="/map"
                  rel="nofollow"
                  className={`hv-photo ${styles.railPhoto} ${styles.railPhotoEmpty}`}
                >
                  <span className={styles.railEmptyMark} />
                </MapIntentLink>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Must Eats: full-width row below the hero grid ─────────── */}
      <div
        className={`hv-wrap ${styles.mustEatsRow}`}
        aria-label={de ? 'Deine Must Eats' : 'Your Must Eats'}
      >
        <div className={styles.railBlock}>
          <span className={styles.railLabel}>Must Eats</span>
          <div className={`hv-rail ${styles.rail}`}>
            {mustEatCards.length > 0 ? (
              mustEatCards.map((m) => {
                const open = faceUp.has(m._id) && Boolean(m.image);
                return (
                  <Link
                    href={PROFILE_MUST_EATS_HREF}
                    rel="nofollow"
                    prefetch={false}
                    className={`hv-photo ${styles.railPhoto} ${styles.mustPhoto}`}
                    key={m._id}
                    data-open={open ? 'true' : 'false'}
                    aria-label={`${open && m.dish ? normalizeName(m.dish) : de ? 'Verdecktes Must Eat' : 'Face-down Must Eat'} ${de ? 'in deinen Must Eats öffnen' : 'open in your Must Eats'}`}
                  >
                    {open && m.image ? (
                      <Image
                        src={m.image}
                        alt=""
                        fill
                        sizes="110px"
                        className={styles.mustImg}
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className={styles.mustBack} src={CARD_BACK} alt="" loading="lazy" />
                    )}
                  </Link>
                );
              })
            ) : (
              <Link
                href={PROFILE_MUST_EATS_HREF}
                rel="nofollow"
                prefetch={false}
                className={`hv-photo ${styles.railPhoto} ${styles.mustPhoto} ${styles.railPhotoEmpty}`}
                data-open="false"
              >
                <span className={styles.railEmptyMark} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
