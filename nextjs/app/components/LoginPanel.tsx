'use client';

import { useState, useEffect, useCallback, useId, useRef } from 'react';
import { useLocale } from 'next-intl';
import { useTranslation } from '@/lib/i18n';
import { useAuth, useMagicLink } from '@/lib/auth';
import { routing } from '@/i18n/routing';
import { trackEvent } from '@/lib/analytics';
import { GoogleMark } from './GoogleMark';
import AuthScreen from './AuthScreen';
import { describeGoogleSignInError } from '@/lib/auth/googleSignInError';
import styles from './LoginPanel.module.css';

const SIGNIN_BOOSTER_PACKS = [
  '/pics/booster/booster_pizza.webp',
  '/pics/booster/booster_lunch.webp',
  '/pics/booster/booster_sweets.webp',
];

interface LoginPanelProps {
  onBack: () => void;
  mode?: 'starter' | 'signin';
}

// One shape only. The standalone /login route that rendered a second, older
// full-page variant of this panel is gone — nothing linked to it, and it had
// drifted a redesign behind the modal everyone actually sees.
export default function LoginPanel({ onBack, mode = 'starter' }: LoginPanelProps) {
  const { t } = useTranslation();
  const { user, loading, signInWithGoogle, prepareGoogleSignIn } = useAuth();
  const locale = useLocale();
  const {
    sendLink,
    state: magicState,
    errorMessage: magicError,
    reset: magicReset,
  } = useMagicLink();

  const [email, setEmail] = useState('');
  /* Drei Phasen statt eines Schalters: 'leaving' haelt das Panel so lange,
     wie es zum Zurueckfahren braucht. Vorher sprang es auf einen Schlag weg,
     und ein selbst zugeklicktes Google-Fenster sah aus wie ein Aussetzer. */
  const [googlePhase, setGooglePhase] = useState<'idle' | 'busy' | 'leaving'>('idle');
  const [googleNote, setGoogleNote] = useState<'cancelled' | 'blocked' | 'failed' | null>(null);
  const authMethod = useRef<'google' | null>(null);
  const emailInputId = useId();

  useEffect(() => {
    trackEvent('login_view', { surface: 'modal', context: 'general' });
    /* Solange hier noch gelesen wird, lädt Firebase seinen Popup-Helfer.
       Ohne diesen Vorlauf war der erste Klick auf Google immer verloren:
       `signInWithPopup` holt den Helfer erst nach dem Klick, und danach
       blockt der Browser das Fenster (siehe googlePopupWarmup.ts). */
    prepareGoogleSignIn();
  }, [prepareGoogleSignIn]);

  useEffect(() => {
    if (!user || authMethod.current !== 'google') return;
    authMethod.current = null;
    const created = new Date(user.metadata.creationTime ?? 0).getTime();
    const signedIn = new Date(user.metadata.lastSignInTime ?? 0).getTime();
    const event = Math.abs(signedIn - created) < 10_000 ? 'sign_up' : 'login';
    trackEvent(event, { method: 'google' });
  }, [user]);

  const handleGoogle = useCallback(async () => {
    authMethod.current = 'google';
    trackEvent('login_start', { method: 'google' });
    setGooglePhase('busy');
    setGoogleNote(null);
    try {
      await signInWithGoogle();
    } catch (error) {
      authMethod.current = null;
      setGooglePhase('leaving');
      /* Auch der Abbruch bekommt jetzt eine Zeile — nur eine ruhige. Firebase
         meldet ein zugeklicktes Fenster und eine gescheiterte Uebergabe mit
         demselben Code (siehe googleSignInError.ts); wer danach stumm wieder
         vor dem Knopf stand, wusste nicht, ob er selbst schuld war. */
      const { benign, blocked } = describeGoogleSignInError(error);
      setGoogleNote(benign ? 'cancelled' : blocked ? 'blocked' : 'failed');
    }
  }, [signInWithGoogle]);

  // Das Panel raeumt sich nach seiner Ausfahrt selbst ab.
  useEffect(() => {
    if (googlePhase !== 'leaving') return;
    const timer = window.setTimeout(() => setGooglePhase('idle'), 260);
    return () => window.clearTimeout(timer);
  }, [googlePhase]);

  const noteKey =
    googleNote === 'blocked'
      ? 'auth.errGooglePopupBlocked'
      : googleNote === 'failed'
        ? 'auth.errGooglePopup'
        : googleNote === 'cancelled'
          ? 'auth.googleCancelled'
          : null;

  const agbHref = locale === routing.defaultLocale ? '/agb' : `/${locale}/agb`;
  const dsHref = locale === routing.defaultLocale ? '/datenschutz' : `/${locale}/datenschutz`;
  const sent = magicState === 'sent';
  const signinMode = mode === 'signin';
  const headlineKey = signinMode ? 'modals.login.signinHeroHeadline' : 'modals.login.heroHeadline';
  const taglineKey = signinMode ? 'modals.login.signinModalTagline' : 'modals.login.modalTagline';
  const sendLinkKey = signinMode ? 'modals.login.signinSendLinkBtn' : 'modals.login.sendLinkBtn';
  const googleKey = signinMode ? 'modals.login.signinGoogleBtn' : 'modals.login.googleBtn';
  const legalLeadKey = signinMode ? 'modals.login.signinLegalLead' : 'modals.login.legalLead';
  const frameClassName = [styles.frame, styles.frameModal, sent ? styles.frameSent : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={frameClassName}>
      <button
        type="button"
        className={styles.close}
        onClick={onBack}
        aria-label={t('modals.login.backBtn')}
      >
        <span aria-hidden="true">×</span>
      </button>

      {/* SEO/SR headline — the single visible h1 is the Chewy one below. */}
      <span className={styles.headlineSr}>{t(headlineKey)}</span>

      {sent ? (
        <>
          <div className={`${styles.modalSimple} ${styles.modalSimpleSignin} ${styles.sentSimple}`}>
            <section className={styles.modalSigninBoosters} aria-hidden="true">
              <div className={styles.modalSigninBoosterFan}>
                {SIGNIN_BOOSTER_PACKS.map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={src}
                    className={styles.modalSigninBoosterCard}
                    src={src}
                    alt=""
                    loading="eager"
                    decoding="sync"
                  />
                ))}
              </div>
            </section>

            <section className={`${styles.modalLogin} ${styles.sentPanel}`} aria-live="polite">
              <div className={styles.sentMark} aria-hidden="true">
                <svg viewBox="0 0 100 78" width={58} height={46} fill="none">
                  <path
                    d="M92 6 L8 36 L40 44 L58 72 L92 6 Z"
                    fill="currentColor"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  <path
                    d="M92 6 L40 44"
                    stroke="var(--login-paper)"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                  />
                  <path
                    d="M40 44 L46 60"
                    stroke="var(--login-paper)"
                    strokeWidth="2.3"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className={styles.modalLoginHead}>
                <h2 className={styles.modalFormTitle}>{t('modals.login.sentH1')}</h2>
              </div>

              {email && (
                <div className={styles.toBlock}>
                  <span className={styles.toLabel}>{t('modals.login.sentToLabel')}</span>
                  <span className={styles.toValue}>{email}</span>
                </div>
              )}

              <p className={styles.sub}>{t('modals.login.sentSub')}</p>

              <div className={styles.spam}>
                <div className={styles.spamIcon}>!</div>
                <div className={styles.spamText}>{t('modals.login.spamHint')}</div>
              </div>

              <div className={styles.actions}>
                <button type="button" className={styles.ctaPrimary} onClick={() => sendLink(email)}>
                  <span>{t('modals.login.resendBtn')}</span>
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
                <button
                  type="button"
                  className={styles.textlink}
                  onClick={() => {
                    magicReset();
                    setEmail('');
                  }}
                >
                  {t('modals.login.otherEmail')}
                </button>
              </div>
            </section>
          </div>
        </>
      ) : (
        <div className={`${styles.modalSimple} ${signinMode ? styles.modalSimpleSignin : ''}`}>
          {!signinMode && (
            <section className={styles.modalBenefits} aria-label={t('modals.login.heroSub')}>
              <div className={styles.modalBenefitHead}>
                <h2 className={styles.modalBenefitIntro}>{t('modals.login.heroH1')}</h2>
                <div className={styles.modalPackArt} aria-hidden="true">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/pics/booster/booster_free.webp"
                    alt=""
                    loading="eager"
                    decoding="sync"
                    fetchPriority="high"
                  />
                </div>
              </div>
              <p className={styles.modalBenefitLead}>{t('modals.login.modalBenefitLead')}</p>
            </section>
          )}
          {signinMode && (
            <section className={styles.modalSigninBoosters}>
              <p className={styles.modalSigninBoosterHeadline}>
                {t('modals.login.signinBoosterHeadline')}
              </p>
              <div className={styles.modalSigninBoosterFan} aria-hidden="true">
                {SIGNIN_BOOSTER_PACKS.map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={src}
                    className={styles.modalSigninBoosterCard}
                    src={src}
                    alt=""
                    loading="eager"
                    decoding="sync"
                  />
                ))}
              </div>
              <p className={styles.modalSigninBoosterLead}>{t('modals.login.signinBoosterLead')}</p>
            </section>
          )}

          <section className={styles.modalLogin} aria-label={t(headlineKey)}>
            <div className={styles.modalLoginHead}>
              <h2 className={styles.modalFormTitle}>{t(taglineKey)}</h2>
            </div>

            <form
              className={styles.modalForm}
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                sendLink(email);
              }}
            >
              <label className={styles.fieldLabelSr} htmlFor={emailInputId}>
                {t('modals.login.emailLabel')}
              </label>
              <input
                id={emailInputId}
                className={styles.input}
                type="email"
                placeholder={t('modals.login.emailPlaceholder')}
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p
                className={[styles.error, googleNote === 'cancelled' ? styles.errorQuiet : '']
                  .filter(Boolean)
                  .join(' ')}
                role={
                  magicState === 'error' || (googleNote && googleNote !== 'cancelled')
                    ? 'alert'
                    : undefined
                }
                aria-live="polite"
                aria-hidden={magicState !== 'error' && !googleNote}
              >
                {/* Die Schluessel tragen ihr `auth.`-Praefix: ohne findet
                    next-intl den Text nicht und schreibt dem Leser den
                    Schluessel selbst hin (Nutzer, 28.08.2026). */}
                {magicState === 'error' ? magicError : noteKey ? t(noteKey) : ''}
              </p>
              <button
                type="submit"
                className={styles.ctaPrimary}
                disabled={magicState === 'sending'}
              >
                <span>{t(sendLinkKey)}</span>
                <svg
                  viewBox="0 0 24 24"
                  width={18}
                  height={18}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </form>

            <div className={styles.or}>
              <span>{t('modals.login.dividerOr')}</span>
            </div>

            <button
              type="button"
              className={styles.ctaGoogle}
              onClick={handleGoogle}
              disabled={googlePhase === 'busy'}
            >
              <GoogleMark />
              <span>{t(googleKey)}</span>
            </button>

            <p className={styles.legal}>
              {t(legalLeadKey)}{' '}
              <a className={styles.legalLink} href={agbHref}>
                {t('modals.login.termsLink')}
              </a>{' '}
              {t('modals.login.legalAnd')}{' '}
              <a className={styles.legalLink} href={dsHref}>
                {t('modals.login.privacyLink')}
              </a>
              .
            </p>
          </section>
        </div>
      )}

      {/* Der Wartescreen liegt als Portal ueber der Seite, nicht im Modal:
          Abmelden hat kein Modal, und beide Richtungen sollen gleich
          aussehen (siehe AuthScreen). */}
      {(googlePhase !== 'idle' || (!loading && user)) && (
        <AuthScreen mode="in" leaving={googlePhase === 'leaving'} />
      )}
    </div>
  );
}
