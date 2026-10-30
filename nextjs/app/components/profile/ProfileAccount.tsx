'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import styles from './Profile.module.css';

const AUTOSAVE_DELAY_MS = 900;

export default function ProfileAccount({
  name,
  email,
  memberSince,
  avatarIdx,
  onSaveName,
  onPickAvatar,
  onSignOut,
  invite,
}: {
  name: string;
  email: string | null;
  /** Anmeldezeitpunkt des Kontos (ISO) für die Zeile „Dabei seit“. */
  memberSince?: string | null;
  avatarIdx: number;
  onSaveName: (name: string) => Promise<void>;
  onPickAvatar: () => void;
  onSignOut: () => Promise<void>;
  /** Der Kasten „Zeig dein Deck“ samt Freunden, zwischen Name und Anmeldung. */
  invite?: ReactNode;
}) {
  const t = useTranslations('profile');
  const locale = useLocale();
  const tAuth = useTranslations('auth');
  const [signingOut, setSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);
  const [value, setValue] = useState(name);
  const [savedName, setSavedName] = useState(name);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const savedRef = useRef(name);
  const inFlight = useRef(false);

  /* Der Name speichert sich selbst: kurz nach dem Tippen, beim Verlassen des
     Feldes und mit Enter. Das Feld bleibt dabei bedienbar — ein gesperrtes Feld
     risse beim Speichern den Cursor heraus. */
  const save = useCallback(
    async (raw: string) => {
      const next = raw.trim();
      if (!next || next === savedRef.current || inFlight.current) return;
      inFlight.current = true;
      setStatus('saving');
      try {
        await onSaveName(next);
        savedRef.current = next;
        setSavedName(next);
        setStatus('saved');
      } catch {
        setStatus('error');
      } finally {
        inFlight.current = false;
      }
    },
    [onSaveName]
  );

  useEffect(() => {
    const next = value.trim();
    /* Nach einem Fehler wartet es auf die nächste Eingabe oder das Verlassen des
       Feldes, statt im Takt zu wiederholen. */
    if (!next || next === savedName || status === 'error') return;
    const timer = window.setTimeout(() => void save(value), AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [value, savedName, status, save]);

  const sinceDate = memberSince ? new Date(memberSince) : null;
  const since =
    sinceDate && !Number.isNaN(sinceDate.getTime())
      ? sinceDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
      : null;

  return (
    <div className={styles.account}>
      <section className={styles.accountGroup} aria-labelledby="account-you">
        {/* Der Charakter steht frei, ohne Karte und ohne Rahmen: er ist hier der
          Absender der Seite. Ein Tipp auf die Figur wechselt ihn. */}
        <div className={styles.accountWho}>
          <button
            type="button"
            className={styles.accountFigure}
            onClick={onPickAvatar}
            aria-label={t('changeAvatar')}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/pics/avatar/${avatarIdx}.webp?v=4`} alt="" width={160} height={200} />
          </button>
          <div className={styles.accountIntro}>
            <h2 id="account-you" className={styles.accountName}>
              {savedName || email?.split('@')[0] || t('accountYou')}
            </h2>
            {since && (
              <p className={`et-label ${styles.accountSince}`}>
                {t('accountSince', { date: since })}
              </p>
            )}
            <button type="button" className="et-btn et-btn-alt et-btn-sm" onClick={onPickAvatar}>
              {t('changeAvatar')}
            </button>
          </div>
        </div>
        <form
          className={styles.accountForm}
          onSubmit={(event) => {
            event.preventDefault();
            void save(value);
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
            onChange={(event) => {
              setValue(event.target.value);
              setStatus('idle');
            }}
            onBlur={() => {
              if (!value.trim()) setValue(savedName);
              else void save(value);
            }}
          />
          <p className={styles.accountSave} role="status">
            {status === 'saving' ? t('nameSaving') : status === 'saved' ? t('nameSaved') : ''}
          </p>
          {status === 'error' && (
            <p className={styles.formError} role="alert">
              {t('nameError')}
            </p>
          )}
        </form>
      </section>
      {invite}
      <section className={styles.accountGroup} aria-labelledby="account-login">
        <h2
          id="account-login"
          className={`et-label-title et-label-tape ${styles.accountGroupTitle}`}
        >
          {t('accountLogin')}
        </h2>
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
          <p className={styles.formError} role="alert">
            {tAuth('errGeneric')}
          </p>
        )}
      </section>
    </div>
  );
}
