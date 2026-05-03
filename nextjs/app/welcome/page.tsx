'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  isSignInWithEmailLink,
  signInWithEmailLink,
  applyActionCode,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';
import { routing } from '@/i18n/routing';
import { postLoginRedirect } from '@/lib/auth/postLoginRedirect';
import styles from './auth-action.module.css';

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
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: 'processing' });

  useEffect(() => {
    const mode    = params.get('mode');
    const oobCode = params.get('oobCode');
    const url     = window.location.href;
    const locale  = detectLocale();

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
        .then(async (result) => {
          localStorage.removeItem('emailForSignIn');
          await postLoginRedirect(result.user.uid, router, locale);
        })
        .catch(() => {
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
          setTimeout(() => router.replace('/'), 1800);
        })
        .catch(() => {
          setState({ kind: 'expired' });
        });
      return;
    }

    setState({ kind: 'expired' });
  }, [params, router]);

  return (
    <main className={styles.page}>
      <div className={styles.frame}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/pics/login/Black screen.webp"
          alt=""
          className={styles.heroImg}
          decoding="async"
        />
        <div className={styles.scrimTop} />
        <div className={styles.scrimBottom} />

        <div className={styles.logoWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pics/login/eat 1.webp" alt="Eat This" className={styles.logoMark} />
        </div>

        <div className={styles.content}>
          {state.kind === 'processing' && (
            <>
              <div className={styles.spinner} aria-hidden />
              <h1 className={styles.title}>Einen Moment …</h1>
              <p className={styles.sub}>Du wirst gleich angemeldet.</p>
            </>
          )}

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
// We collect email + identity (name + avatar) in one step so the user
// lands directly at the pack slide in Onboarding rather than having to
// fill in identity again.
function NeedsEmailForm({
  href,
  setState,
}: {
  href: string;
  setState: (s: State) => void;
}) {
  const router = useRouter();
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
      // Save display name + avatar so the identity slide can be skipped.
      await updateProfile(result.user, { displayName: name.trim() });
      await setDoc(doc(db, 'users', uid), { avatar: avatarPick }, { merge: true });
      // Signal the onboarding page to skip the identity slide.
      sessionStorage.setItem('onboardingSkipIdentity', 'true');
      const locale = detectLocale();
      const base   = locale === routing.defaultLocale ? '' : `/${locale}`;
      router.replace(`${base}/onboarding`);
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
      {/* Avatar hero — mirrors onboarding identity slide */}
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
