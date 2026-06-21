'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth';
import { useUnlockedMustEats, useMapData } from '@/lib/map';
import { defaultAvatarFromUid, useUserProfile, type AvatarChoice } from '@/lib/firebase/useUserProfile';
import { TOAST_HANDOFF_KEY } from '../NotificationToast';
import ProfileSpots from './ProfileSpots';
import ProfileMustEats from './ProfileMustEats';
import ProfilePacks from './ProfilePacks';
import SiteFooter from '../SiteFooter';
import styles from './ProfileSlim.module.css';

interface Props {
  /** Server-computed anon face-up set (trial-10 ∪ spot-of-day). Publicly
   *  face-up cards stay face-up in the collection too. */
  publicFaceUpIds: string[];
}

const AVATAR_CHOICES = [1, 2, 3] as const;

function memberSince(creationTime: string | undefined, locale: string): string | null {
  if (!creationTime) return null;
  const d = new Date(creationTime);
  if (Number.isNaN(d.getTime())) return null;
  const intlLocale = locale === 'de' ? 'de-DE' : 'en-US';
  return new Intl.DateTimeFormat(intlLocale, { month: 'long', year: 'numeric' }).format(d);
}

// Slim profile (mockup-chewy screens 15/16): one cream scroll — head, saved
// spots, collected must-eats, packs, logout, footer. No tabs/settings/referral.
export default function ProfileShell({ publicFaceUpIds }: Props) {
  const { user, loading, signOut } = useAuth();
  const locale = useLocale();
  const t = useTranslations('profile');
  const [avatarSaving, setAvatarSaving] = useState<AvatarChoice | null>(null);
  const [avatarError, setAvatarError] = useState(false);
  // Map-page reveals write to users/{uid}/unlockedMustEats — unioned with the
  // public face-up set (trial-10 ∪ spot-of-day) so anything publicly revealed
  // is open in the collection too, even right after first signup.
  const { unlockedIds: storedUnlockedIds } = useUnlockedMustEats(user?.uid ?? null);
  const unlockedIds = useMemo(
    () => new Set<string>([...storedUnlockedIds, ...publicFaceUpIds]),
    [storedUnlockedIds, publicFaceUpIds],
  );
  const { profile, loading: profileLoading, setAvatar } = useUserProfile(user?.uid ?? null);
  // Owned spots (the user's map tier) → drives which must-eats appear in the
  // collected grid. Fetches /api/map-data on mount; cached for instant repaint.
  // The same per-user payload also feeds the deck itself — covered cards come
  // back stripped (no dish/image), unlocked ones carry the full card data.
  const { restaurants: ownedRestaurants, mustEats } = useMapData({ uid: user?.uid ?? null, authLoading: loading });
  const ownedRestaurantIds = useMemo(
    () => new Set(ownedRestaurants.map((r) => r._id)),
    [ownedRestaurants],
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
  const since = memberSince(user.metadata?.creationTime, locale);
  const sinceLabel = locale === 'de' ? 'Mitglied seit' : 'Member since';
  const discoveredCount = [...unlockedIds].filter((id) => mustEats.some((m) => m._id === id)).length;

  async function handleAvatarChange(choice: AvatarChoice) {
    if (choice === avatarIdx || avatarSaving) return;
    setAvatarError(false);
    setAvatarSaving(choice);
    try {
      await setAvatar(choice);
    } catch {
      setAvatarError(true);
    } finally {
      setAvatarSaving(null);
    }
  }

  return (
    <>
      <main className={styles.page}>
        <div className={styles.shell}>
          <header className={styles.head}>
            <div className={styles.avatar} aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/pics/avatar/${avatarIdx}.webp?v=2`} alt="" />
            </div>
            <div className={styles.info}>
              {since && <div className={styles.kicker}>{sinceLabel} {since}</div>}
              <h1 className={styles.name}>{t('heroTitle')}</h1>
              <div className={styles.stats} aria-label={t('heroTitle')}>
                <div className={styles.stat}>
                  <strong>{ownedRestaurants.length}</strong>
                  <span>{t('statMap')}</span>
                </div>
                <div className={styles.stat}>
                  <strong>{discoveredCount}</strong>
                  <span>{t('statDiscovered')}</span>
                </div>
              </div>
              <div className={styles.quickActions} aria-label={t('quickActions')}>
                <Link href="/map" rel="nofollow" className={styles.quickAction}>{t('toMap')}</Link>
                <Link href="/#hub-allberlin" rel="nofollow" className={styles.quickAction}>{t('packsCta')}</Link>
              </div>
            </div>
          </header>

          <section className={styles.character} aria-labelledby="profile-character-title">
            <div className={styles.characterCopy}>
              <p className={styles.characterKicker}>{t('avatarKicker')}</p>
              <h2 id="profile-character-title" className={styles.characterTitle}>{t('avatarTitle')}</h2>
              <p className={styles.avatarStatus}>
                {avatarError ? t('avatarError') : avatarSaving ? t('avatarSaving') : t('avatarHint')}
              </p>
            </div>
            <div className={styles.avatarPicker} role="radiogroup" aria-label={t('avatarTitle')}>
              {AVATAR_CHOICES.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  role="radio"
                  aria-checked={avatarIdx === choice}
                  className={`${styles.avatarChoice} ${avatarIdx === choice ? styles.avatarChoiceActive : ''}`}
                  disabled={profileLoading || avatarSaving !== null}
                  onClick={() => void handleAvatarChange(choice)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/pics/avatar/${choice}.webp?v=2`} alt={t('avatarChoice', { n: choice })} />
                </button>
              ))}
            </div>
          </section>

          <section
            id="profile-panel-spots"
            className={styles.profileBlock}
            style={{ scrollMarginTop: 'calc(72px + var(--staging-banner-h, 0px))' }}
          >
            <div className={styles.section} id="gespeicherte-spots">
              <h2 className={styles.sectionHeading}>{t('savedHeading')}</h2>
            </div>
            <ProfileSpots uid={user.uid} />
          </section>

          <section
            id="profile-panel-must-eats"
            className={styles.profileBlock}
            style={{ scrollMarginTop: 'calc(72px + var(--staging-banner-h, 0px))' }}
          >
            <ProfileMustEats
              mustEats={mustEats}
              mapUnlockedIds={unlockedIds}
              ownedRestaurantIds={ownedRestaurantIds}
            />
          </section>

          <section
            id="profile-panel-packs"
            className={styles.profileBlock}
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
                sessionStorage.setItem(TOAST_HANDOFF_KEY, locale === 'de' ? 'Du bist abgemeldet' : "You're signed out");
              } catch { /* private mode */ }
              void signOut();
            }}
          >
            {t('signOut')}
          </button>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
