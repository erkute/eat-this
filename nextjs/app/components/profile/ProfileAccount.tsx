'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import styles from './Profile.module.css';

export default function ProfileAccount({
  name,
  email,
  onSaveName,
  onPickAvatar,
  onSignOut,
}: {
  name: string;
  email: string | null;
  onSaveName: (name: string) => Promise<void>;
  onPickAvatar: () => void;
  onSignOut: () => Promise<void>;
}) {
  const t = useTranslations('profile');
  const tAuth = useTranslations('auth');
  const [signingOut, setSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);
  const [value, setValue] = useState(name);
  const [savedName, setSavedName] = useState(name);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const busy = status === 'saving';
  return (
    <div className={styles.account}>
      <h2 className={styles.sectionTitle}>{t('accountHeading')}</h2>
      <form
        className={styles.accountForm}
        onSubmit={async (event) => {
          event.preventDefault();
          const next = value.trim();
          if (!next || next === savedName || busy) return;
          setStatus('saving');
          try {
            await onSaveName(next);
            setValue(next);
            setSavedName(next);
            setStatus('saved');
          } catch {
            setStatus('error');
          }
        }}
      >
        <label htmlFor="profile-name">{t('fieldName')}</label>
        <input
          id="profile-name"
          name="name"
          autoComplete="given-name"
          required
          maxLength={40}
          value={value}
          disabled={busy}
          onChange={(event) => {
            setValue(event.target.value);
            setStatus('idle');
          }}
        />
        <div className={styles.accountSave}>
          <button
            type="submit"
            className="et-btn"
            disabled={busy || !value.trim() || value.trim() === savedName}
          >
            {t(busy ? 'nameSaving' : 'nameSave')}
          </button>
          <span role="status">{status === 'saved' ? t('nameSaved') : ''}</span>
        </div>
        {status === 'error' && (
          <p className={styles.formError} role="alert">
            {t('nameError')}
          </p>
        )}
      </form>
      <div className={styles.accountRow}>
        <h3>{t('avatarModalTitle')}</h3>
        <button type="button" className="et-btn et-btn-alt et-btn-sm" onClick={onPickAvatar}>
          {t('changeAvatar')}
        </button>
      </div>
      {email && (
        <div className={styles.accountRow}>
          <h3>{t('fieldEmail')}</h3>
          <p>{email}</p>
        </div>
      )}
      <button
        type="button"
        className={`et-btn et-btn-alt ${styles.accountSignOut}`}
        disabled={signingOut}
        aria-busy={signingOut}
        onClick={async () => {
          if (signingOut) return;
          setSigningOut(true);
          setSignOutFailed(false);
          try {
            await onSignOut();
          } catch {
            setSignOutFailed(true);
          } finally {
            setSigningOut(false);
          }
        }}
      >
        {t('signOut')}
      </button>
      {signOutFailed && (
        <p className={styles.formError} role="alert">{tAuth('errGeneric')}</p>
      )}
    </div>
  );
}
