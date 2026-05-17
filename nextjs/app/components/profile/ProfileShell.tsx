'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { usePack } from '@/lib/firebase/usePack';
import { createWelcomePack } from '@/lib/firebase/welcomePack';
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
}

export default function ProfileShell({ mustEats, restaurantCount }: Props) {
  const { user, loading } = useAuth();
  const pack = usePack(user?.uid ?? null);
  // Map-page reveals write to users/{uid}/unlockedMustEats — read them here
  // so the deck can show those cards alongside the welcome-pack ones.
  const { unlockedIds: mapUnlockedIds } = useUnlockedMustEats(user?.uid ?? null);
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
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Welcome-Pack-Backfill — covers users who pre-date onUserCreate
  // or whose signup race-conditioned out of having a pack created.
  useEffect(() => {
    if (!user || pack.status !== 'missing' || createBusy || createError) return;
    setCreateBusy(true);
    createWelcomePack(user.uid, mustEats)
      .then(() => setCreateBusy(false))
      .catch((err: unknown) => {
        const code = (err as { code?: string }).code ?? '';
        // permission-denied means the doc already exists (rules block re-create) —
        // benign; the snapshot subscription will pick it up.
        if (code === 'permission-denied') {
          setCreateBusy(false);
          return;
        }
        console.error('[profile] createWelcomePack failed:', err);
        setCreateBusy(false);
        setCreateError('Konnten dein Pack gerade nicht anlegen.');
      });
  }, [user, pack.status, createBusy, createError, mustEats]);

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
          <DeckPanel
            pack={pack}
            mustEats={mustEats}
            mapUnlockedIds={mapUnlockedIds}
            createError={createError}
            onRetry={() => setCreateError(null)}
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

// ── Deck-Panel — Loading-States um ProfileDeck ──────────

interface DeckPanelProps {
  pack:            ReturnType<typeof usePack>;
  mustEats:        MustEatAlbumCard[];
  mapUnlockedIds:  Set<string>;
  createError:     string | null;
  onRetry:         () => void;
}

function DeckPanel({ pack, mustEats, mapUnlockedIds, createError, onRetry }: DeckPanelProps) {
  if (pack.status === 'loading' || pack.status === 'idle') {
    return (
      <div className={styles.deckPlaceholder}>
        <div className={styles.spinner} aria-hidden="true" />
      </div>
    );
  }
  if (pack.status === 'error') {
    return (
      <div className={styles.deckPlaceholder}>
        <h2 className={styles.title}>Da hat etwas geklemmt.</h2>
        <p className={styles.sub}>Wir konnten dein Booster Pack gerade nicht laden. Lade die Seite neu.</p>
      </div>
    );
  }
  if (createError) {
    return (
      <div className={styles.deckPlaceholder}>
        <h2 className={styles.title}>Pack konnte nicht angelegt werden.</h2>
        <p className={styles.sub}>{createError}</p>
        <button type="button" className={styles.cta} onClick={onRetry}>
          Nochmal versuchen
        </button>
      </div>
    );
  }
  if (pack.status === 'missing') {
    return (
      <div className={styles.deckPlaceholder}>
        <div className={styles.spinner} aria-hidden="true" />
        <h2 className={styles.title}>Dein Pack wird vorbereitet.</h2>
        <p className={styles.sub}>Das dauert ein paar Sekunden. Es lädt automatisch nach.</p>
      </div>
    );
  }
  return (
    <ProfileDeck
      pack={pack.pack}
      mustEats={mustEats}
      mapUnlockedIds={mapUnlockedIds}
    />
  );
}
