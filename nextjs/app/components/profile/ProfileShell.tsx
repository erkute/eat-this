'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useUnlockedMustEats } from '@/lib/map';
import type { MustEatAlbumCard } from '@/lib/types';
import ProfileHeader from './ProfileHeader';
import ProfileTabs, { type ProfileTab } from './ProfileTabs';
import ProfileDeck from './ProfileDeck';
import ProfileRestaurants from './ProfileRestaurants';
import ProfileBooster from './ProfileBooster';
import ProfileSettings from './ProfileSettings';
import SiteFooter from '../SiteFooter';
import styles from './profile.module.css';

interface Props {
  mustEats: MustEatAlbumCard[];
  restaurantCount: number;
  curatedRevealedIds: string[];
}

export default function ProfileShell({ mustEats, restaurantCount, curatedRevealedIds }: Props) {
  const { user, loading } = useAuth();
  // Map-page reveals write to users/{uid}/unlockedMustEats — read them here
  // so the deck can show those cards.
  const { unlockedIds: mapUnlockedIds, unlock } = useUnlockedMustEats(user?.uid ?? null);
  // Read the URL hash on mount so deep-links from elsewhere in the app
  // (e.g. the map's booster CTAs use /profile#booster) land on the right
  // tab instead of always defaulting to "deck". Special case: a Stripe
  // cancel redirect carries `?booster=canceled` and we force the booster
  // tab regardless of whether the #booster fragment survived the round-trip
  // (some Stripe Checkout flows strip fragments).
  const [tab, setTab] = useState<ProfileTab>(() => {
    if (typeof window === 'undefined') return 'deck';
    if (new URLSearchParams(window.location.search).get('booster') === 'canceled') {
      return 'booster';
    }
    const h = window.location.hash.replace('#', '');
    return h === 'restaurants' || h === 'booster' || h === 'settings' ? h : 'deck';
  });

  if (loading || !user) {
    return (
      <main className={styles.page}>
        <div className={styles.deckPlaceholder}>
          <div className={styles.spinner} aria-hidden="true" />
        </div>
      </main>
    );
  }

  return (
    <>
      <main className={styles.page}>
        <ProfileHeader user={user} />
        <ProfileTabs active={tab} onChange={setTab} />

        {tab === 'deck' && (
          <ProfileDeck
            mustEats={mustEats}
            mapUnlockedIds={mapUnlockedIds}
            unlock={unlock}
            curatedRevealedIds={curatedRevealedIds}
          />
        )}
        {tab === 'restaurants' && <ProfileRestaurants uid={user.uid} />}
        {tab === 'booster'     && <ProfileBooster restaurantCount={restaurantCount} />}
        {tab === 'settings'    && <ProfileSettings email={user.email ?? ''} />}
      </main>
      <SiteFooter />
    </>
  );
}
