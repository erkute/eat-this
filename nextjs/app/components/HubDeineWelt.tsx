'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth';
import { useFavorites } from '@/lib/map/useFavorites';
import { useMapData, useUnlockedMustEats, resolveUnlockedMustEatIds } from '@/lib/map';
import { normalizeName } from '@/lib/normalizeName';
import type { InitialMapData } from '@/lib/map/server-initial-map-data';
import MapIntentLink from './MapIntentLink';
import styles from './HubDeineWelt.module.css';

interface Props {
  initialMapData: InitialMapData;
}

export default function HubDeineWelt({ initialMapData }: Props) {
  const t = useTranslations('hub.deineWelt');
  const locale = useLocale();
  const de = locale === 'de';
  const { user, loading } = useAuth();
  const uid = user?.uid ?? null;
  const { favorites } = useFavorites(uid);
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

  const firstName = user
    ? (user.displayName ?? '').split(' ')[0] || (user.email ?? '').split('@')[0] || null
    : authHintName;
  const greeting = firstName ? `Hey ${firstName}` : 'Hey';

  // Resolved logged-out → render nothing (the hero stays the first block).
  // While auth is still loading (SSR + pre-hydration) the static shell is
  // rendered for everyone, and globals.css hides it unless the pre-paint
  // data-auth flag (CRITICAL_BOOTSTRAP ← _authHint) marks a signed-in visitor.
  // That way returning users see the section from the first frame instead of
  // it popping in (and shifting the hub) once Firebase auth resolves — only
  // the first name swaps into the kicker, which doesn't move the layout.
  if (!loading && !user) return null;

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
  const mustEatPick =
    dataMustEats.find((m) => faceUp.has(m._id) && m.image) ??
    dataMustEats.find((m) => !faceUp.has(m._id)) ??
    dataMustEats[0] ??
    null;
  const mustEatOpen = Boolean(mustEatPick && faceUp.has(mustEatPick._id) && mustEatPick.image);
  const mustEatHref = mustEatPick
    ? mustEatOpen
      ? `/map?me=${mustEatPick._id}`
      : `/map?r=${mustEatPick.restaurant.slug}`
    : '/map';
  const savedCount = favorites.length;
  const faceUpCount = faceUp.size;
  const savedPreviewPool = favorites.map((f) => ({
    _id: f.restaurantId,
    name: f.name,
    slug: f.slug ?? '',
    photo: f.photo ?? '',
    district: f.district ?? '',
  }));
  const spotPreviewPool = savedCount > 0 ? savedPreviewPool : dataRestaurants;
  const spotPreviews = spotPreviewPool
    .filter(
      (r, index, all) => r.photo && r.slug && all.findIndex((x) => x.slug === r.slug) === index
    )
    .slice(0, savedCount > 0 ? Math.min(savedCount, 6) : 6);
  const mustEatCards = [
    ...(mustEatOpen && mustEatPick?.image ? [mustEatPick] : []),
    ...dataMustEats.filter((m) => m._id !== mustEatPick?._id && faceUp.has(m._id) && m.image),
  ].slice(0, Math.min(Math.max(faceUpCount, 1), 8));

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
          <p className={`hv-kicker ${styles.kicker}`}>{greeting}</p>
          <h2 className={styles.headline}>{de ? 'Deine Map wartet.' : 'Your map is ready.'}</h2>
          <p className={styles.sub}>
            {de
              ? 'Direkt zu deinen gespeicherten Orten und offenen Must Eats.'
              : 'Jump into your saved spots and open Must Eats.'}
          </p>

          <div className={styles.actions} aria-label={t('actionsLabel')}>
            <MapIntentLink href="/map" rel="nofollow" className={`hv-btn ${styles.mapBtn}`}>
              {t('mapAction')}
            </MapIntentLink>
            <Link
              href="/profile"
              rel="nofollow"
              className={`hv-link-underline ${styles.profileBtn}`}
            >
              <span>{t('profileAction')}</span>
            </Link>
          </div>
        </div>

        {/* ── Right: photo rails ───────────────────────────────── */}
        <div className={styles.rails} aria-label={de ? 'Deine Sammlung' : 'Your collection'}>
          {/* Saved spots rail */}
          <div className={styles.railBlock}>
            <span className={`hv-kicker ${styles.railLabel}`}>{de ? 'Gespeichert' : 'Saved'}</span>
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
            <span className={`hv-sub ${styles.railSub}`}>
              {savedCount > 0
                ? `${savedCount} ${de ? 'Spots' : 'Spots'}`
                : de
                  ? 'Noch keine'
                  : 'None yet'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Must Eats: full-width row below the hero grid ─────────── */}
      <div
        className={`hv-wrap ${styles.mustEatsRow}`}
        aria-label={de ? 'Deine Must Eats' : 'Your Must Eats'}
      >
        <div className={styles.railBlock}>
          <span className={`hv-kicker ${styles.railLabel}`}>Must Eats</span>
          <div className={`hv-rail ${styles.rail}`}>
            {mustEatCards.length > 0 ? (
              mustEatCards.map((m) => (
                <MapIntentLink
                  href={`/map?me=${m._id}`}
                  rel="nofollow"
                  className={`hv-photo ${styles.railPhoto} ${styles.mustPhoto}`}
                  key={m._id}
                  data-open="true"
                  aria-label={`${m.dish ? normalizeName(m.dish) : 'Must Eat'} ${de ? 'auf der Map öffnen' : 'open on the map'}`}
                >
                  {m.image && (
                    <Image
                      src={m.image}
                      alt=""
                      fill
                      sizes="110px"
                      style={{ objectFit: 'contain' }}
                    />
                  )}
                </MapIntentLink>
              ))
            ) : (
              <MapIntentLink
                href={mustEatHref}
                rel="nofollow"
                className={`hv-photo ${styles.railPhoto} ${styles.mustPhoto} ${styles.railPhotoEmpty}`}
                data-open="false"
              >
                <span className={styles.railEmptyMark} />
              </MapIntentLink>
            )}
          </div>
          <span className={`hv-sub ${styles.railSub}`}>
            {faceUpCount > 0
              ? `${faceUpCount} ${de ? 'offen' : 'open'}`
              : de
                ? 'Entdecken'
                : 'Discover'}
          </span>
        </div>
      </div>
    </section>
  );
}
