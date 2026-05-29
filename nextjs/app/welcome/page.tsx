'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  isSignInWithEmailLink,
  signInWithEmailLink,
  applyActionCode,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { routing } from '@/i18n/routing';
import styles from './auth-action.module.css';

// /welcome lives under its own root layout (separate <html> tree); the
// post-sign-in landing pages live under [locale]/. Crossing root layouts
// with router.replace can silently no-op, so we hard-navigate via
// window.location.assign to guarantee the page actually changes.
function hardRedirectToProfile() {
  const locale = detectLocale();
  const target = locale === routing.defaultLocale ? '/profile' : `/${locale}/profile`;
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

type AvatarChoice = 1 | 2 | 3;

type State =
  | { kind: 'processing' }
  | { kind: 'success'; title: string; sub: string }
  | { kind: 'needs-email'; href: string }
  | { kind: 'expired' }
  | { kind: 'error'; title: string; sub: string };

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
      const email = localStorage.getItem('emailForSignIn') ?? '';
      if (!email) {
        setState({ kind: 'needs-email', href: url });
        return;
      }
      signInWithEmailLink(auth, email, url)
        .then(() => {
          localStorage.removeItem('emailForSignIn');
          hardRedirectToProfile();
        })
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
          <img src="/pics/eat-this-logo.webp" alt="Eat This" className={styles.splashLogo} />
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
          <img src="/pics/logo-dark.webp" alt="Eat This" className={styles.logoMark} />
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

// The "needs-email" state is shown when the magic link is opened on a
// different device than where it was requested (localStorage is empty).
// We collect email + identity (name + avatar) in one step so the profile
// renders with the user's chosen avatar right after sign-in.
function NeedsEmailForm({
  href,
  setState,
}: {
  href: string;
  setState: (s: State) => void;
}) {
  const [email,      setEmail]      = useState('');
  const [name,       setName]       = useState('');
  const [avatarPick, setAvatarPick] = useState<AvatarChoice>(1);
  const [error,      setError]      = useState('');
  const [busy,       setBusy]       = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name.trim()) return;
    setBusy(true);
    setError('');
    try {
      const result = await signInWithEmailLink(auth, email.trim(), href);
      localStorage.removeItem('emailForSignIn');
      const uid = result.user.uid;
      // Save display name + avatar so the profile renders with the user's
      // chosen identity right after sign-in.
      await updateProfile(result.user, { displayName: name.trim() });
      await setDoc(doc(db, 'users', uid), { avatar: avatarPick }, { merge: true });
      hardRedirectToProfile();
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
      {/* Avatar hero */}
      <div className={styles.avatarHero}>
        <img
          src={`/pics/avatar/${avatarPick}.webp`}
          alt=""
          className={styles.avatarHeroImg}
        />
      </div>

      <h1 className={styles.title}>Wähl deinen<br />Character</h1>
      <p className={styles.sub}>Und bestätige kurz deine E-Mail-Adresse.</p>

      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input
          type="text"
          autoComplete="given-name"
          placeholder="Dein Vorname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={40}
          className={styles.input}
        />
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="deine@e-mail.de"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={styles.input}
        />

        <div className={styles.avatarRow} role="radiogroup" aria-label="Avatar auswählen">
          {([1, 2, 3] as AvatarChoice[]).map((choice) => (
            <button
              key={choice}
              type="button"
              role="radio"
              aria-checked={choice === avatarPick}
              aria-label={`Avatar ${choice}`}
              className={`${styles.avatarChoice}${choice === avatarPick ? ` ${styles.avatarChoiceActive}` : ''}`}
              onClick={() => setAvatarPick(choice)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/pics/avatar/${choice}.webp`} alt="" />
            </button>
          ))}
        </div>

        {error && <p className={styles.error}>{error}</p>}
        <button type="submit" className={styles.cta} disabled={busy || !name.trim() || !email}>
          {busy ? 'Anmelden …' : 'Weiter'}
        </button>
      </form>
    </>
  );
}
