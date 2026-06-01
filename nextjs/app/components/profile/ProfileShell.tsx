'use client';

import { useLocale } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { useUnlockedMustEats } from '@/lib/map';
import { defaultAvatarFromUid, useUserProfile } from '@/lib/firebase/useUserProfile';
import type { MustEatAlbumCard } from '@/lib/types';
import ProfileSpots from './ProfileSpots';
import ProfileMustEats from './ProfileMustEats';
import ProfilePacks from './ProfilePacks';
import SiteFooter from '../SiteFooter';
import styles from './ProfileSlim.module.css';

interface Props {
  mustEats: MustEatAlbumCard[];
  curatedRevealedIds: string[];
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
export default function ProfileShell({ mustEats, curatedRevealedIds }: Props) {
  const { user, loading, signOut } = useAuth();
  const locale = useLocale();
  // Map-page reveals write to users/{uid}/unlockedMustEats — read them so the
  // collected grid shows face-up cards.
  const { unlockedIds } = useUnlockedMustEats(user?.uid ?? null);
  const { profile } = useUserProfile(user?.uid ?? null);

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

  return (
    <>
      <main className={styles.page}>
        <header className={styles.head}>
          <div className={styles.avatar}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/pics/avatar/${avatarIdx}.webp`} alt="" />
          </div>
          <div className={styles.info}>
            {since && <div className={styles.kicker}>{sinceLabel} {since}</div>}
            <h1 className={styles.name}>{name}</h1>
            {user.email && <div className={styles.email}>{user.email}</div>}
          </div>
        </header>

        <div className={styles.section}>
          <h2 className={styles.sectionHeading}>Gespeicherte Spots</h2>
        </div>
        <ProfileSpots uid={user.uid} />

        <ProfileMustEats
          mustEats={mustEats}
          mapUnlockedIds={unlockedIds}
          curatedRevealedIds={curatedRevealedIds}
        />

        <ProfilePacks uid={user.uid} />

        <button
          type="button"
          className={styles.logout}
          onClick={() => { void signOut(); }}
        >
          Abmelden
        </button>
      </main>
      <SiteFooter />
    </>
  );
}
