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
    .filter((r, index, all) => r.photo && r.slug && all.findIndex((x) => x.slug === r.slug) === index)
    .slice(0, savedCount > 0 ? Math.min(savedCount, 3) : 3);
  const mustEatCards = [
    ...(mustEatOpen && mustEatPick?.image ? [mustEatPick] : []),
    ...dataMustEats.filter((m) => m._id !== mustEatPick?._id && faceUp.has(m._id) && m.image),
  ].slice(0, Math.min(Math.max(faceUpCount, 1), 5));

  return (
    <section className={styles.section} data-hub-deinewelt="" data-auth-only="">
      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className={styles.kicker}>{greeting}</p>
          <h2 className={styles.title}>{de ? 'Deine Map wartet.' : 'Your map is ready.'}</h2>
          <p className={styles.copyNote}>
            {de ? 'Direkt zu deinen gespeicherten Orten und offenen Must Eats.' : 'Jump into your saved spots and open Must Eats.'}
          </p>

          <div className={styles.actionRow} aria-label={t('actionsLabel')}>
            <Link href="/profile" rel="nofollow" className={styles.profileLink}>
              <span className={styles.actionLabel}>{t('profileAction')}</span>
            </Link>
            <MapIntentLink href="/map" rel="nofollow" className={styles.mapActionLink}>
              {t('mapAction')}
            </MapIntentLink>
          </div>
        </div>

        <div className={styles.discovery}>
          <div className={styles.collectionGrid} aria-label={de ? 'Deine Sammlung' : 'Your collection'}>
            <div className={`${styles.collectionCard} ${styles.spotCard}`}>
              <span className={styles.collectionKicker}>{de ? 'Spots' : 'Spots'}</span>
              <span className={styles.spotStack} data-count={spotPreviews.length}>
                {spotPreviews.map((spot) => (
                  <MapIntentLink
                    href={`/map?r=${spot.slug}`}
                    rel="nofollow"
                    className={styles.spotPhoto}
                    key={spot._id}
                    aria-label={`${normalizeName(spot.name)} ${de ? 'auf der Map öffnen' : 'open on the map'}`}
                  >
                    <span className={styles.spotImage}>
                      <Image src={spot.photo ?? ''} alt="" fill sizes="120px" />
                      <span className={styles.spotName}>{normalizeName(spot.name)}</span>
                    </span>
                  </MapIntentLink>
                ))}
              </span>
            </div>

            <div className={`${styles.collectionCard} ${styles.mustEatCard}`}>
              <span className={styles.collectionKicker}>{de ? 'Must Eats' : 'Must Eats'}</span>
              <span className={styles.mustStack} data-count={mustEatCards.length}>
                {mustEatCards.length > 0 ? (
                  mustEatCards.map((m) => (
                    <MapIntentLink
                      href={`/map?me=${m._id}`}
                      rel="nofollow"
                      className={styles.mustThumb}
                      key={m._id}
                      data-open="true"
                      aria-label={`${m.dish ? normalizeName(m.dish) : 'Must Eat'} ${de ? 'auf der Map öffnen' : 'open on the map'}`}
                    >
                      {m.image && <Image src={m.image} alt="" fill sizes="110px" className={styles.mustImg} />}
                    </MapIntentLink>
                  ))
                ) : (
                  <MapIntentLink href={mustEatHref} rel="nofollow" className={styles.mustThumb} data-open="false">
                    <span className={styles.mustHiddenMark} />
                  </MapIntentLink>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
