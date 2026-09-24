'use client';

import { useCallback, useEffect, useId, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { useGoogleSignIn, useMagicLink } from '@/lib/auth';
import type { LoginReason } from '@/lib/auth';
import { isEmailish } from '@/lib/auth/emailShape';
import { buildLoginContinueUrl, type LoginIntent } from '@/lib/auth/loginContinueUrl';
import { spotPhotoSrc, spotPhotoSrcSet } from '@/lib/map/spotPhoto';
import { routing } from '@/i18n/routing';
import { GoogleMark } from './GoogleMark';
import { HeartIcon } from './map/icons';
import AuthScreen from './AuthScreen';
import styles from './LoginBoard.module.css';

const PACK_ART = '/pics/booster/booster_free.webp';
/* Ueber den Optimierer, nicht als rohes `img`: die Tafel steht auf jeder
   Startseite, und das Original wiegt 146 KB fuer eine 160–400 px hohe Tuete. */
const PACK_WIDTH = 1008;
const PACK_HEIGHT = 1560;
const PACK_SIZES = '(max-width: 820px) 160px, 260px';
const CARD_BACK = '/pics/card-back.webp?v=7';

interface LoginBoardProps {
  /** Die Szene links (LoginSceneArt) — reine Dekoration. */
  art: ReactNode;
  kicker?: string | null;
  title: string;
  lead?: string | null;
  /** Was der Magic-Link durch den Posteingang tragen soll (Herz, Karte). */
  intent?: LoginIntent | null;
  /**
   * Wann Firebases Popup-Helfer fuer Google vorlaedt (googlePopupWarmup.ts):
   * 'mount' im Modal — wer es oeffnet, will sich anmelden, und ohne Vorlauf
   * frisst der Popup-Blocker den ersten Klick. 'intent' auf den Tafeln der
   * Seiten: der Cookie-Hinweis verspricht, Google Sign-In lade „nur wenn du
   * es nutzt", also erst, wenn die Hand zum Knopf geht.
   */
  googleWarmup: 'mount' | 'intent';
  /** Nach der Haltezeit des Wartescreens eines Google-Logins. */
  onGoogleSettled?: () => void;
  /** Wartescreen stehen lassen, auch wenn Google ihn nicht ausgeloest hat. */
  holdScreen?: boolean;
}

/**
 * Die Anmeldung — EIN Aufbau fuer alle Stellen, an denen sie steht: das
 * Modal (LoginPanel), die Starter-Pack-Tafel der Startseite und die
 * Beitritts-Tafel des geteilten Decks. Vorher waren das drei Formulare mit
 * eigenen Texten, eigener Knopfform und eigenem Verhalten nach dem Absenden.
 *
 * Links die Szene, rechts Ueberschrift und Formular. Die Szene bleibt stehen,
 * wenn die Mail raus ist: das, worauf man wartet, verschwindet nicht.
 *
 * „Anmelden" steht nur auf dem Knopf — nie als Ueberschrift. Der Titel sagt,
 * was man bekommt; der Knopf, was man tut.
 */
export default function LoginBoard({
  art,
  kicker,
  title,
  lead,
  intent = null,
  googleWarmup,
  onGoogleSettled,
  holdScreen = false,
}: LoginBoardProps) {
  const t = useTranslations('modals.login');
  const tRoot = useTranslations();
  const locale = useLocale();
  const { sendLink, state, errorMessage, reset } = useMagicLink();
  /* Phasen, Abbruch-Zeile und Ereignisse des Google-Knopfs: lib/auth/useGoogleSignIn.ts. */
  const google = useGoogleSignIn({ onSettled: onGoogleSettled });
  const { prepare: prepareGoogle } = google;
  useEffect(() => {
    if (googleWarmup === 'mount') prepareGoogle();
  }, [googleWarmup, prepareGoogle]);
  const warmOnIntent = googleWarmup === 'intent' ? prepareGoogle : undefined;

  /* Der Link fuehrt dorthin zurueck, wo die Anmeldung angefangen hat — nicht
     auf die Startseite. Wird erst beim Absenden gelesen, damit `window` nicht
     beim Rendern gebraucht wird. */
  const continueUrl = useCallback(() => buildLoginContinueUrl(window.location, intent), [intent]);

  const emailId = useId();
  const feedbackId = `${emailId}-feedback`;
  const [email, setEmail] = useState('');
  const [invalid, setInvalid] = useState('');

  const sent = state === 'sent';
  const googleNote = google.noteKey ? tRoot(google.noteKey) : '';
  const feedback = invalid || (state === 'error' ? errorMessage : '') || googleNote;
  // Ein selbst zugeklicktes Google-Fenster ist eine Entscheidung, kein Fehler.
  const quiet = feedback === googleNote && google.note === 'cancelled';

  const submit = () => {
    if (state === 'sending') return;
    const trimmed = email.trim();
    const shape = isEmailish(trimmed);
    if (shape !== 'ok') {
      setInvalid(t(shape === 'empty' ? 'emptyEmail' : 'invalidEmail'));
      return;
    }
    setInvalid('');
    void sendLink(trimmed, continueUrl());
  };

  const agbHref = locale === routing.defaultLocale ? '/agb' : `/${locale}/agb`;
  const dsHref = locale === routing.defaultLocale ? '/datenschutz' : `/${locale}/datenschutz`;

  return (
    <div className={styles.board} data-sent={sent ? '' : undefined}>
      {art}

      <div className={styles.side}>
        {sent ? (
          <section className={styles.sent} aria-live="polite">
            <h2 className={styles.title}>{t('sentH1')}</h2>

            <div className={styles.toBlock}>
              <span className={styles.toLabel}>{t('sentToLabel')}</span>
              <span className={styles.toValue}>{email.trim()}</span>
            </div>

            <p className={styles.sub}>{t('sentSub')}</p>
            <p className={styles.spam}>{t('spamHint')}</p>

            <div className={styles.actions}>
              <button type="button" className={styles.ctaPrimary} onClick={submit}>
                <span>{t('resendBtn')}</span>
              </button>
              <button
                type="button"
                className={styles.textlink}
                onClick={() => {
                  reset();
                  setEmail('');
                }}
              >
                {t('otherEmail')}
              </button>
            </div>
          </section>
        ) : (
          <>
            <div className={styles.copy}>
              {kicker && <p className={styles.kicker}>{kicker}</p>}
              <h2 className={styles.title}>{title}</h2>
              {lead && <p className={styles.lead}>{lead}</p>}
            </div>

            <form
              className={styles.form}
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
            >
              <label className={styles.srOnly} htmlFor={emailId}>
                {t('emailLabel')}
              </label>
              <input
                id={emailId}
                className={styles.input}
                type="email"
                inputMode="email"
                placeholder={t('emailPlaceholder')}
                required
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setInvalid('');
                  if (state === 'error') reset();
                }}
                aria-invalid={Boolean(feedback) && !quiet}
                aria-describedby={feedback ? feedbackId : undefined}
              />
              {/* Die Zeile ist immer da und reserviert ihre Hoehe: eine
                  Meldung schiebt den Knopf nicht nach unten. */}
              <p
                id={feedbackId}
                className={[styles.feedback, quiet ? styles.feedbackQuiet : '']
                  .filter(Boolean)
                  .join(' ')}
                role={feedback ? (quiet ? 'status' : 'alert') : undefined}
                aria-live="polite"
              >
                {feedback}
              </p>
              <button type="submit" className={styles.ctaPrimary} disabled={state === 'sending'}>
                <span>{t('sendLinkBtn')}</span>
              </button>
            </form>

            <p className={styles.or} aria-hidden="true">
              {t('dividerOr')}
            </p>

            <button
              type="button"
              className={styles.ctaGoogle}
              onClick={google.start}
              onPointerEnter={warmOnIntent}
              onPointerDown={warmOnIntent}
              onFocus={warmOnIntent}
              disabled={google.phase === 'busy'}
            >
              <GoogleMark />
              <span>{t('googleBtn')}</span>
            </button>

            <p className={styles.legal}>
              {t('legalLead')}{' '}
              <a className={styles.legalLink} href={agbHref}>
                {t('termsLink')}
              </a>{' '}
              {t('legalAnd')}{' '}
              <a className={styles.legalLink} href={dsHref}>
                {t('privacyLink')}
              </a>
              .
            </p>
          </>
        )}
      </div>

      {/* Der Wartescreen liegt als Portal ueber der Seite (siehe AuthScreen) —
          er bleibt also auch stehen, wenn die Tafel selbst verborgen wird. */}
      {(google.phase !== 'idle' || holdScreen) && (
        <AuthScreen mode="in" leaving={google.phase === 'leaving'} />
      )}
    </div>
  );
}

