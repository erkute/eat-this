'use client';

import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { createPortal } from 'react-dom';
import { useLocale } from 'next-intl';
import { useDialogFocus } from '@/lib/useDialogFocus';
import type { EmailLinkState } from './EmailLinkSignIn';
import styles from './Tour.module.css';
import modalStyles from './LoginModalOverlay.module.css';
import LoginModalBarLock from './LoginModalBarLock';
import StarterPack3D from './StarterPack3D';

const copy = {
  de: {
    label: 'Anmeldung bei Eat This',
    welcome: 'Willkommen bei Eat This',
    close: 'Schließen',
    kicker: 'Ein Klick noch',
    title: ['Deine Map.', 'Deine Sammlung.'],
    as: 'Anmelden als',
    cardNote: 'Deine Karte ist im Pack dabei.',
    cta: 'Anmelden',
    busy: 'Anmelden …',
    emailTitle: 'Fast drin',
    emailBody:
      'Du hast den Link in einem anderen Browser geöffnet. Bestätige kurz die E-Mail-Adresse, an die er geschickt wurde.',
    emailLabel: 'Deine E-Mail-Adresse',
    emailPlaceholder: 'deine@email.com',
    emailInvalid: 'Bitte gib eine gültige E-Mail-Adresse ein.',
    error: 'Etwas ist schiefgelaufen. Versuch es nochmal.',
    expiredKicker: 'Sackgasse',
    expiredTitle: 'Dieser Link geht nicht mehr',
    expiredBody:
      'Er ist abgelaufen oder wurde schon benutzt. Über „Anmelden“ bekommst du einfach einen neuen.',
    packAlt: 'Eat This Starter Pack',
  },
  en: {
    label: 'Sign in to Eat This',
    welcome: 'Welcome to Eat This',
    close: 'Close',
    kicker: 'One more click',
    title: ['Your map.', 'Your collection.'],
    as: 'Signing in as',
    cardNote: 'Your card is in the pack.',
    cta: 'Sign in',
    busy: 'Signing in …',
    emailTitle: 'Almost in',
    emailBody:
      'You opened the link in a different browser. Just confirm the email address it was sent to.',
    emailLabel: 'Your email address',
    emailPlaceholder: 'your@email.com',
    emailInvalid: 'Please enter a valid email address.',
    error: 'Something went wrong. Please try again.',
    expiredKicker: 'Dead end',
    expiredTitle: 'This link no longer works',
    expiredBody: 'It has expired or has already been used. “Sign in” gets you a new one.',
    packAlt: 'Eat This Starter Pack',
  },
} as const;

const EMAIL_FORM = 'email-link-sign-in';

interface Props {
  state: EmailLinkState;
  setState: Dispatch<SetStateAction<EmailLinkState | null>>;
  claimingCard: boolean;
  signIn: (email: string) => Promise<void>;
  close: () => void;
}

