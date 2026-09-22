'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  isSignInWithEmailLink,
  signInWithEmailLink,
  applyActionCode,
  type User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { routing } from '@/i18n/routing';
import { postSignInTarget } from '@/lib/auth/postSignInTarget';
import { STARTER_PARAM } from '@/lib/auth/loginContinueUrl';
import { handoffEvent } from '@/lib/analytics';
import { welcomeLocale, type WelcomeLocale } from '@/lib/auth/welcomeLocale';
import { WELCOME_COPY } from './copy';
import styles from './auth-action.module.css';

// /welcome lives under its own root layout (separate <html> tree); the
// post-sign-in landing pages live under [locale]/. Crossing root layouts
// with router.replace can silently no-op, so we hard-navigate via
// window.location.assign to guarantee the page actually changes.
function hardRedirectAfterSignIn(locale: WelcomeLocale) {
  const home = locale === routing.defaultLocale ? '/' : `/${locale}`;
  // Kein Übergangseffekt: hier wartet jemand darauf, dass der Login endlich
  // durch ist. Ein gelber Vorhang stand hier mal, um den weissen Blitz beim
  // Wechsel der Root-Layouts zu verdecken — er navigierte aber 40ms vor Ende
  // seiner eigenen Animation, deckte also nie, und kostete 380ms Wartezeit.
  window.location.assign(postSignInTarget(window.location.search, window.location.origin, home));
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
 * Der Leser wollte EINE Karte und hat dafür seine Mail dagelassen — der
 * Bestätigungs-Screen sagt ihm, dass sie im Pack dabei ist. Der Marker aus der
 * Continue-URL ist das Einzige, was diesen Zusammenhang über den Posteingang
 * gerettet hat.
 *
 * Gelesen wird `starter` — derselbe Parameter, den `buildLoginContinueUrl`
 * setzt und den `/api/starter-pack` einlöst.
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

type State =
  | { kind: 'processing' }
  | { kind: 'confirm-preview' }
  | { kind: 'confirm'; email: string; href: string; claimingCard: boolean }
  | { kind: 'success' }
  | { kind: 'needs-email'; href: string }
  | { kind: 'expired' };

/**
 * Nach dem Einlösen des Links geht es sofort zurück, woher der Login kam.
 *
 * Name und Charakter fragt hier niemand mehr ab: das tut die Tour auf ihrer
 * ersten Seite (SignInReward, identityStep) — für E-Mail und Google gleich,
 * weil sie an der Pack-Vergabe hängt und nicht am Anmeldeweg. Bis 22.09.2026
 * hatte /welcome dafür ein eigenes Formular; der Magic-Link lief damit durch
 * ein anderes Onboarding als Google.
 */
function finishSignIn(user: User, locale: WelcomeLocale) {
  localStorage.removeItem('emailForSignIn');
  handoffEvent(user.displayName ? 'login' : 'sign_up', { method: 'email_link' });
  hardRedirectAfterSignIn(locale);
}

export default function WelcomeClient() {
  return (
    <Suspense fallback={null}>
      <AuthActionInner />
    </Suspense>
  );
}

function AuthActionInner() {
  const params = useSearchParams();
  const [state, setState] = useState<State>({ kind: 'processing' });
  const locale = useMemo(
    () => welcomeLocale(params.toString(), typeof document === 'undefined' ? '' : document.cookie),
    [params]
  );
  const t = WELCOME_COPY[locale];

  // layout.tsx setzt lang="de" statisch — die Sprache steht erst hier fest.
  // Den Titel setzt page.tsx serverseitig: ein document.title von hier aus
  // ueberschrieb Next in Produktion 2 ms spaeter mit dem Metadaten-Titel.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    // Local design review only: never signs in or writes an account.
    if (process.env.NODE_ENV === 'development' && params.get('preview') === 'loading') {
      setState({ kind: 'processing' });
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
          setState({ kind: 'success' });
          setTimeout(() => window.location.assign(locale === 'en' ? '/en' : '/'), 1800);
        })
        .catch(() => {
          setState({ kind: 'expired' });
        });
      return;
    }

    setState({ kind: 'expired' });
  }, [params, locale]);

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
              <h1 className={styles.splashTitle}>{t.splashTitle}</h1>
              <p>{t.splashSub}</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div
        className={`${styles.frame}${state.kind === 'confirm' || state.kind === 'confirm-preview' ? ` ${styles.confirmFrame}` : ''}`}
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
            <h1 className={styles.title}>{t.verifiedTitle}</h1>
            <p className={styles.sub}>{t.verifiedSub}</p>
          </>
        )}

        {state.kind === 'confirm-preview' && (
          <ConfirmSignIn
            email={t.previewEmail}
            href=""
            claimingCard={false}
            setState={setState}
            locale={locale}
            preview
          />
        )}

        {state.kind === 'confirm' && (
          <ConfirmSignIn
            email={state.email}
            href={state.href}
            claimingCard={state.claimingCard}
            setState={setState}
            locale={locale}
          />
        )}

        {state.kind === 'needs-email' && (
          <NeedsEmailForm href={state.href} setState={setState} locale={locale} />
        )}

        {state.kind === 'expired' && (
          <>
            <p className={styles.kicker}>{t.expiredKicker}</p>
            <h1 className={styles.title}>{t.expiredTitle}</h1>
            <p className={styles.sub}>{t.expiredSub}</p>
            <Link href={locale === 'en' ? '/en' : '/'} className={styles.cta}>
              {t.home}
            </Link>
          </>
        )}
      </div>
    </main>
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
  locale,
  preview = false,
}: {
  preview?: boolean;
  email: string;
  href: string;
  claimingCard: boolean;
  setState: (s: State) => void;
  locale: WelcomeLocale;
}) {
  const t = WELCOME_COPY[locale];
  const submit = () => {
    if (preview && process.env.NODE_ENV === 'development') {
      // Weiter wie nach einer echten Anmeldung: die Tour, mit Namensseite.
      window.location.assign(`${locale === 'en' ? '/en' : '/'}?preview=welcome`);
      return;
    }
    setState({ kind: 'processing' });
    signInWithEmailLink(auth, email, href)
      .then((result) => finishSignIn(result.user, locale))
      .catch((err) => {
        console.warn('[welcome] signInWithEmailLink failed:', err);
        setState({ kind: 'expired' });
      });
  };

  return (
    <>
      <div className={styles.confirmHero}>
        <div className={styles.confirmHeading}>
          <p className={styles.kicker}>{t.confirmKicker}</p>
          <h1 className={styles.title}>
            {t.confirmTitle[0]}
            <br />
            {t.confirmTitle[1]}
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
        <span>{t.confirmAs}</span>
        <strong>{email}</strong>
      </div>
      {claimingCard && <p className={styles.confirmNote}>{t.confirmCardNote}</p>}
      <button type="button" className={styles.cta} onClick={submit}>
        <span>{t.confirmCta}</span>
      </button>
    </>
  );
}

