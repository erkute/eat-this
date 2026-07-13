'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { useUnlockedMustEats, useMapData } from '@/lib/map';
import { isAlbumMustEatCollected, type AlbumMustEat } from '@/lib/profile/mustEatAlbum';
import {
  defaultAvatarFromUid,
  useUserProfile,
  type AvatarChoice,
} from '@/lib/firebase/useUserProfile';
import { TOAST_HANDOFF_KEY } from '../NotificationToast';
import ProfileSpots from './ProfileSpots';
import ProfileAlbum from './ProfileAlbum';
import ProfilePacks from './ProfilePacks';
import AvatarPickerModal from './AvatarPickerModal';
import SiteFooter from '../SiteFooter';
import styles from './ProfileSlim.module.css';

interface Props {
  /** Server-computed anon face-up set (trial-10 ∪ spot-of-day). Publicly
   *  face-up cards stay face-up in the collection too. */
  publicFaceUpIds: string[];
}

// Slim profile (mockup-chewy screens 15/16): one cream scroll — head, saved
// spots, collected must-eats, packs, logout, footer. No tabs/settings/referral.
export default function ProfileShell({ publicFaceUpIds }: Props) {
  const { user, loading: authLoading, signOut } = useAuth();
  const locale = useLocale();
  const t = useTranslations('profile');
  const [pickerOpen, setPickerOpen] = useState(false);
  // Map-page reveals write to users/{uid}/unlockedMustEats — unioned with the
  // public face-up set (trial-10 ∪ spot-of-day) so anything publicly revealed
  // is open in the collection too, even right after first signup.
  const { unlockedIds: storedUnlockedIds } = useUnlockedMustEats(user?.uid ?? null);
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
    () => new Set<string>([
      ...storedUnlockedIds,
      ...publicFaceUpIds,
      ...revealedMustEatIds,
    ]),
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
  const collectedMustEatCount = useMemo(
    () =>
      ownedMustEats.filter((m) => isAlbumMustEatCollected(m as AlbumMustEat, unlockedIds)).length,
    [ownedMustEats, unlockedIds]
  );
  // MapMustEat.restaurant has no categories, so join through the owned
  // restaurants (which carry categories) to give the album its page groups.
  const catByRest = useMemo(
    () => new Map(ownedRestaurants.map((r) => [r._id, r.categories?.[0]?.name ?? 'Sonstige'])),
    [ownedRestaurants]
  );

  if (authLoading || !user || (mapDataLoading && !hasMapData)) {
    return (
      <main className={styles.page} data-menu>
        <div className={styles.loading} role="status" aria-label={t('dataLoading')}>
          <div className={styles.spinner} aria-hidden="true" />
        </div>
      </main>
    );
  }

  if (mapDataError && !hasMapData) {
    return (
      <>
        <main className={styles.page} data-menu>
          <div className={styles.shell}>
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
      <main className={styles.page} data-menu>
        <div className={styles.shell}>
          {(mapDataLoading || mapDataError) && (
            <div
              className={`${styles.dataNotice}${mapDataError ? ` ${styles.dataNoticeError}` : ''}`}
              role={mapDataError ? 'alert' : 'status'}
              aria-live="polite"
            >
              <p>{mapDataError ? t('dataStale') : t('dataRefreshing')}</p>
              {mapDataError && (
                <button
                  type="button"
                  className={styles.dataNoticeAction}
                  onClick={refetchMapData}
                >
                  {t('dataRetry')}
                </button>
              )}
            </div>
          )}
          <header className={styles.hero}>
            <div className={styles.paper}>
              <div className={styles.paperTop}>
                <div className={styles.brandStamp} aria-label="Eat This">
                  <span>EAT THIS</span>
                  <strong>{t('profileTitle')}</strong>
                </div>
              </div>

              <div className={styles.heroLayout}>
                <div className={styles.heroCopy}>
                  <p className={styles.heroKicker}>{t('heroKicker')}</p>
                  <h1 className={styles.heroCounts}>
                    <span className={styles.heroCount}>
                      <b>{ownedRestaurants.length}</b>
                      <span>{t('tabSpots')}</span>
                    </span>
                    <span className={styles.heroCount}>
                      <b>{collectedMustEatCount}</b>
                      <span>{t('tabMustEats')}</span>
                    </span>
                  </h1>

                  <dl className={styles.formRows}>
                    <div className={styles.formRow}>
                      <dt>{t('fieldName')}</dt>
                      <dd>{firstName}</dd>
                    </div>
                    <div className={styles.formRow}>
                      <dt>{t('fieldAccount')}</dt>
                      <dd>{accountLabel}</dd>
                    </div>
                  </dl>
                </div>

                <div className={styles.photoDock}>
                  <div className={styles.polaroid}>
                    <span className={styles.photoClip} aria-hidden="true" />
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
                    <span className={styles.photoCaption}>{t('avatarKicker')}</span>
                    <button
                      type="button"
                      className={styles.heroEdit}
                      onClick={() => setPickerOpen(true)}
                    >
                      {t('changeAvatar')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <section
            id="profile-panel-spots"
            className={`${styles.menu} ${styles.dossierSection}`}
            style={{ scrollMarginTop: 'calc(72px + var(--staging-banner-h, 0px))' }}
          >
            <div className={styles.secHead} id="gespeicherte-spots">
              <h3>{t('savedHeading')}</h3>
            </div>
            <ProfileSpots uid={user.uid} restaurantSlugs={ownedRestaurantSlugs} />
          </section>

          <section
            id="profile-panel-must-eats"
            className={styles.dossierSection}
            style={{ scrollMarginTop: 'calc(72px + var(--staging-banner-h, 0px))' }}
          >
            <ProfileAlbum
              mustEats={ownedMustEats}
              faceUpIds={unlockedIds}
              categoryOf={(m) => catByRest.get(m.restaurant._id) ?? 'Sonstige'}
            />
          </section>

          <section
            id="profile-panel-packs"
            className={`${styles.menu} ${styles.packsSection}`}
            style={{ scrollMarginTop: 'calc(72px + var(--staging-banner-h, 0px))' }}
          >
            <ProfilePacks uid={user.uid} />
          </section>

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
