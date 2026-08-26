'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { useUnlockedMustEats, useMapData } from '@/lib/map';
import {
  defaultAvatarFromUid,
  useUserProfile,
  type AvatarChoice,
} from '@/lib/firebase/useUserProfile';
import { TOAST_HANDOFF_KEY } from '../NotificationToast';
import ProfileSpots from './ProfileSpots';
import ProfileAlbum from './ProfileAlbum';
import ProfileCityProgress from './ProfileCityProgress';
import ProfilePacks from './ProfilePacks';
import ProfileRecentReveals from './ProfileRecentReveals';
import ProfileInvite from './ProfileInvite';
import AvatarPickerModal from './AvatarPickerModal';
import SiteFooter from '../SiteFooter';
import styles from './Profile.module.css';

interface Props {
  /** Server-computed anon face-up set (trial-10 ∪ spot-of-day). Publicly
   *  face-up cards stay face-up in the collection too. */
  publicFaceUpIds: string[];
}

// The profile speaks the home's visual language: one white page, the homeV2
// element vocabulary (hv-wrap / hv-section / hv-head / hv-title / hv-rail),
// photos straight on the paper. No dossier panels, no polaroid, no menu dots —
// those were three metaphors the rest of the site doesn't use.
//
// Order follows why someone opens this page: the deck first, then what they
// just turned over, then their spots, their packs, and the invite.
export default function ProfileShell({ publicFaceUpIds }: Props) {
  const { user, loading: authLoading, signOut } = useAuth();
  const locale = useLocale();
  const t = useTranslations('profile');
  const [pickerOpen, setPickerOpen] = useState(false);
  // Map-page reveals write to users/{uid}/unlockedMustEats — unioned with the
  // public face-up set (trial-10 ∪ spot-of-day) so anything publicly revealed
  // is open in the collection too, even right after first signup.
  const { unlockedIds: storedUnlockedIds, unlockedAt } = useUnlockedMustEats(user?.uid ?? null);
  const { profile, setAvatar } = useUserProfile(user?.uid ?? null);
  // Owned spots (the user's map tier) → drives which must-eats appear in the
  // collected grid. Fetches /api/map-data on mount; cached for instant repaint.
  // The same per-user payload also feeds the deck itself — covered cards come
  // back stripped (no dish/image), unlocked ones carry the full card data.
  const {
    restaurants: ownedRestaurants,
    mustEats,
    revealedMustEatIds,
    loading: mapDataLoading,
    error: mapDataError,
    refetch: refetchMapData,
  } = useMapData({
    uid: user?.uid ?? null,
    authLoading,
  });
  const unlockedIds = useMemo(
    () => new Set<string>([...storedUnlockedIds, ...publicFaceUpIds, ...revealedMustEatIds]),
    [storedUnlockedIds, publicFaceUpIds, revealedMustEatIds]
  );
  const hasMapData = ownedRestaurants.length > 0 || mustEats.length > 0;
  const ownedRestaurantIds = useMemo(
    () => new Set(ownedRestaurants.map((r) => r._id)),
    [ownedRestaurants]
  );
  const ownedRestaurantSlugs = useMemo(
    () => new Map(ownedRestaurants.map((r) => [r._id, r.slug])),
    [ownedRestaurants]
  );
  // Only Must-Eats whose spot the user owns appear in the album.
  const ownedMustEats = useMemo(
    () => mustEats.filter((m) => ownedRestaurantIds.has(m.restaurant._id)),
    [mustEats, ownedRestaurantIds]
  );
  // MapMustEat.restaurant has no categories, so join through the owned
  // restaurants (which carry categories) to give the album its page groups.
  const catByRest = useMemo(
    () => new Map(ownedRestaurants.map((r) => [r._id, r.categories?.[0]?.name ?? 'Sonstige'])),
    [ownedRestaurants]
  );

  if (authLoading || !user || (mapDataLoading && !hasMapData)) {
    return (
      <main className={`homeV2 ${styles.page}`} data-menu>
        <div className={styles.loading} role="status" aria-label={t('dataLoading')}>
          <div className={styles.spinner} aria-hidden="true" />
        </div>
      </main>
    );
  }

  if (mapDataError && !hasMapData) {
    return (
      <>
        <main className={`homeV2 ${styles.page}`} data-menu>
          <div className="hv-wrap">
            <div className={`${styles.dataNotice} ${styles.dataNoticeError}`} role="alert">
              <p>{t('dataError')}</p>
              <button type="button" className={styles.dataNoticeAction} onClick={refetchMapData}>
                {t('dataRetry')}
              </button>
            </div>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  const avatarIdx = profile.avatar ?? defaultAvatarFromUid(user.uid);
  const firstName =
    (user.displayName ?? '').split(' ')[0] || (user.email ?? '').split('@')[0] || t('heroTitle');
  const accountLabel = user.email ?? t('heroLine');

  async function handleAvatarChange(choice: AvatarChoice) {
    if (choice === avatarIdx) return;
    await setAvatar(choice);
  }

  return (
    <>
      <main className={`homeV2 ${styles.page}`} data-menu>
        {(mapDataLoading || mapDataError) && (
          <div className="hv-wrap">
            <div
              className={`${styles.dataNotice}${mapDataError ? ` ${styles.dataNoticeError}` : ''}`}
              role={mapDataError ? 'alert' : 'status'}
              aria-live="polite"
            >
              <p>{mapDataError ? t('dataStale') : t('dataRefreshing')}</p>
              {mapDataError && (
                <button type="button" className={styles.dataNoticeAction} onClick={refetchMapData}>
                  {t('dataRetry')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* No counters here on purpose: a raw spot tally is a receipt, not a
            profile — and the product deliberately doesn't state its numbers.
            The only count that stays is the deck's own progress. */}
        <header className="hv-wrap">
          <div className={styles.heroGrid}>
            <div className={styles.heroCopy}>
              <p className="hv-kicker">
                <span className="hv-mk" aria-hidden="true" />
                {t('heroKicker')}
              </p>
              <h1 className={styles.heroName}>{firstName}</h1>
              <p className={styles.heroLine}>{t('heroLine')}</p>
            </div>

            {/* The character is the one thing on this page that is purely the
                user's, so it gets the room the home gives its phone mockups:
                cut out, straight on the white, no frame. */}
            <div className={styles.heroCharacter}>
              <button
                type="button"
                className={styles.heroAvatar}
                onClick={() => setPickerOpen(true)}
                aria-label={t('changeAvatar')}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className={styles.heroAvatarImg}
                  src={`/pics/avatar/${avatarIdx}.webp?v=3`}
                  alt=""
                />
              </button>
              <button type="button" className={styles.heroEdit} onClick={() => setPickerOpen(true)}>
                {t('changeAvatar')}
              </button>
            </div>
          </div>
        </header>

        {/* Die eine Zahl zuerst: wie viel von Berlin schon offen ist. */}
        <ProfileCityProgress uid={user.uid} />

        <section className={`hv-section hv-wrap ${styles.section}`}>
          <ProfileAlbum
            mustEats={ownedMustEats}
            faceUpIds={unlockedIds}
            categoryOf={(m) => catByRest.get(m.restaurant._id) ?? 'Sonstige'}
          />
        </section>

        <ProfileRecentReveals mustEats={ownedMustEats} unlockedAt={unlockedAt} />

        <section className={`hv-section hv-wrap ${styles.section}`}>
          <div className={`hv-head ${styles.head}`}>
            <h2 className="hv-title">{t('savedHeading')}</h2>
          </div>
          <ProfileSpots uid={user.uid} restaurantSlugs={ownedRestaurantSlugs} />
        </section>

        <section className={`hv-section hv-wrap ${styles.section}`}>
          <ProfilePacks uid={user.uid} />
        </section>

        <section className={`hv-section hv-wrap ${styles.section}`}>
          <ProfileInvite uid={user.uid} />
        </section>

        {/* Account chrome belongs at the bottom, quiet: it is the one thing
            nobody comes to this page for. */}
        <div className={`hv-wrap ${styles.foot}`}>
          <span className={styles.footAccount}>
            {t('fieldAccount')}: {accountLabel}
          </span>
          <button
            type="button"
            className={styles.logout}
            onClick={() => {
              // Sign-out hard-navigates to '/' (ProfileAuthGuard) — park the
              // confirmation so the toast shows after the reload.
              try {
                sessionStorage.setItem(
                  TOAST_HANDOFF_KEY,
                  locale === 'de' ? 'Du bist abgemeldet' : "You're signed out"
                );
              } catch {
                /* private mode */
              }
              void signOut();
            }}
          >
            {t('signOut')}
          </button>
        </div>
      </main>
      <SiteFooter />
      {pickerOpen && (
        <AvatarPickerModal
          current={avatarIdx}
          onApply={handleAvatarChange}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  );
}