// Fallback for legacy links without the `e` carrier param that were opened
// in a different browser than where they were requested (localStorage empty).
// Firebase needs the address to complete the sign-in.
function NeedsEmailForm({
  href,
  setState,
  locale,
}: {
  href: string;
  setState: (s: State) => void;
  locale: WelcomeLocale;
}) {
  const t = WELCOME_COPY[locale];
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
      finishSignIn(result.user, locale);
    } catch (err: unknown) {
      setBusy(false);
      const code = (err as { code?: string }).code ?? '';
      if (code === 'auth/invalid-email') {
        setError(t.emailInvalid);
      } else if (code === 'auth/expired-action-code' || code === 'auth/invalid-action-code') {
        setState({ kind: 'expired' });
      } else {
        setError(t.genericError);
      }
    }
  };

  return (
    <>
      <p className={styles.kicker}>{t.emailKicker}</p>
      <h1 className={styles.title}>{t.emailTitle}</h1>
      <p className={styles.sub}>{t.emailSub}</p>

      <form onSubmit={submit} className={styles.form}>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={t.emailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={styles.input}
        />

        {error && <p className={styles.error}>{error}</p>}
        <button type="submit" className={styles.cta} disabled={busy || !email}>
          <span>{busy ? t.signingIn : t.next}</span>
        </button>
      </form>
    </>
  );
}
