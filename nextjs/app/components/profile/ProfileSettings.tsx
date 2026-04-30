'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import styles from './ProfileSettings.module.css';

type Feedback = { kind: 'success' | 'error'; text: string } | null;

interface Props {
  email: string;
}

export default function ProfileSettings({ email }: Props) {
  const { user, updateDisplayName, signOut } = useAuth();
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

  return (
    <div className={styles.wrap}>
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Account</h3>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="profile-name">Anzeigename</label>
          <div className={styles.row}>
            <input
              id="profile-name"
              type="text"
              className={styles.input}
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="Dein Name"
              autoComplete="name"
            />
            <button
              type="button"
              className={styles.btn}
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

        <div className={styles.field}>
          <span className={styles.label}>E-Mail</span>
          <p className={styles.value}>{email || '—'}</p>
        </div>
      </div>

      <div className={styles.sectionDanger}>
        <h3 className={styles.sectionTitle}>Konto verlassen</h3>
        <button type="button" className={styles.btnSecondary} onClick={onSignOut}>
          Abmelden
        </button>
        <p className={styles.deleteHint}>
          Konto löschen? Schreib uns an <a href="mailto:support@eatthisdot.com" className={styles.mailLink}>support@eatthisdot.com</a>
        </p>
      </div>
    </div>
  );
}
