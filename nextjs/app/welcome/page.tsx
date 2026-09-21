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
import { STARTER_PARAM } from '@/lib/auth/loginContinueUrl';
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
 * Ob dieser Login aus einer angetippten Must-Eat-Karte heraus gestartet wurde.
 *
 * Ein neues Konto muss vor der Weiterleitung noch durch Name und Avatar, und
 * genau dort brach der Faden: der Leser wollte EINE Karte, hat dafür seine
 * Mail dagelassen, und steht plötzlich in einem Formular, das mit keinem Wort
 * erwähnt, worauf das hinausläuft (User, 26.08.2026). Der Marker aus der
 * Continue-URL ist das Einzige, was diesen Zusammenhang über den Posteingang
 * gerettet hat — er trägt ihn hier eine Stufe weiter.
 *
 * Gelesen wird `starter` — derselbe Parameter, den `buildLoginContinueUrl`
 * setzt und den `/api/starter-pack` einlöst. Bis zum 20.09.2026 stand hier
 * `claim=1`: der Marker des Gratis-Spot-Wegs, den der 06.09.2026 abgeschafft
 * hat. Seither schrieb ihn niemand mehr, also waren beide Zeilen unten tot —
 * und der Test hatte es nicht gemerkt, weil er seine Adresse selbst baute
 * statt sie bauen zu lassen.
 */
