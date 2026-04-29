'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  isSignInWithEmailLink,
  signInWithEmailLink,
  applyActionCode,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import styles from './auth-action.module.css';

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
          router.replace('/');
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

    // resetPassword OR unknown — both flow into the same generic "expired" view
    setState({ kind: 'expired' });
  }, [params, router]);

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.logoWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pics/eat-email.png" alt="Eat This" />
        </div>

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
      </section>
    </main>
  );
}

function NeedsEmailForm({
  href,
  setState,
}: {
  href: string;
  setState: (s: State) => void;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy,  setBusy]  = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    setError('');
    signInWithEmailLink(auth, email, href)
      .then(() => {
        localStorage.removeItem('emailForSignIn');
        router.replace('/');
      })
      .catch((err: unknown) => {
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
      });
  };

  return (
    <>
      <h1 className={styles.title}>Kurz bestätigen.</h1>
      <p className={styles.sub}>
        Gib die E-Mail-Adresse ein, an die wir die Nachricht
        geschickt haben.
      </p>
      <form onSubmit={submit}>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="deine@e-mail.de"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            width:        '100%',
            padding:      '14px 18px',
            border:       '1px solid #E5E5E5',
            borderRadius: '12px',
            fontSize:     '15px',
            marginBottom: '12px',
            outline:      'none',
            boxSizing:    'border-box',
          }}
        />
        {error && (
          <p style={{ color: '#C0392B', fontSize: '13px', margin: '0 0 12px' }}>
            {error}
          </p>
        )}
        <button type="submit" className={styles.cta} disabled={busy}>
          {busy ? 'Anmelden …' : 'Jetzt anmelden'}
        </button>
      </form>
    </>
  );
}
