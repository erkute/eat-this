'use client';

import { useEffect, useMemo, useState } from 'react';
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

type ProfileTab = 'spots' | 'must-eats' | 'packs';
const AVATAR_CHOICES = [1, 2, 3] as const;

function tabFromHash(hash: string): ProfileTab | null {
  switch (hash) {
    case '#profile-panel-spots':
    case '#gespeicherte-spots':
      return 'spots';
    case '#profile-panel-must-eats':
    case '#gesammelte-must-eats':
      return 'must-eats';
    case '#profile-panel-packs':
    case '#meine-packs':
      return 'packs';
    default:
      return null;
  }
}

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
  const [activeTab, setActiveTab] = useState<ProfileTab>('spots');
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

  useEffect(() => {
    const syncHash = () => {
      const tab = tabFromHash(window.location.hash);
      if (tab) setActiveTab(tab);
    };
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  useEffect(() => {
    if (loading) return;
    const hash = window.location.hash;
    if (!tabFromHash(hash)) return;
    requestAnimationFrame(() => {
      document.getElementById(hash.slice(1))?.scrollIntoView({ block: 'start' });
    });
  }, [activeTab, loading]);

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
  const name = user.displayName || (user.email ?? '').split('@')[0] || 'Du';
  const since = memberSince(user.metadata?.creationTime, locale);
  const sinceLabel = locale === 'de' ? 'Mitglied seit' : 'Member since';
  const ownedMustEatTotal = mustEats.filter((m) => ownedRestaurantIds.has(m.restaurant._id)).length;
  const revealedMustEatTotal = mustEats.filter((m) => ownedRestaurantIds.has(m.restaurant._id) && unlockedIds.has(m._id)).length;
  const hiddenMustEatTotal = Math.max(ownedMustEatTotal - revealedMustEatTotal, 0);

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
        <header className={styles.head}>
          <div className={styles.avatar} aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/pics/avatar/${avatarIdx}.webp`} alt="" />
          </div>
          <div className={styles.info}>
            {since && <div className={styles.kicker}>{sinceLabel} {since}</div>}
            <h1 className={styles.name}>{name}</h1>
            {user.email && <div className={styles.email}>{user.email}</div>}
          </div>
          <div className={styles.heroCard}>
            <span>{t('heroKicker')}</span>
            <strong>{revealedMustEatTotal}/{ownedMustEatTotal || '–'}</strong>
          </div>
        </header>

        <section className={styles.character} aria-labelledby="profile-character-title">
          <div>
            <p className={styles.characterKicker}>{t('avatarKicker')}</p>
            <h2 id="profile-character-title" className={styles.characterTitle}>{t('avatarTitle')}</h2>
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
                <img src={`/pics/avatar/${choice}.webp`} alt={t('avatarChoice', { n: choice })} />
              </button>
            ))}
          </div>
          <p className={styles.avatarStatus}>
            {avatarError ? t('avatarError') : avatarSaving ? t('avatarSaving') : t('avatarHint')}
          </p>
        </section>

        <section className={styles.command}>
          <p className={styles.commandKicker}>{t('heroKicker')}</p>
          <h2 className={styles.commandTitle}>{t('heroTitle')}</h2>
          <div className={styles.stats} aria-label={t('heroTitle')}>
            <div className={styles.stat}>
              <strong>{ownedRestaurants.length}</strong>
              <span>{t('statMap')}</span>
            </div>
            <div className={styles.stat}>
              <strong>{revealedMustEatTotal}/{ownedMustEatTotal || '–'}</strong>
              <span>{t('statRevealed')}</span>
            </div>
            <div className={styles.stat}>
              <strong>{hiddenMustEatTotal}</strong>
              <span>{t('statHidden')}</span>
            </div>
          </div>
          <div className={styles.quickActions} aria-label={t('quickActions')}>
            <Link href="/map" rel="nofollow" className={styles.quickAction}>{t('toMap')}</Link>
            <Link href="/must-eats" rel="nofollow" className={styles.quickAction}>{t('tabMustEats')}</Link>
          </div>
        </section>

        <div className={styles.tabs} role="tablist" aria-label={t('heroTitle')}>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'spots'}
            aria-controls="profile-panel-spots"
            className={`${styles.tab} ${activeTab === 'spots' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('spots')}
          >
            {t('tabSpots')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'must-eats'}
            aria-controls="profile-panel-must-eats"
            className={`${styles.tab} ${activeTab === 'must-eats' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('must-eats')}
          >
            {t('tabMustEats')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'packs'}
            aria-controls="profile-panel-packs"
            className={`${styles.tab} ${activeTab === 'packs' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('packs')}
          >
            {t('tabPacks')}
          </button>
        </div>

        <section
          id="profile-panel-spots"
          role="tabpanel"
          hidden={activeTab !== 'spots'}
          className={styles.tabPanel}
          style={{ scrollMarginTop: 'calc(72px + var(--staging-banner-h, 0px))' }}
        >
          <div className={styles.section}>
            <h2 className={styles.sectionHeading}>{t('savedHeading')}</h2>
          </div>
          <ProfileSpots uid={user.uid} />
        </section>

        <section
          id="profile-panel-must-eats"
          role="tabpanel"
          hidden={activeTab !== 'must-eats'}
          className={styles.tabPanel}
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
          role="tabpanel"
          hidden={activeTab !== 'packs'}
          className={styles.tabPanel}
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
      </main>
      <SiteFooter />
    </>
  );
}
