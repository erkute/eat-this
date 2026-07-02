'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
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
  const { user, loading, signOut } = useAuth();
  const locale = useLocale();
  const t = useTranslations('profile');
  const [pickerOpen, setPickerOpen] = useState(false);
  // Map-page reveals write to users/{uid}/unlockedMustEats — unioned with the
  // public face-up set (trial-10 ∪ spot-of-day) so anything publicly revealed
  // is open in the collection too, even right after first signup.
  const { unlockedIds: storedUnlockedIds } = useUnlockedMustEats(user?.uid ?? null);
  const unlockedIds = useMemo(
    () => new Set<string>([...storedUnlockedIds, ...publicFaceUpIds]),
    [storedUnlockedIds, publicFaceUpIds]
  );
  const { profile, setAvatar } = useUserProfile(user?.uid ?? null);
  // Owned spots (the user's map tier) → drives which must-eats appear in the
  // collected grid. Fetches /api/map-data on mount; cached for instant repaint.
  // The same per-user payload also feeds the deck itself — covered cards come
  // back stripped (no dish/image), unlocked ones carry the full card data.
  const { restaurants: ownedRestaurants, mustEats } = useMapData({
    uid: user?.uid ?? null,
    authLoading: loading,
  });
  const ownedRestaurantIds = useMemo(
    () => new Set(ownedRestaurants.map((r) => r._id)),
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

  if (loading || !user) {
    return (
      <main className={styles.page}>
        <div className={styles.loading}>
          <div className={styles.spinner} aria-hidden="true" />
        </div>
      </main>
    );
  }

  const avatarIdx = profile.avatar ?? defaultAvatarFromUid(user.uid);
  const total = ownedMustEats.length;
  const collected = ownedMustEats.filter((m) => unlockedIds.has(m._id)).length;
  const firstName =
    (user.displayName ?? '').split(' ')[0] || (user.email ?? '').split('@')[0] || t('heroTitle');
  const toMapLabel = t('toMap').replace(/\s*→$/, '');
  const packsLabel = t('packsCta').replace(/\s*→$/, '');

  async function handleAvatarChange(choice: AvatarChoice) {
    if (choice === avatarIdx) return;
    await setAvatar(choice);
  }

  return (
    <>
      <main className={styles.page}>
        <div className={styles.shell}>
          <header className={styles.hero}>
            <div className={styles.heroCopy}>
              <p className={styles.heroKicker}>{t('heroKicker')}</p>
              <h1 className={styles.heroName}>{firstName}</h1>
              <p className={styles.heroLead}>{t('heroTitle')}</p>
              <div className={styles.heroActions} aria-label={t('quickActions')}>
                <Link href="/map" rel="nofollow" className={styles.heroLink}>
                  {toMapLabel}
                </Link>
                <a href="#profile-panel-packs" className={styles.heroLink}>
                  {packsLabel}
                </a>
              </div>
            </div>

            <div className={styles.heroProfileCard}>
              <div className={styles.heroAvatar}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className={styles.heroAvatarImg}
                  src={`/pics/avatar/${avatarIdx}.webp?v=3`}
                  alt=""
                />
              </div>
              <div className={styles.heroProfileMeta}>
                <span>{t('avatarKicker')}</span>
                <button
                  type="button"
                  className={styles.heroEdit}
                  onClick={() => setPickerOpen(true)}
                >
                  {t('changeAvatar')}
                </button>
              </div>
            </div>

            <div className={styles.stats}>
              <div className={styles.stat}>
                <span>{t('revealedLabel')}</span>
                <b>
                  {collected} / {total}
                </b>
              </div>
              <div className={styles.stat}>
                <span>{t('statMap')}</span>
                <b>{ownedRestaurants.length}</b>
              </div>
            </div>
          </header>

          <section
            id="profile-panel-spots"
            className={styles.menu}
            style={{ scrollMarginTop: 'calc(72px + var(--staging-banner-h, 0px))' }}
          >
            <div className={styles.secHead} id="gespeicherte-spots">
              <h3>{t('savedHeading')}</h3>
            </div>
            <ProfileSpots uid={user.uid} />
          </section>

          <section
            id="profile-panel-must-eats"
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
            className={styles.menu}
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
