'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocale } from 'next-intl';
import { useDialogFocus } from '@/lib/useDialogFocus';
import { EMAIL_LINK_EMAIL_PARAM, EMAIL_LINK_PARAMS } from '@/lib/auth/emailLinkParams';
import { HEART_PARAM, STARTER_PARAM } from '@/lib/auth/loginContinueUrl';
import {
  PROFILE_PATH,
  SIGNED_IN_EVENT,
  shouldGoToProfile,
  type SignedInDetail,
} from '@/lib/auth/afterSignIn';
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
 * Bis 22.09.2026 stand dieser Klick auf einer eigenen Seite /welcome, mit
 * eigenem Layout, die danach hart auf die Zielseite weiterleitete. Jetzt
 * bleibt man, wo man ist: nach dem Klick geht die Tafel zu, und was folgt,
 * ist dasselbe wie nach Google — die Tour bei einem neuen Konto (sie hängt an
 * der Pack-Vergabe, siehe signInArrival), sonst „Du bist angemeldet".
 *
 * Die Adresse steht groß da, weil der Klick eine echte Frage beantwortet: als
 * WER melde ich mich hier an?
 *
 * Firebase wird erst geladen, wenn die Adresse wirklich einen Link trägt —
 * die Komponente hängt im Locale-Layout jeder Seite.
 */
export default function EmailLinkSignIn() {
  const locale = useLocale();
  const t = copy[locale === 'en' ? 'en' : 'de'];
  const [state, setState] = useState<State | null>(null);
  /* Der Link, wie er ankam — die Adresszeile ist da schon aufgeräumt. */
  const linkRef = useRef('');
  /* Kam der Link mit einem Anlass (Karte, Herz)? Dann bleibt die Anmeldung
     auf dieser Seite — siehe afterSignIn.ts. */
  const hadIntentRef = useRef(false);
  const router = useRouter();
  const pathname = usePathname();

  /* Auch die Google-Anmeldung endet hier: die Anmelde-Tafel hat keinen
     eigenen Router und meldet nur, wer angekommen ist (afterSignIn.ts). */
  useEffect(() => {
    const onSignedIn = (event: Event) => {
      const detail = (event as CustomEvent<SignedInDetail>).detail;
      if (shouldGoToProfile({ ...detail, pathname })) router.push(PROFILE_PATH);
    };
    window.addEventListener(SIGNED_IN_EVENT, onSignedIn);
    return () => window.removeEventListener(SIGNED_IN_EVENT, onSignedIn);
  }, [pathname, router]);
  const [claimingCard, setClaimingCard] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const open = state !== null;
  useDialogFocus(open, panelRef, triggerRef);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('mode') !== 'signIn' || !url.searchParams.get('oobCode')) return;
    linkRef.current = url.toString();
    hadIntentRef.current = url.searchParams.has(STARTER_PARAM) || url.searchParams.has(HEART_PARAM);
    /* Die Adresse hat eine Mailadresse und einen einlösbaren Code in der
       Adresszeile — beides raus, bevor jemand den Link teilt oder ein
       Seitenaufruf ihn mitzählt. `starter` bleibt: den löst die Pack-Vergabe
       nach der Anmeldung ein (pendingStarterCard). */
    const fromLink = url.searchParams.get(EMAIL_LINK_EMAIL_PARAM) ?? '';
    setClaimingCard(url.searchParams.has(STARTER_PARAM));
    for (const name of EMAIL_LINK_PARAMS) url.searchParams.delete(name);
    window.history.replaceState(
      window.history.state,
      '',
      `${url.pathname}${url.search}${url.hash}`
    );

    let alive = true;
    Promise.all([import('@/lib/firebase/config'), import('firebase/auth')]).then(
      ([{ auth }, { isSignInWithEmailLink }]) => {
        if (!alive) return;
        if (!isSignInWithEmailLink(auth, linkRef.current)) return setState({ kind: 'expired' });
        /* Der Link kennt seine Adresse selbst — sie hat Vorrang vor der, die
           zuletzt gemerkt wurde: wer zwei Links an verschiedene Adressen
           anfordert und den älteren öffnet, meldete sich sonst als die
           falsche Person an. */
        let remembered = '';
        try {
          remembered = localStorage.getItem('emailForSignIn') ?? '';
        } catch {}
        const email = fromLink || remembered;
        setState(
          email
            ? { kind: 'confirm', email, busy: false, error: false }
            : { kind: 'needs-email', email: '', busy: false, error: null }
        );
      },
      () => alive && setState({ kind: 'expired' })
    );
    return () => {
      alive = false;
    };
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

  const close = () => setState(null);

  const signIn = async (email: string) => {
    const [{ auth }, { signInWithEmailLink, getAdditionalUserInfo }] = await Promise.all([
      import('@/lib/firebase/config'),
      import('firebase/auth'),
    ]);
    const credential = await signInWithEmailLink(auth, email, linkRef.current);
    const { user } = credential;
    try {
      localStorage.removeItem('emailForSignIn');
    } catch {}
    trackEvent(user.displayName ? 'login' : 'sign_up', { method: 'email_link' });
    setState(null);
    const isNewUser = getAdditionalUserInfo(credential)?.isNewUser ?? false;
    if (shouldGoToProfile({ isNewUser, hasIntent: hadIntentRef.current, pathname })) {
      router.push(PROFILE_PATH);
    }
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
        setState(
          spent(code) || code === 'auth/invalid-email'
            ? { kind: 'expired' }
            : { ...state, busy: false, error: true }
        );
      }
    };
    content = (
      <div className={styles.content}>
        <div className={styles.art}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.artImg} src="/pics/booster/booster_free.webp" alt={t.packAlt} />
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
      <button type="button" className={styles.action} disabled={state.busy} onClick={confirm}>
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
          <img className={styles.artImg} src="/pics/booster/booster_free.webp" alt={t.packAlt} />
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
        className={styles.action}
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
          <img className={styles.artImg} src="/pics/card-back.webp?v=7" alt="" />
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
      <button type="button" className={styles.action} onClick={close}>
        {t.close}
      </button>
    );
  }

  return createPortal(
    <div className={styles.layer}>
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
