'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocale } from 'next-intl';
import { useDialogFocus } from '@/lib/useDialogFocus';
import { EMAIL_LINK_PARAMS } from '@/lib/auth/emailLinkParams';
import { HEART_PARAM, STARTER_PARAM } from '@/lib/auth/loginContinueUrl';
import { rememberPendingStarterCard } from '@/lib/auth/pendingStarterCard';
import { PROFILE_PATH, SIGNED_IN_EVENT, shouldGoToProfile } from '@/lib/auth/afterSignIn';
import { finishEmailLink } from '@/lib/auth/emailLinkPending';
import { arrivalDecided } from '@/lib/auth/signInArrival';
import { usePathname, useRouter } from '@/i18n/navigation';
import { trackEvent } from '@/lib/analytics';
import styles from './Tour.module.css';

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

type State =
  | { kind: 'confirm'; email: string; busy: boolean; error: boolean }
  | { kind: 'needs-email'; email: string; busy: boolean; error: 'invalid' | 'generic' | null }
  | { kind: 'expired' };

const EMAIL_FORM = 'email-link-sign-in';

/**
 * Der eine Klick zwischen Mail-Link und Anmeldung — direkt auf der Seite, auf
 * der die Anmeldung begann, in der Hülle der Tour.
 *
 * Den Klick gibt es wegen der Postfach-Scanner: sie folgen dem Link und
 * führen das JavaScript der Seite aus. Ein Einlösen beim Laden hat den
 * einmaligen Code auf Staging zweimal an einen Scanner verloren (26.08.2026),
 * der Mensch bekam „Dieser Link geht nicht mehr". Ein Knopf drückt sich nicht
 * von allein.
 *
 * Bis 22.09.2026 stand dieser Klick auf einer eigenen Seite /welcome. Jetzt
 * geht die Tafel auf der Seite auf, auf der die Anmeldung begann, und nach dem
 * Klick geht es ins Profil — wie nach Google (afterSignIn.ts). Bei einem neuen
 * Konto läuft dort die Tour (sie hängt an der Pack-Vergabe, siehe
 * signInArrival); losgegangen wird erst, wenn ihr Ink-Grund liegt.
 *
 * Die Adresse steht groß da, weil der Klick eine echte Frage beantwortet: als
 * WER melde ich mich hier an?
 *
 * Die Tafel steht, sobald die Seite hydriert ist — vor dem Auftritt der
 * Startseite (das Kopf-Skript im Locale-Layout lässt ihn bei einem Mail-Link
 * aus) und über jedem anderen Layer (`--et-z-email-link`). Firebase lädt erst
 * daneben und nur, wenn die Adresse wirklich einen Link trägt — die
 * Komponente hängt im Locale-Layout jeder Seite.
 */