function hasPendingStarterCard(params: URLSearchParams): boolean {
  const cu = params.get('continueUrl');
  if (!cu) return false;
  try {
    return Boolean(new URL(cu).searchParams.get(STARTER_PARAM));
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
  | { kind: 'identity-preview' }
  | { kind: 'confirm-preview' }
  | { kind: 'confirm'; email: string; href: string; claimingCard: boolean }
  | { kind: 'success'; title: string; sub: string }
  | { kind: 'needs-email'; href: string }
  | { kind: 'needs-identity'; user: User; claimingCard: boolean }
  | { kind: 'expired' }
  | { kind: 'error'; title: string; sub: string };

// First sign-in ever (no display name yet) → identity onboarding before the
// redirect; returning users go straight home. Shared by the silent path and
// the needs-email fallback.
function finishSignIn(user: User, setState: (s: State) => void, claimingCard = false) {
  localStorage.removeItem('emailForSignIn');
  handoffEvent(user.displayName ? 'login' : 'sign_up', { method: 'email_link' });
  if (!user.displayName) {
    setState({ kind: 'needs-identity', user, claimingCard });
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
    // Local design review only: never signs in or writes an account.
    if (process.env.NODE_ENV === 'development' && params.get('preview') === 'loading') {
      setState({ kind: 'processing' });
      return;
    }
    if (process.env.NODE_ENV === 'development' && params.get('preview') === 'identity') {
      setState({ kind: 'identity-preview' });
      return;
    }
    if (process.env.NODE_ENV === 'development' && params.get('preview') === 'confirm') {
      setState({ kind: 'confirm-preview' });
      return;
    }
    const mode = params.get('mode');
    const oobCode = params.get('oobCode');
    const url = window.location.href;

    if (mode === 'signIn') {
      if (!isSignInWithEmailLink(auth, url)) {
        setState({ kind: 'expired' });
        return;
      }
      /* Der Link kennt seine Adresse selbst — er hat Vorrang vor dem, was
         zuletzt im localStorage lag. Andersherum gewann eine alte gemerkte
         Adresse: wer zwei Links an verschiedene Adressen anfordert und den
         aelteren oeffnet, meldete sich als die falsche Person an und bekam
         „Dieser Link geht nicht mehr". */
      const email = emailFromContinueUrl(params) || localStorage.getItem('emailForSignIn') || '';
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
      setState({
        kind: 'confirm',
        email,
        href: url,
        claimingCard: hasPendingStarterCard(params),
      });
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

  // The link check uses the same panel language as the onboarding.
  if (state.kind === 'processing') {
    return (
      <main className={styles.splashPage}>
        <div className={styles.loadingLayer}>
          <div className={styles.splash} role="status" aria-live="polite" aria-busy="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pics/eat-this-logo.webp?v=6" alt="Eat This" className={styles.splashLogo} />
            <div className={styles.loadingCards} aria-hidden="true">
              {/* eslint-disable @next/next/no-img-element */}
              <img src="/pics/card-back.webp?v=7" alt="" />
              <img src="/pics/card-back.webp?v=7" alt="" />
              <img src="/pics/card-front.webp?v=3" alt="" />
              {/* eslint-enable @next/next/no-img-element */}
            </div>
            <div className={styles.splashCopy}>
              <h1 className={styles.splashTitle}>Gleich geht’s los.</h1>
              <p>Deine Anmeldung wird vorbereitet.</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div
        className={`${styles.frame}${state.kind === 'confirm' || state.kind === 'confirm-preview' ? ` ${styles.confirmFrame}` : ''}${state.kind === 'needs-identity' || state.kind === 'identity-preview' ? ` ${styles.identityFrame}` : ''}`}
      >
        <div className={styles.logoWrap}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pics/eat-this-logo.webp?v=6" alt="Eat This" className={styles.logoMark} />
        </div>

        {/* Die Zustaende liegen direkt im Panel. Sie standen bis hierher in
            einem Kasten mit `styles.content` — eine Klasse, die es seit dem
            Umbau auf die Bildsprache der Startseite nicht mehr gibt; ihre
            Abstaende tragen jetzt die Elemente selbst (`.title`, `.sub`,
            `.kicker`, `.form`). Der Kasten war damit nur noch Verschachtelung. */}
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

        {state.kind === 'confirm-preview' && (
          <ConfirmSignIn
            email="du@beispiel.de"
            href=""
            claimingCard={false}
            setState={setState}
            preview
          />
        )}

        {state.kind === 'confirm' && (
          <ConfirmSignIn
            email={state.email}
            href={state.href}
            claimingCard={state.claimingCard}
            setState={setState}
          />
        )}

        {state.kind === 'needs-email' && <NeedsEmailForm href={state.href} setState={setState} />}

        {state.kind === 'identity-preview' && <IdentityForm preview claimingCard={false} />}

        {state.kind === 'needs-identity' && (
          <IdentityForm user={state.user} claimingCard={state.claimingCard} />
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
              Startseite
            </Link>
          </>
        )}

        {state.kind === 'error' && (
          <>
            <h1 className={styles.title}>{state.title}</h1>
            <p className={styles.sub}>{state.sub}</p>
            <Link href="/" className={styles.cta}>
              Startseite
            </Link>
          </>
        )}
      </div>
    </main>
  );
}

// First-sign-in onboarding: pick name + avatar once, then land on Home.
// Shown to every new account (the sign-in itself already happened).
type IdentityProps = { claimingCard: boolean } & (
  | { preview: true; user?: never }
  | { preview?: false; user: User }
);

function IdentityForm({ user, claimingCard, preview = false }: IdentityProps) {
  const [name, setName] = useState('');
  const [avatarPick, setAvatarPick] = useState<AvatarChoice>(2);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (preview && process.env.NODE_ENV === 'development') {
      // Weiter wie nach einer echten Anmeldung: die Tour mit dem Pack.
      window.location.assign('/?preview=welcome');
      return;
    }
    if (!user) return;
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
      <p className={styles.kicker}>Willkommen bei Eat This</p>
      <h1 className={styles.title}>Wer bist du?</h1>
      <p className={styles.sub}>Wähle deinen Charakter.</p>
      {/* Der Faden zurück zu der einen Karte, für die das hier alles passiert.
          Ohne ihn ist dieses Formular eine Unterbrechung ohne erkennbaren
          Grund. */}
      {claimingCard && (
        <p className={styles.sub}>
          Danach geht’s zurück, wo du warst — deine Karte liegt dann offen im Pack.
        </p>
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
            placeholder="Dein Name oder Spitzname"
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
  claimingCard,
  setState,
  preview = false,
}: {
  preview?: boolean;
  email: string;
  href: string;
  claimingCard: boolean;
  setState: (s: State) => void;
}) {
  const submit = () => {
    if (preview && process.env.NODE_ENV === 'development') {
      setState({ kind: 'identity-preview' });
      return;
    }
    setState({ kind: 'processing' });
    signInWithEmailLink(auth, email, href)
      .then((result) => finishSignIn(result.user, setState, claimingCard))
      .catch((err) => {
        console.warn('[welcome] signInWithEmailLink failed:', err);
        setState({ kind: 'expired' });
      });
  };

  return (
    <>
      <div className={styles.confirmHero}>
        <div className={styles.confirmHeading}>
          <p className={styles.kicker}>Ein Klick noch</p>
          <h1 className={styles.title}>
            Deine Map.
            <br />
            Deine Sammlung.
          </h1>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={styles.confirmPack}
          src="/pics/booster/booster_free.webp"
          alt="Eat This Starter Pack"
        />
      </div>
      <div className={styles.confirmIdentity}>
        <span>Anmelden als</span>
        <strong>{email}</strong>
      </div>
      {claimingCard && <p className={styles.confirmNote}>Deine Karte ist im Pack dabei.</p>}
      <button type="button" className={styles.cta} onClick={submit}>
        <span>Anmelden</span>
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
