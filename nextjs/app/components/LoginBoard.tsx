'use client';

import { useCallback, useEffect, useId, useState, type ReactNode } from 'react';
import Image from '@/app/components/SiteImage';
import { useLocale, useTranslations } from 'next-intl';
import { useGoogleSignIn, useMagicLink } from '@/lib/auth';
import { isEmailish } from '@/lib/auth/emailShape';
import { buildLoginContinueUrl, type LoginIntent } from '@/lib/auth/loginContinueUrl';
import { routing } from '@/i18n/routing';
import { GoogleMark } from './GoogleMark';
import styles from './LoginBoard.module.css';

const PACK_ART = '/pics/home/starter-pack-front.webp?v=20261030';
/* Ueber den Optimierer, nicht als rohes `img`: die Tafel steht auf jeder
   Startseite, und das Original wiegt 146 KB fuer eine 160–400 px hohe Tuete. */
const PACK_WIDTH = 945;
const PACK_HEIGHT = 1491;
const PACK_SIZES = '(max-width: 820px) 160px, 260px';

interface LoginBoardProps {
  /** Die Szene links (LoginSceneArt) — reine Dekoration. */
  art: ReactNode;
  editorial?: boolean;
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
  editorial = false,
  kicker,
  title,
  lead,
  intent = null,
  googleWarmup,
}: LoginBoardProps) {
  const t = useTranslations('modals.login');
  const tRoot = useTranslations();
  const locale = useLocale();
  const { sendLink, state, errorMessage, reset } = useMagicLink();
  /* Phasen, Abbruch-Zeile und Ereignisse des Google-Knopfs: lib/auth/useGoogleSignIn.ts. */
  const google = useGoogleSignIn();
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
    <div className={`${styles.board} ${editorial ? styles.editorial : ''} `} data-sent={sent ? '' : undefined}>
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
              <button type="button" className={`et-btn ${styles.ctaPrimary}`} onClick={submit}>
                <span>{t('resendBtn')}</span>
              </button>
              <button
                type="button"
                className={`et-btn et-btn-alt ${styles.textlink}`}
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
              <button type="submit" className={`et-btn ${styles.ctaPrimary}`} disabled={state === 'sending'}>
                <span>{t('sendLinkBtn')}</span>
              </button>
            </form>

            <p className={styles.or} aria-hidden="true">
              {t('dividerOr')}
            </p>

            <button
              type="button"
              className={`et-btn et-btn-alt ${styles.ctaGoogle}`}
              onClick={google.start}
              onPointerEnter={warmOnIntent}
              onPointerDown={warmOnIntent}
              onFocus={warmOnIntent}
              disabled={google.phase === 'busy'}
              aria-busy={google.phase === 'busy'}
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
    </div>
  );
}

/** In jeder Anmeldevariante dasselbe Starter Pack, ohne weitere Motive. */
export function LoginSceneArt() {
  return (
    <div className={`${styles.art} ${styles.artPack}`} aria-hidden="true">
      <Image src={PACK_ART} alt="" width={PACK_WIDTH} height={PACK_HEIGHT} sizes={PACK_SIZES} />
    </div>
  );
}
