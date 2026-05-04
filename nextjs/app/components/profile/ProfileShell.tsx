'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { usePack } from '@/lib/firebase/usePack';
import { createWelcomePack } from '@/lib/firebase/welcomePack';
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
}

export default function ProfileShell({ mustEats }: Props) {
  const { user, loading } = useAuth();
  const pack = usePack(user?.uid ?? null);
  const [tab, setTab] = useState<ProfileTab>('deck');
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
            createError={createError}
            onRetry={() => setCreateError(null)}
          />
        )}
        {tab === 'restaurants' && <ProfileRestaurants uid={user.uid} />}
        {tab === 'booster'     && <ProfileBooster />}
        {tab === 'settings'    && <ProfileSettings email={user.email ?? ''} />}
      </main>
      <SiteFooter />
    </>
  );
}

// ── Deck-Panel — Loading-States um ProfileDeck ──────────

interface DeckPanelProps {
  pack:        ReturnType<typeof usePack>;
  mustEats:    MustEatAlbumCard[];
  createError: string | null;
  onRetry:     () => void;
}

function DeckPanel({ pack, mustEats, createError, onRetry }: DeckPanelProps) {
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
    />
  );
}
