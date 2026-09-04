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
import { postSignInTarget } from '@/lib/auth/postSignInTarget';
import { handoffEvent } from '@/lib/analytics';
import styles from './auth-action.module.css';

// /welcome lives under its own root layout (separate <html> tree); the
// post-sign-in landing pages live under [locale]/. Crossing root layouts
// with router.replace can silently no-op, so we hard-navigate via
// window.location.assign to guarantee the page actually changes.
function hardRedirectAfterSignIn() {
  const locale = detectLocale();
  const home = locale === routing.defaultLocale ? '/' : `/${locale}`;
  // Kein Übergangseffekt: hier wartet jemand darauf, dass der Login endlich
  // durch ist. Ein gelber Vorhang stand hier mal, um den weissen Blitz beim
  // Wechsel der Root-Layouts zu verdecken — er navigierte aber 40ms vor Ende
  // seiner eigenen Animation, deckte also nie, und kostete 380ms Wartezeit.
  window.location.assign(postSignInTarget(window.location.search, window.location.origin, home));
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

/**
 * Ob dieser Login aus einem gesperrten Spot heraus gestartet wurde.
 *
 * Ein neues Konto muss vor der Weiterleitung noch durch Name und Avatar, und
 * genau dort brach der Faden: der Leser wollte EINEN Spot, hat dafür seine
 * Mail dagelassen, und steht plötzlich in einem Formular, das mit keinem Wort
 * erwähnt, worauf das hinausläuft (User, 26.08.2026). Der Claim-Marker aus der
 * Continue-URL ist das Einzige, was diesen Zusammenhang über den Posteingang
 * gerettet hat — er trägt ihn hier eine Stufe weiter.
 */
function hasPendingSpotClaim(params: URLSearchParams): boolean {
  const cu = params.get('continueUrl');
  if (!cu) return false;
  try {
    return new URL(cu).searchParams.get('claim') === '1';
  } catch {
    return false;
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
  | { kind: 'confirm'; email: string; href: string; claimingSpot: boolean }
  | { kind: 'success'; title: string; sub: string }
  | { kind: 'needs-email'; href: string }
  | { kind: 'needs-identity'; user: User; claimingSpot: boolean }
  | { kind: 'expired' }
  | { kind: 'error'; title: string; sub: string };

// First sign-in ever (no display name yet) → identity onboarding before the
// redirect; returning users go straight home. Shared by the silent path and
// the needs-email fallback.
function finishSignIn(user: User, setState: (s: State) => void, claimingSpot = false) {
  localStorage.removeItem('emailForSignIn');
  handoffEvent(user.displayName ? 'login' : 'sign_up', { method: 'email_link' });
  if (!user.displayName) {
    setState({ kind: 'needs-identity', user, claimingSpot });
    return;
  }
  hardRedirectAfterSignIn();
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
    const mode = params.get('mode');
    const oobCode = params.get('oobCode');
    const url = window.location.href;

    if (mode === 'signIn') {
      if (!isSignInWithEmailLink(auth, url)) {
        setState({ kind: 'expired' });
        return;
      }
      const email = localStorage.getItem('emailForSignIn') || emailFromContinueUrl(params);
      if (!email) {
        // Legacy links without the `e` param, opened in a foreign browser.
        setState({ kind: 'needs-email', href: url });
        return;
      }
      /* Der oobCode wird NICHT mehr beim Laden eingelöst. Er ist einmalig, und
         Postfach-Scanner rendern diese Seite mit laufendem JavaScript: auf
         Staging hat einer den Sign-in komplett selbst ausgeführt und den Code
         verbrannt, bevor der Mensch klicken konnte — mal gewann der Scanner
         das Rennen, mal der Mensch (26.08.2026, zweimal reproduziert, per
         auth/invalid-action-code auf Sekunden frische Codes). Ein Klick ist
         die Grenze, die ein Scanner nicht überschreitet; der Mensch zahlt
         dafür einen Tap. Das needs-email-Formular hatte diese Grenze immer
         schon, jetzt hat der Normalfall sie auch. */
      setState({ kind: 'confirm', email, href: url, claimingSpot: hasPendingSpotClaim(params) });
      return;
    }

    if (mode === 'verifyEmail' && oobCode) {
      applyActionCode(auth, oobCode)
        .then(() => {
          setState({
            kind: 'success',
            title: 'Bestätigt.',
            sub: 'Du wirst weitergeleitet …',
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
        <div className={styles.splash} role="status" aria-live="polite">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pics/eat-this-logo.webp?v=6" alt="Eat This" className={styles.splashLogo} />
          <div className={styles.marks} aria-hidden>
            <span className={styles.mark} />
            <span className={styles.mark} />
            <span className={styles.mark} />
          </div>
          <div className={styles.splashCopy}>
            <h1 className={styles.splashTitle}>Wir schliessen auf</h1>
            <p>Dein Link wird geprüft — gleich ist deine Map offen.</p>
          </div>
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
                <svg viewBox="0 0 24 24">
                  <polyline points="5 13 9 17 19 7" />
                </svg>
              </div>
              <h1 className={styles.title}>{state.title}</h1>
              <p className={styles.sub}>{state.sub}</p>
            </>
          )}

          {state.kind === 'confirm' && (
            <ConfirmSignIn
              email={state.email}
              href={state.href}
              claimingSpot={state.claimingSpot}
              setState={setState}
            />
          )}

          {state.kind === 'needs-email' && <NeedsEmailForm href={state.href} setState={setState} />}

          {state.kind === 'needs-identity' && (
            <IdentityForm user={state.user} claimingSpot={state.claimingSpot} />
          )}

          {state.kind === 'expired' && (
            <>
              <p className={styles.kicker}>Sackgasse</p>
              <h1 className={styles.title}>Dieser Link geht nicht mehr</h1>
              <p className={styles.sub}>
                Er ist abgelaufen oder wurde bereits verwendet. Starte den Login einfach noch einmal
                von der Startseite.
              </p>
              <Link href="/" className={styles.cta}>
                Zur Startseite
              </Link>
            </>
          )}

          {state.kind === 'error' && (
            <>
              <h1 className={styles.title}>{state.title}</h1>
              <p className={styles.sub}>{state.sub}</p>
              <Link href="/" className={styles.cta}>
                Zur Startseite
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

// First-sign-in onboarding: pick name + avatar once, then land on Home.
// Shown to every new account (the sign-in itself already happened).
function IdentityForm({ user, claimingSpot }: { user: User; claimingSpot: boolean }) {
  const [name, setName] = useState('');
  const [avatarPick, setAvatarPick] = useState<AvatarChoice>(2);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    try {
      // Save display name + avatar so the profile renders with the user's
      // chosen identity right after sign-in.
      await updateProfile(user, { displayName: name.trim() });
      const [{ doc, setDoc }, db] = await Promise.all([import('firebase/firestore'), getDb()]);
      await setDoc(doc(db, 'users', user.uid), { avatar: avatarPick }, { merge: true });
      try {
        localStorage.setItem(`eatthis_avatar_${user.uid}`, String(avatarPick));
        localStorage.setItem(
          '_authHint',
          JSON.stringify({
            n: name.trim().split(' ')[0] || name.trim(),
            a: avatarPick,
            u: user.uid,
          })
        );
      } catch {}
      hardRedirectAfterSignIn();
    } catch {
      setBusy(false);
      setError('Etwas ist schiefgelaufen. Versuch es nochmal.');
    }
  };

  return (
    <>
      <p className={styles.kicker}>Fast fertig</p>
      <h1 className={styles.title}>
        Wer bist du
        <br />
        auf der Map?
      </h1>
      <p className={styles.sub}>
        Such dir Name und Avatar — beides siehst nur du im Profil, später nicht mehr änderbar.
      </p>
      {/* Der Faden zurück zu dem einen Spot, für den das hier alles passiert.
          Ohne ihn ist dieses Formular eine Unterbrechung ohne erkennbaren
          Grund. */}
      {claimingSpot && (
        <p className={styles.sub}>Danach geht’s zurück auf deine Map — mit deinem Spot offen.</p>
      )}

      <form onSubmit={submit} className={styles.form}>
        <div>
          <label className={styles.nameLabel} htmlFor="ob-name">
            Dein Name
          </label>
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
                <img src={`/pics/avatar/${id}.webp?v=4`} alt="" />
              </span>
              <span className={styles.avatarName}>{label}</span>
            </button>
          ))}
        </div>

        {error && <p className={styles.error}>{error}</p>}
        <button type="submit" className={styles.cta} disabled={busy || !name.trim()}>
          <span>{busy ? 'Speichern …' : 'Weiter'}</span>
          {!busy && (
            <svg
              viewBox="0 0 24 24"
              width={16}
              height={16}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.6}
            >
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          )}
        </button>
      </form>
    </>
  );
}

/**
 * Der eine Klick zwischen Link und Anmeldung.
 *
 * Er existiert für die Maschinen, nicht für die Menschen: Postfach-Scanner
 * folgen dem Link und führen das JavaScript dieser Seite aus — der alte
 * Auto-Sign-in beim Laden hat den einmaligen Code damit an den Scanner
 * verloren, und der Mensch bekam "Dieser Link geht nicht mehr" für einen
 * Link, den er nie benutzt hat. Ein Button klickt sich nicht von allein.
 *
 * Die Adresse steht gross auf dem Screen, weil der Klick eine echte Frage
 * beantwortet: als WER melde ich mich hier an? Das ist derselbe Moment, den
 * das needs-email-Formular für Fremd-Browser immer schon hatte — nur ohne
 * Tippen. Nach dem Klick übernimmt der gelbe Splash, damit das Warten wie
 * Ankommen aussieht und nicht wie ein hängendes Formular.
 */
function ConfirmSignIn({
  email,
  href,
  claimingSpot,
  setState,
}: {
  email: string;
  href: string;
  claimingSpot: boolean;
  setState: (s: State) => void;
}) {
  const submit = () => {
    setState({ kind: 'processing' });
    signInWithEmailLink(auth, email, href)
      .then((result) => finishSignIn(result.user, setState, claimingSpot))
      .catch((err) => {
        console.warn('[welcome] signInWithEmailLink failed:', err);
        setState({ kind: 'expired' });
      });
  };

  return (
    <>
      <p className={styles.kicker}>Ein Klick noch</p>
      <h1 className={styles.title}>
        Mach deine
        <br />
        Map auf
      </h1>
      <p className={styles.sub}>
        Du meldest dich an als <strong>{email}</strong>.{claimingSpot && ' Dein Spot wartet schon.'}
      </p>
      <button type="button" className={styles.cta} onClick={submit}>
        <span>Jetzt anmelden</span>
        <svg
          viewBox="0 0 24 24"
          width={16}
          height={16}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.6}
        >
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </button>
    </>
  );
}

// Fallback for legacy links without the `e` carrier param that were opened
// in a different browser than where they were requested (localStorage empty).
// Firebase needs the address to complete the sign-in; identity onboarding
// follows separately via finishSignIn.
function NeedsEmailForm({ href, setState }: { href: string; setState: (s: State) => void }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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
      } else if (code === 'auth/expired-action-code' || code === 'auth/invalid-action-code') {
        setState({ kind: 'expired' });
      } else {
        setError('Etwas ist schiefgelaufen. Versuch es nochmal.');
      }
    }
  };

  return (
    <>
      <p className={styles.kicker}>Noch ein Schritt</p>
      <h1 className={styles.title}>Fast drin</h1>
      <p className={styles.sub}>
        Du hast den Link in einem anderen Browser geöffnet. Bestätige kurz die E-Mail-Adresse, an
        die er geschickt wurde.
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
            <svg
              viewBox="0 0 24 24"
              width={16}
              height={16}
              fill="none"
              stroke="currentColor"
              strokeWidth={2.6}
            >
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          )}
        </button>
      </form>
    </>
  );
}
