'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { usePack } from '@/lib/firebase/usePack';
import { useFavorites } from '@/lib/map/useFavorites';
import { createWelcomePack } from '@/lib/firebase/welcomePack';
import type { MustEatAlbumCard } from '@/lib/types';
import ProfileDeck from './ProfileDeck';
import SiteFooter from '../SiteFooter';
import styles from './profile.module.css';

type Tab = 'deck' | 'saved' | 'settings';

interface Props {
  mustEats: MustEatAlbumCard[];
}

export default function ProfileShell({ mustEats }: Props) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pack = usePack(user?.uid ?? null);
  const [tab, setTab]                 = useState<Tab>('deck');
  const [createBusy, setCreateBusy]   = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Bounce to home if the user lands here without a session. Done in an
  // effect so we don't trigger a router update during render.
  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [loading, user, router]);

  // Backfill the welcome pack if it's missing — covers users who pre-date
  // onUserCreate or whose signup race-conditioned out of it.
  useEffect(() => {
    if (!user || pack.status !== 'missing' || createBusy || createError) return;
    setCreateBusy(true);
    createWelcomePack(user.uid, mustEats)
      .then(() => {
        setCreateBusy(false);
      })
      .catch((err: unknown) => {
        const code = (err as { code?: string }).code ?? '';
        // permission-denied means the doc already exists (rules block re-create) —
        // benign; the snapshot subscription will pick it up momentarily.
        if (code === 'permission-denied') {
          setCreateBusy(false);
          return;
        }
        console.error('[profile] createWelcomePack failed:', err);
        setCreateBusy(false);
        setCreateError('Konnten dein Pack gerade nicht anlegen.');
      });
  }, [user, pack.status, createBusy, createError, mustEats]);

  const retryCreate = () => {
    setCreateError(null);
  };

  if (loading || !user) {
    return (
      <main className={styles.page}>
        <div className={styles.shell}>
          <div className={styles.deckPlaceholder}>
            <div className={styles.spinner} aria-hidden="true" />
          </div>
        </div>
      </main>
    );
  }

  const initial = (user.displayName || user.email || '?').trim().charAt(0).toUpperCase();
  const name    = user.displayName || (user.email ?? '').split('@')[0] || 'Du';

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.avatar} aria-hidden="true">{initial}</div>
          <div className={styles.headerInfo}>
            <h1 className={styles.name}>{name}</h1>
            <p className={styles.email}>{user.email ?? ''}</p>
          </div>
        </header>

        <div className={styles.tabs} role="tablist">
          <TabBtn active={tab === 'deck'}     onClick={() => setTab('deck')}    >Deck</TabBtn>
          <TabBtn active={tab === 'saved'}    onClick={() => setTab('saved')}   >Gespeichert</TabBtn>
          <TabBtn active={tab === 'settings'} onClick={() => setTab('settings')}>Einstellungen</TabBtn>
        </div>

        <section
          className={tab === 'deck' ? styles.panelDeck : styles.panel}
          role="tabpanel"
        >
          {tab === 'deck'     && <DeckPanel pack={pack} mustEats={mustEats} createError={createError} onRetry={retryCreate} />}
          {tab === 'saved'    && <SavedPanel uid={user.uid} />}
          {tab === 'settings' && <SettingsPanel email={user.email ?? ''} />}
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}

// ── Tab button ──────────────────────────────────────

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={`${styles.tab} ${active ? styles.tabActive : ''}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

// ── Deck panel ──────────────────────────────────────

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

  return <ProfileDeck pack={pack.pack} mustEats={mustEats} />;
}

// ── Saved panel ─────────────────────────────────────

function SavedPanel({ uid }: { uid: string }) {
  const { favorites, loading, toggle } = useFavorites(uid);

  if (loading) {
    return (
      <div className={styles.deckPlaceholder}>
        <div className={styles.spinner} aria-hidden="true" />
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <p className={styles.empty}>
        Du hast noch keine Restaurants gespeichert. Tippe auf das Herz an einer Map-Karte.
      </p>
    );
  }

  return (
    <div className={styles.savedGrid}>
      {favorites.map((f) => (
        <div key={f.restaurantId} className={styles.savedCard}>
          {f.photo
            ? <img src={f.photo} alt="" className={styles.savedImg} loading="lazy" />
            : <div className={styles.savedPlaceholder} aria-hidden="true">🍽</div>}
          <button
            type="button"
            className={styles.savedRemove}
            aria-label={`${f.name} entfernen`}
            onClick={() => toggle({ _id: f.restaurantId, name: f.name, photo: f.photo, district: f.district })}
          >
            ×
          </button>
          <div className={styles.savedOverlay}>
            <span className={styles.savedName}>{f.name}</span>
            {f.district && <span className={styles.savedDistrict}>{f.district}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Settings panel ──────────────────────────────────

type Feedback = { kind: 'success' | 'error'; text: string } | null;

function SettingsPanel({ email }: { email: string }) {
  const { user, updateDisplayName, signOut, deleteAccount } = useAuth();
  const router = useRouter();

  const [nameInput, setNameInput] = useState(user?.displayName ?? '');
  const [savingName, setSavingName] = useState(false);
  const [nameFeedback, setNameFeedback] = useState<Feedback>(null);

  useEffect(() => { setNameInput(user?.displayName ?? ''); }, [user?.displayName]);

  const onSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed || trimmed === (user?.displayName ?? '')) return;
    setSavingName(true);
    setNameFeedback(null);
    try {
      await updateDisplayName(trimmed);
      setNameFeedback({ kind: 'success', text: 'Gespeichert ✓' });
    } catch {
      setNameFeedback({ kind: 'error', text: 'Konnte nicht speichern. Versuche es erneut.' });
    } finally {
      setSavingName(false);
    }
  };

  const onSignOut = async () => {
    try { await signOut(); } finally { router.replace('/'); }
  };

  const onDelete = async () => {
    if (!window.confirm('Bist du sicher? Dein Konto wird unwiderruflich gelöscht.')) return;
    try {
      await deleteAccount();
      router.replace('/');
    } catch {
      window.alert('Bitte logge dich neu ein und versuche es nochmal.');
    }
  };

  return (
    <div className={styles.settings}>
      <div className={styles.settingsSection}>
        <h3 className={styles.settingsSectionTitle}>Account</h3>
        <div className={styles.settingsField}>
          <label className={styles.settingsLabel} htmlFor="profile-name">Anzeigename</label>
          <div className={styles.settingsRow}>
            <input
              id="profile-name"
              type="text"
              className={styles.settingsInput}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Dein Name"
              autoComplete="name"
            />
            <button
              type="button"
              className={styles.settingsBtn}
              disabled={savingName || !nameInput.trim() || nameInput.trim() === (user?.displayName ?? '')}
              onClick={onSaveName}
            >
              Speichern
            </button>
          </div>
          {nameFeedback && (
            <p className={nameFeedback.kind === 'success' ? styles.feedback : styles.feedbackError}>
              {nameFeedback.text}
            </p>
          )}
        </div>

        <div className={styles.settingsField}>
          <span className={styles.settingsLabel}>E-Mail</span>
          <p className={styles.settingsValue}>{email || '—'}</p>
        </div>
      </div>

      <div className={styles.settingsSectionDanger}>
        <h3 className={styles.settingsSectionTitle}>Konto verlassen</h3>
        <button type="button" className={styles.settingsBtnSecondary} onClick={onSignOut}>
          Abmelden
        </button>
        <button type="button" className={styles.settingsBtnDanger} onClick={onDelete}>
          Konto löschen
        </button>
      </div>
    </div>
  );
}