export default function EmailLinkSignIn() {
  const locale = useLocale();
  const t = copy[locale === 'en' ? 'en' : 'de'];
  const [state, setState] = useState<State | null>(null);
  /* Der Link, wie er ankam — die Adresszeile ist da schon aufgeräumt. */
  const linkRef = useRef('');
  /* Was der Link an Absicht mitbrachte (angetippte Karte, Herz). */
  const intentRef = useRef<{ starterId: string | null; heartId: string | null }>({
    starterId: null,
    heartId: null,
  });
  const router = useRouter();
  const pathname = usePathname();

  /* Auch die Google-Anmeldung endet hier: die Anmelde-Tafel und der
     Redirect-Weg haben keinen eigenen Router und melden nur, dass jemand
     angekommen ist (afterSignIn.ts). */
  useEffect(() => {
    const onSignedIn = async () => {
      if (!shouldGoToProfile(pathname)) return;
      /* Wie beim Mail-Link: erst wenn feststeht, ob die Tour kommt — sonst
         stand das Profil offen da, bis sie aufging (signInArrival). */
      const { auth } = await import('@/lib/firebase/config');
      const uid = auth.currentUser?.uid;
      if (uid) await arrivalDecided(uid);
      router.push(PROFILE_PATH);
    };
    window.addEventListener(SIGNED_IN_EVENT, onSignedIn);
    return () => window.removeEventListener(SIGNED_IN_EVENT, onSignedIn);
  }, [pathname, router]);
  /* Nach der Anmeldung unterwegs ins Profil: angekommen, gibt die Seite frei,
     was auf den Mail-Link gewartet hat (emailLinkPending). */
  const leavingRef = useRef(false);
  useEffect(() => {
    if (!leavingRef.current) return;
    leavingRef.current = false;
    finishEmailLink();
  }, [pathname]);
  const [claimingCard, setClaimingCard] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const open = state !== null;
  useDialogFocus(open, panelRef, triggerRef);

  useEffect(() => {
    const url = new URL(window.location.href);
    const params = url.searchParams;
    if (params.get('mode') !== 'signIn' || !params.get('oobCode')) return;
    linkRef.current = url.toString();
    /* Die Adresse hat eine Mailadresse und einen einlösbaren Code in der
       Adresszeile — beides raus, bevor jemand den Link teilt oder ein
       Seitenaufruf ihn mitzählt. Die Absichten (Karte, Herz) gehen mit raus
       und warten hier; erst beim Anmelden wandern sie in den sessionStorage
       (signIn), denselben Träger wie bei Google — die Anmeldung endet im
       Profil, und dort lösen Pack-Vergabe und Spot-Liste sie ein. */
    const starterId = params.get(STARTER_PARAM);
    intentRef.current = { starterId, heartId: params.get(HEART_PARAM) };
    setClaimingCard(Boolean(starterId));
    for (const name of [...EMAIL_LINK_PARAMS, STARTER_PARAM, HEART_PARAM]) params.delete(name);
    window.history.replaceState(
      window.history.state,
      '',
      `${url.pathname}${url.search}${url.hash}`
    );

    /* Never trust an email supplied by the link. Another browser must ask
       for the address to prevent signing into a sender's account. */
    let remembered = '';
    try {
      remembered = localStorage.getItem('emailForSignIn') ?? '';
    } catch {}
    setState(
      remembered
        ? { kind: 'confirm', email: remembered, busy: false, error: false }
        : { kind: 'needs-email', email: '', busy: false, error: null }
    );

    /* Firebase lädt, während die Tafel schon steht. Ein Link, den Firebase
       nicht als Anmelde-Link erkennt, ist eine Sackgasse. Ohne Abbruch beim
       Aufräumen: die Adresszeile ist schon geräumt, ein zweiter Lauf des
       Effekts (StrictMode) kommt hier nie an — er muss das Ergebnis des
       ersten bekommen. Die Komponente hängt im Layout und bleibt stehen. */
    Promise.all([import('@/lib/firebase/config'), import('firebase/auth')]).then(
      ([{ auth }, { isSignInWithEmailLink }]) => {
        if (!isSignInWithEmailLink(auth, linkRef.current)) setState({ kind: 'expired' });
      },
      () => setState({ kind: 'expired' })
    );
  }, []);

  useEffect(() => {
    if (!open) return;
    titleRef.current?.focus({ preventScroll: true });
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open, state?.kind]);

  if (!state) return null;

  const close = () => {
    setState(null);
    finishEmailLink();
  };

  const signIn = async (email: string) => {
    const { starterId, heartId } = intentRef.current;
    const [{ auth }, { signInWithEmailLink }, pendingHeart] = await Promise.all([
      import('@/lib/firebase/config'),
      import('firebase/auth'),
      heartId ? import('@/lib/map/pendingHeart') : null,
    ]);
    /* Vor der Anmeldung gemerkt: Pack-Vergabe und Spot-Liste lesen sie,
       sobald das Konto da ist — und die Frist (zehn Minuten) beginnt erst
       jetzt, nicht beim Öffnen des Links. */
    if (starterId) rememberPendingStarterCard(starterId);
    if (heartId) pendingHeart?.rememberPendingHeart(heartId);
    const credential = await signInWithEmailLink(auth, email, linkRef.current);
    const { user } = credential;
    try {
      localStorage.removeItem('emailForSignIn');
    } catch {}
    trackEvent(user.displayName ? 'login' : 'sign_up', { method: 'email_link' });
    /* Die Tafel bleibt („Anmelden …"), bis feststeht, ob die Tour kommt.
       Kommt sie, liegt ihr Ink-Grund dann schon unter der Tafel, und das
       Profil wechselt verdeckt darunter — man sieht es nie vor der Tour. */
    await arrivalDecided(user.uid);
    setState(null);
    /* Was auf der alten Seite von selbst aufgehen wollte, bleibt bis zum
       Seitenwechsel zurückgehalten — sonst blitzte es vor dem Profil auf. */
    if (!shouldGoToProfile(pathname)) return finishEmailLink();
    leavingRef.current = true;
    router.push(PROFILE_PATH);
  };

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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.artImg} src="/pics/home/starter-pack-front.webp" alt={t.packAlt} />
        </div>
        <div className={styles.copy}>
          <p className={styles.kicker}>{t.kicker}</p>
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.artImg} src="/pics/home/starter-pack-front.webp" alt={t.packAlt} />
        </div>
        <div className={styles.copy}>
          <p className={styles.kicker}>{t.kicker}</p>
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.artImg} src="/pics/card-back.webp?v=8" alt="" />
        </div>
        <div className={styles.copy}>
          <p className={styles.kicker}>{t.expiredKicker}</p>
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
    <div className={`${styles.layer} ${styles.layerTop}`}>
      <div
        ref={panelRef}
        className={styles.panel}
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
          <button type="button" className={styles.quiet} onClick={close}>
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
