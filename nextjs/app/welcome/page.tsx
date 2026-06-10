'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  isSignInWithEmailLink,
  signInWithEmailLink,
  applyActionCode,
  updateProfile,
  type User,
} from 'firebase/auth';
import { auth, getDb } from '@/lib/firebase/config';
import { routing } from '@/i18n/routing';
import styles from './auth-action.module.css';

// /welcome lives under its own root layout (separate <html> tree); the
// post-sign-in landing pages live under [locale]/. Crossing root layouts
// with router.replace can silently no-op, so we hard-navigate via
// window.location.assign to guarantee the page actually changes.
function hardRedirectToHome() {
  const locale = detectLocale();
  const target = locale === routing.defaultLocale ? '/' : `/${locale}`;
  window.location.assign(target);
}

// /welcome lives outside [locale], so there is no NextIntlClientProvider.
// Read the locale from the cookie next-intl writes on every visit, fall back
// to default. Used only for the post-login redirect URL.
function detectLocale(): string {
  if (typeof document === 'undefined') return routing.defaultLocale;
  const m = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/);
  const v = m ? decodeURIComponent(m[1]) : '';
  return (routing.locales as readonly string[]).includes(v) ? v : routing.defaultLocale;
}

// The magic link carries the address as `e` inside its continueUrl (set by
// sendMagicLinkEmail), so sign-in completes even when the link opens in a
// different browser than the one that requested it (Gmail app → Chrome).
function emailFromContinueUrl(params: URLSearchParams): string {
  const cu = params.get('continueUrl');
  if (!cu) return '';
  try {
    return new URL(cu).searchParams.get('e') ?? '';
  } catch {
    return '';
  }
}

type AvatarChoice = 1 | 2 | 3;

// Named avatar tiles (mockup screen 14). The stored value is the number;
// the label is just the picker caption.
const AVATARS: { id: AvatarChoice; label: string }[] = [
  { id: 1, label: 'Schnüffler' },
  { id: 2, label: 'Nachtschwärmerin' },
  { id: 3, label: 'Pizza-Pate' },
];

type State =
  | { kind: 'processing' }
  | { kind: 'success'; title: string; sub: string }
  | { kind: 'needs-email'; href: string }
  | { kind: 'needs-identity'; user: User }
  | { kind: 'expired' }
  | { kind: 'error'; title: string; sub: string };

// First sign-in ever (no display name yet) → identity onboarding before the
// redirect; returning users go straight home. Shared by the silent path and
// the needs-email fallback.
function finishSignIn(user: User, setState: (s: State) => void) {
  localStorage.removeItem('emailForSignIn');
  if (!user.displayName) {
    setState({ kind: 'needs-identity', user });
    return;
  }
  hardRedirectToHome();
}

export default function AuthActionPage() {
  return (
    <Suspense fallback={null}>
      <AuthActionInner />
    </Suspense>
  );
}