/**
 * Das Bild zur Anmeldung: das Starter Pack — und davor, wonach der Gast
 * gegriffen hat (siehe LoginReason). Reine Dekoration; was es zeigt, sagt der
 * Text daneben.
 */
export function LoginSceneArt({ reason }: { reason: LoginReason | null }) {
  /* eslint-disable @next/next/no-img-element */
  if (reason?.kind === 'heart') {
    /* Das Pack hinten, davor der Spot, den man sich merken wollte. Ohne Foto
       haengt das Herz am Pack. */
    return (
      <div className={`${styles.art} ${styles.artDuo}`} aria-hidden="true">
        <Image
          className={styles.duoPack}
          src={PACK_ART}
          alt=""
          width={PACK_WIDTH}
          height={PACK_HEIGHT}
          sizes={PACK_SIZES}
        />
        {reason.photo ? (
          <div className={styles.spotCard}>
            <img
              src={spotPhotoSrc(reason.photo)}
              srcSet={spotPhotoSrcSet(reason.photo)}
              sizes="220px"
              alt=""
              decoding="async"
            />
            <HeartBadge />
          </div>
        ) : (
          <HeartBadge />
        )}
      </div>
    );
  }
  if (reason?.kind === 'card') {
    /* Die angetippte Karte vor ihrem Pack: sie liegt drin, und sie liegt vorn. */
    return (
      <div className={`${styles.art} ${styles.artDuo}`} aria-hidden="true">
        <Image
          className={styles.duoPack}
          src={PACK_ART}
          alt=""
          width={PACK_WIDTH}
          height={PACK_HEIGHT}
          sizes={PACK_SIZES}
        />
        <img className={styles.cardBack} src={CARD_BACK} alt="" decoding="sync" />
      </div>
    );
  }
  return (
    <div className={`${styles.art} ${styles.artPack}`} aria-hidden="true">
      <Image src={PACK_ART} alt="" width={PACK_WIDTH} height={PACK_HEIGHT} sizes={PACK_SIZES} />
    </div>
  );
  /* eslint-enable @next/next/no-img-element */
}

/* Dasselbe Herz wie am Spot selbst (HeartButton): gefuellt, rot, ohne Grund. */
function HeartBadge() {
  return (
    <span className={styles.heartBadge}>
      <HeartIcon filled />
    </span>
  );
}