export default function EmailLinkSignInPanel({ state, setState, claimingCard, signIn, close }: Props) {
  const locale = useLocale();
  const t = copy[locale === 'en' ? 'en' : 'de'];
  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  useDialogFocus(true, panelRef, triggerRef);
  useEffect(() => { titleRef.current?.focus({ preventScroll: true }); }, [state.kind]);

  const codeOf = (err: unknown) => (err as { code?: string } | null)?.code ?? '';
  const spent = (code: string) =>
    code === 'auth/invalid-action-code' || code === 'auth/expired-action-code';

  let content: React.ReactNode;
  let primary: React.ReactNode;

  if (state.kind === 'confirm') {
    const confirm = async () => {
      if (state.busy) return;
      setState({ ...state, busy: true, error: false });
      try {
        await signIn(state.email);
      } catch (err) {
        console.warn('[email-link] signInWithEmailLink failed:', err);
        /* Verbraucht oder abgelaufen — der häufige Fall, und dann hilft
           nur ein neuer Link. Alles andere (Netz) darf man nochmal drücken. */
        const code = codeOf(err);
        if (code === 'auth/invalid-email') {
          // Another requested link may have replaced the remembered address.
          // Let the reader correct it; never take the replacement from the URL.
          try {
            localStorage.removeItem('emailForSignIn');
          } catch {}
          setState({ kind: 'needs-email', email: '', busy: false, error: null });
        } else {
          setState(spent(code) ? { kind: 'expired' } : { ...state, busy: false, error: true });
        }
      }
    };
    content = (
      <div className={styles.content}>
        <div className={styles.art}>
          <div className={styles.packPreview} role="img" aria-label={t.packAlt}>
            <StarterPack3D fit />
          </div>
        </div>
        <div className={styles.copy}>
          <p className={`et-label ${styles.kicker}`}>{t.kicker}</p>
          {/* Zwei Sätze, zwei Zeilen — nie umgebrochen (Betreiber, 22.09.2026). */}
          <h2 ref={titleRef} tabIndex={-1} className={`${styles.headline} ${styles.headlineLines}`}>
            <span>{t.title[0]}</span>
            <span>{t.title[1]}</span>
          </h2>
          <p className={styles.signInLabel}>{t.as}</p>
          <p className={styles.signInAs}>{state.email}</p>
          {claimingCard && <p className={styles.hint}>{t.cardNote}</p>}
          {state.error && (
            <p className={styles.nameError} role="alert">
              {t.error}
            </p>
          )}
        </div>
      </div>
    );
    primary = (
      <button type="button" className={`et-btn ${styles.action}`} disabled={state.busy} onClick={confirm}>
        {state.busy ? t.busy : t.cta}
      </button>
    );
  } else if (state.kind === 'needs-email') {
    const submit = async (event: React.FormEvent) => {
      event.preventDefault();
      const email = state.email.trim();
      if (!email || state.busy) return;
      setState({ ...state, busy: true, error: null });
      try {
        await signIn(email);
      } catch (err) {
        const code = codeOf(err);
        if (spent(code)) return setState({ kind: 'expired' });
        setState({
          ...state,
          busy: false,
          error: code === 'auth/invalid-email' ? 'invalid' : 'generic',
        });
      }
    };
    content = (
      <form id={EMAIL_FORM} className={styles.content} onSubmit={submit}>
        <div className={styles.art}>
          <div className={styles.packPreview} role="img" aria-label={t.packAlt}>
            <StarterPack3D fit />
          </div>
        </div>
        <div className={styles.copy}>
          <p className={`et-label ${styles.kicker}`}>{t.kicker}</p>
          <h2 ref={titleRef} tabIndex={-1} className={styles.headline}>
            {t.emailTitle}
          </h2>
          <p className={styles.body}>{t.emailBody}</p>
          <label className={styles.nameLabel} htmlFor="email-link-address">
            {t.emailLabel}
          </label>
          <input
            id="email-link-address"
            className={styles.nameInput}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t.emailPlaceholder}
            value={state.email}
            onChange={(event) => setState({ ...state, email: event.target.value })}
            required
          />
          {state.error && (
            <p className={styles.nameError} role="alert">
              {state.error === 'invalid' ? t.emailInvalid : t.error}
            </p>
          )}
        </div>
      </form>
    );
    primary = (
      <button
        type="submit"
        form={EMAIL_FORM}
        className={`et-btn ${styles.action}`}
        disabled={state.busy || !state.email.trim()}
      >
        {state.busy ? t.busy : t.cta}
      </button>
    );
  } else {
    content = (
      <div className={styles.content}>
        <div className={styles.art}>
          <div className={styles.packPreview} role="img" aria-label={t.packAlt}>
            <StarterPack3D fit />
          </div>
        </div>
        <div className={styles.copy}>
          <p className={`et-label ${styles.kicker}`}>{t.expiredKicker}</p>
          <h2 ref={titleRef} tabIndex={-1} className={styles.headline}>
            {t.expiredTitle}
          </h2>
          <p className={styles.body}>{t.expiredBody}</p>
        </div>
      </div>
    );
    primary = (
      <button type="button" className={`et-btn ${styles.action}`} onClick={close}>
        {t.close}
      </button>
    );
  }

  return createPortal(
    <div className={modalStyles.overlay} style={{ zIndex: 'var(--et-z-email-link)' }}>
      <LoginModalBarLock />
      <div
        ref={panelRef}
        className={styles.panel}
        data-email-login=""
        data-red-sheet=""
        role="dialog"
        aria-modal="true"
        aria-label={t.label}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape') close();
        }}
      >
        <header className={styles.header}>
          <span>{t.welcome}</span>
          <button type="button" className={`et-btn et-btn-text et-btn-sm ${styles.quiet}`} onClick={close}>
            {t.close}
          </button>
        </header>
        {content}
        {/* Dieselbe Leiste wie in der Tour, damit der gelbe Knopf an genau
            der Stelle steht, an der danach „Weiter" steht. Die Fortschritts-
            Zeile hält nur den Platz — dies ist kein Schritt der Tour. */}
        <footer className={styles.footer}>
          <div className={`${styles.progress} ${styles.progressSpacer}`} aria-hidden="true">
            <span>1 / 1</span>
            <div className={styles.segments} />
          </div>
          <div className={styles.actions}>
            <span />
            {primary}
          </div>
        </footer>
      </div>
    </div>,
    document.body
  );
}