function AuthActionInner() {
  const params = useSearchParams();
  const [state, setState] = useState<State>({ kind: 'processing' });

  useEffect(() => {
    const mode    = params.get('mode');
    const oobCode = params.get('oobCode');
    const url     = window.location.href;

    if (mode === 'signIn') {
      if (!isSignInWithEmailLink(auth, url)) {
        setState({ kind: 'expired' });
        return;
      }
      const email =
        localStorage.getItem('emailForSignIn') || emailFromContinueUrl(params);
      if (!email) {
        // Legacy links without the `e` param, opened in a foreign browser.
        setState({ kind: 'needs-email', href: url });
        return;
      }
      signInWithEmailLink(auth, email, url)
        .then((result) => finishSignIn(result.user, setState))
        .catch((err) => {
          console.warn('[welcome] signInWithEmailLink failed:', err);
          setState({ kind: 'expired' });
        });
      return;
    }

    if (mode === 'verifyEmail' && oobCode) {
      applyActionCode(auth, oobCode)
        .then(() => {
          setState({
            kind:  'success',
            title: 'Bestätigt.',
            sub:   'Du wirst weitergeleitet …',
          });
          setTimeout(() => window.location.assign('/'), 1800);
        })
        .catch(() => {
          setState({ kind: 'expired' });
        });
      return;
    }

    setState({ kind: 'expired' });
  }, [params]);

  // The processing state is a quick splash — go full brand: big yellow wordmark,
  // a fast sweeping bar (reads quicker than a slow circular spinner), one line.
  if (state.kind === 'processing') {
    return (
      <main className={styles.splashPage}>
        <div className={styles.splash}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pics/eat-this-logo.webp?v=6" alt="Eat This" className={styles.splashLogo} />
          <div className={styles.bar} aria-hidden />
          <h1 className={styles.splashTitle}>Gleich bist du drin.</h1>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.frame}>
        <div className={styles.logoWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pics/eat-this-logo.webp?v=6" alt="Eat This" className={styles.logoMark} />
        </div>

        <div className={styles.content}>
          {state.kind === 'success' && (
            <>
              <div className={styles.checkmark} aria-hidden>
                <svg viewBox="0 0 24 24"><polyline points="5 13 9 17 19 7" /></svg>
              </div>
              <h1 className={styles.title}>{state.title}</h1>
              <p className={styles.sub}>{state.sub}</p>
            </>
          )}

          {state.kind === 'needs-email' && (
            <NeedsEmailForm href={state.href} setState={setState} />
          )}

          {state.kind === 'needs-identity' && (
            <IdentityForm user={state.user} />
          )}

          {state.kind === 'expired' && (
            <>
              <h1 className={styles.title}>Dieser Link funktioniert nicht.</h1>
              <p className={styles.sub}>
                Er ist abgelaufen oder wurde bereits verwendet. Starte
                den Login einfach noch einmal von der Startseite.
              </p>
              <Link href="/" className={styles.cta}>Zur Startseite</Link>
            </>
          )}

          {state.kind === 'error' && (
            <>
              <h1 className={styles.title}>{state.title}</h1>
              <p className={styles.sub}>{state.sub}</p>
              <Link href="/" className={styles.cta}>Zur Startseite</Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

// First-sign-in onboarding: pick name + avatar once, then land on Home.
// Shown to every new account (the sign-in itself already happened).
function IdentityForm({ user }: { user: User }) {
  const [name,       setName]       = useState('');
  const [avatarPick, setAvatarPick] = useState<AvatarChoice>(1);
  const [error,      setError]      = useState('');
  const [busy,       setBusy]       = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    try {
      // Save display name + avatar so the profile renders with the user's
      // chosen identity right after sign-in.
      await updateProfile(user, { displayName: name.trim() });
      const [{ doc, setDoc }, db] = await Promise.all([
        import('firebase/firestore'),
        getDb(),
      ]);
      await setDoc(doc(db, 'users', user.uid), { avatar: avatarPick }, { merge: true });
      hardRedirectToHome();
    } catch {
      setBusy(false);
      setError('Etwas ist schiefgelaufen. Versuch es nochmal.');
    }
  };

  return (
    <>
      <h1 className={styles.title}>Wer bist du<br />auf der Map?</h1>
      <p className={styles.sub}>
        Such dir Name und Avatar — beides siehst nur du im Profil, später nicht
        mehr änderbar.
      </p>

      <form onSubmit={submit} className={styles.form}>
        <div>
          <label className={styles.nameLabel} htmlFor="ob-name">Dein Name</label>
          <input
            id="ob-name"
            type="text"
            autoComplete="given-name"
            placeholder="z. B. Lukas"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={40}
            className={styles.input}
          />
        </div>

        <div className={styles.avatars} role="radiogroup" aria-label="Avatar auswählen">
          {AVATARS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={id === avatarPick}
              aria-label={label}
              className={`${styles.avatar}${id === avatarPick ? ` ${styles.avatarActive}` : ''}`}
              onClick={() => setAvatarPick(id)}
            >
              <span className={styles.avatarPh}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/pics/avatar/${id}.webp`} alt="" />
              </span>
              <span className={styles.avatarName}>{label}</span>
            </button>
          ))}
        </div>

        {error && <p className={styles.error}>{error}</p>}
        <button type="submit" className={styles.cta} disabled={busy || !name.trim()}>
          <span>{busy ? 'Speichern …' : 'Weiter'}</span>
          {!busy && (
            <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2.6}>
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          )}
        </button>
      </form>
    </>
  );
}

// Fallback for legacy links without the `e` carrier param that were opened
// in a different browser than where they were requested (localStorage empty).
// Firebase needs the address to complete the sign-in; identity onboarding
// follows separately via finishSignIn.
function NeedsEmailForm({
  href,
  setState,
}: {
  href: string;
  setState: (s: State) => void;
}) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy,  setBusy]  = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    setError('');
    try {
      const result = await signInWithEmailLink(auth, email.trim(), href);
      finishSignIn(result.user, setState);
    } catch (err: unknown) {
      setBusy(false);
      const code = (err as { code?: string }).code ?? '';
      if (code === 'auth/invalid-email') {
        setError('Bitte gib eine gültige E-Mail-Adresse ein.');
      } else if (
        code === 'auth/expired-action-code' ||
        code === 'auth/invalid-action-code'
      ) {
        setState({ kind: 'expired' });
      } else {
        setError('Etwas ist schiefgelaufen. Versuch es nochmal.');
      }
    }
  };

  return (
    <>
      <h1 className={styles.title}>Fast drin.</h1>
      <p className={styles.sub}>
        Du hast den Link in einem anderen Browser geöffnet. Bestätige kurz die
        E-Mail-Adresse, an die er geschickt wurde.
      </p>

      <form onSubmit={submit} className={styles.form}>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="deine@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={styles.input}
        />

        {error && <p className={styles.error}>{error}</p>}
        <button type="submit" className={styles.cta} disabled={busy || !email}>
          <span>{busy ? 'Anmelden …' : 'Weiter'}</span>
          {!busy && (
            <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2.6}>
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          )}
        </button>
      </form>
    </>
  );
}
