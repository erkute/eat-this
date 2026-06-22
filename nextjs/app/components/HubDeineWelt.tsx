'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth';
import { defaultAvatarFromUid, useUserProfile } from '@/lib/firebase/useUserProfile';
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
  const { user, loading } = useAuth();
  const uid = user?.uid ?? null;
  const { profile } = useUserProfile(uid);
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
  const [authHintAvatar, setAuthHintAvatar] = useState<1 | 2 | 3 | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [districtOpen, setDistrictOpen] = useState(false);
  const districtMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setMounted(true);
    try {
      const hint = JSON.parse(window.localStorage.getItem('_authHint') || 'null') as {
        n?: string;
        a?: number;
      } | null;
      if (hint?.n) setAuthHintName(hint.n);
      if (hint?.a === 1 || hint?.a === 2 || hint?.a === 3) setAuthHintAvatar(hint.a);
    } catch {}
  }, []);
  useEffect(() => {
    if (!districtOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (!districtMenuRef.current?.contains(e.target as Node)) setDistrictOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setDistrictOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [districtOpen]);

  const dataMustEats = mounted ? mustEats : initialMapData.mustEats;
  const dataRestaurants = mounted ? restaurants : initialMapData.restaurants;
  const districtOptions = useMemo(
    () =>
      Array.from(
        new Set(dataRestaurants.map((r) => r.district).filter((d): d is string => Boolean(d)))
      ).sort((a, b) => a.localeCompare(b, 'de')),
    [dataRestaurants]
  );

  const firstName = user
    ? (user.displayName ?? '').split(' ')[0] || (user.email ?? '').split('@')[0] || null
    : authHintName;

  // Resolved logged-out → render nothing (the hero stays the first block).
  // While auth is still loading (SSR + pre-hydration) the static shell is
  // rendered for everyone, and globals.css hides it unless the pre-paint
  // data-auth flag (CRITICAL_BOOTSTRAP ← _authHint) marks a signed-in visitor.
  // That way returning users see the section from the first frame instead of
  // it popping in (and shifting the hub) once Firebase auth resolves — only
  // the first name swaps into the kicker, which doesn't move the layout.
  if (!loading && !user) return null;

  // Collection progress = how many Must-Eats are face-up for this visitor vs the
  // total on the map. "Aufgedeckt" must mean the SAME face-up set the map/teaser
  // show: the user's stored unlocks + live proximity/server reveals + the public
  // curated face-up cards (≈10). Counting only the personal unlock cache would
  // wrongly read 0 for someone who already sees the public cards face-up.
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
  // Only count ids that exist in the current dataset (face-up may carry stale
  // ids from other datasets — they're inert but shouldn't inflate the count).
  const mustEatIdSet = new Set(dataMustEats.map((m) => m._id));
  const collected = [...faceUp].filter((id) => mustEatIdSet.has(id)).length;
  const avatarIdx = user
    ? (profile.avatar ?? authHintAvatar ?? defaultAvatarFromUid(user.uid))
    : (authHintAvatar ?? 2);
  const districtRestaurants = selectedDistrict
    ? dataRestaurants.filter(
        (r) => r.district === selectedDistrict || r.bezirk?.name === selectedDistrict
      )
    : dataRestaurants;
  const restaurantPool = districtRestaurants.length ? districtRestaurants : dataRestaurants;
  const spotPick =
    restaurantPool.find((r) => !r.isClosed && r.photo && r.mustEatCount > 0) ??
    restaurantPool.find((r) => !r.isClosed && r.photo) ??
    restaurantPool.find((r) => !r.isClosed) ??
    restaurantPool[0] ??
    null;
  const districtMustEats = selectedDistrict
    ? dataMustEats.filter((m) => m.restaurant.district === selectedDistrict)
    : dataMustEats;
  const mustEatPool = districtMustEats.length ? districtMustEats : dataMustEats;
  const mustEatPick =
    mustEatPool.find((m) => faceUp.has(m._id) && m.image) ??
    mustEatPool.find((m) => !faceUp.has(m._id)) ??
    mustEatPool[0] ??
    null;
  const mustEatOpen = Boolean(mustEatPick && faceUp.has(mustEatPick._id) && mustEatPick.image);
  const spotMeta = spotPick
    ? [
        spotPick.district ?? spotPick.bezirk?.name,
        spotPick.cuisineType ?? spotPick.categories?.[0]?.name,
      ]
        .filter(Boolean)
        .join(' · ') || t('spotPickFallbackMeta')
    : t('spotPickFallbackMeta');
  const mustEatTitle = mustEatPick
    ? normalizeName(
        mustEatOpen ? (mustEatPick.dish ?? t('cardFallback')) : t('mustPickLockedTitle')
      )
    : t('mustPickLockedTitle');
  const mustEatMeta = mustEatPick
    ? normalizeName(mustEatPick.restaurant.name)
    : t('mustPickFallbackMeta');
  const mustEatHref = mustEatPick
    ? mustEatOpen
      ? `/map?me=${mustEatPick._id}`
      : `/map?r=${mustEatPick.restaurant.slug}`
    : '/map';

  return (
    <section className={styles.section} data-hub-deinewelt="" data-auth-only="">
      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className={styles.kicker}>
            {firstName ? t('dockHelloName', { name: firstName }) : t('dockHello')}
          </p>
          <h2 className={styles.title}>{t('dockQuestion')}</h2>
          <p className={styles.progress}>
            {t('dockProgress', { count: collected, spots: dataRestaurants.length })}
          </p>

          <div className={styles.actionRow} aria-label={t('actionsLabel')}>
            <MapIntentLink href="/map" rel="nofollow" className={styles.primaryAction}>
              {t('mapAction')}
            </MapIntentLink>
            <Link href="/profile" rel="nofollow" className={styles.profileLink}>
              <span className={styles.profileAvatar} aria-hidden="true">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/pics/avatar/${avatarIdx}.webp?v=2`} alt="" />
              </span>
              <span className={styles.actionLabel}>{t('profileAction')}</span>
            </Link>
            <div className={styles.districtPicker} ref={districtMenuRef}>
              <button
                type="button"
                className={styles.districtSelect}
                aria-haspopup="listbox"
                aria-expanded={districtOpen}
                onClick={() => setDistrictOpen((open) => !open)}
              >
                <span className={styles.actionLabel}>{selectedDistrict || t('districtTitle')}</span>
              </button>
              {districtOpen && (
                <div className={styles.districtMenu} role="listbox" aria-label={t('districtTitle')}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={!selectedDistrict}
                    className={styles.districtOption}
                    onClick={() => {
                      setSelectedDistrict('');
                      setDistrictOpen(false);
                    }}
                  >
                    {t('districtTitle')}
                  </button>
                  {districtOptions.map((district) => (
                    <button
                      key={district}
                      type="button"
                      role="option"
                      aria-selected={selectedDistrict === district}
                      className={styles.districtOption}
                      onClick={() => {
                        setSelectedDistrict(district);
                        setDistrictOpen(false);
                      }}
                    >
                      {district}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.recommendations} aria-label={t('recommendationsLabel')}>
          <MapIntentLink
            href={spotPick ? `/map?r=${spotPick.slug}` : '/map'}
            rel="nofollow"
            className={`${styles.pickCard} ${styles.spotPick}`}
          >
            <span className={styles.pickKicker}>{t('spotPickKicker')}</span>
            <span className={styles.spotPhoto} data-empty={spotPick?.photo ? 'false' : 'true'}>
              {spotPick?.photo ? (
                <Image
                  src={spotPick.photo}
                  alt=""
                  fill
                  sizes="(min-width: 900px) 360px, 92vw"
                  className={styles.spotImg}
                />
              ) : null}
            </span>
            <span className={styles.pickBody}>
              <strong className={styles.pickTitle}>
                {spotPick ? normalizeName(spotPick.name) : t('spotPickFallbackTitle')}
              </strong>
              <span className={styles.pickMeta}>{spotMeta}</span>
              <span className={styles.pickCta}>{t('openSpot')}</span>
            </span>
          </MapIntentLink>

          <MapIntentLink
            href={mustEatHref}
            rel="nofollow"
            className={`${styles.pickCard} ${styles.mustPick}`}
          >
            <span className={styles.pickKicker}>{t('mustPickKicker')}</span>
            <span className={styles.mustArt} data-open={mustEatOpen ? 'true' : 'false'}>
              {mustEatOpen && mustEatPick?.image ? (
                <Image
                  src={mustEatPick.image}
                  alt=""
                  fill
                  sizes="160px"
                  className={styles.mustImg}
                />
              ) : (
                <span className={styles.mustHiddenMark} aria-hidden="true" />
              )}
            </span>
            <span className={styles.pickBody}>
              <strong className={styles.pickTitle}>{mustEatTitle}</strong>
              <span className={styles.pickMeta}>{mustEatMeta}</span>
              <span className={styles.pickCta}>{t('openMustEat')}</span>
            </span>
          </MapIntentLink>
        </div>
      </div>
    </section>
  );
}
