'use client';

import { useState, useEffect, useCallback, useId, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useTranslation } from '@/lib/i18n';
import { useAuth, useMagicLink } from '@/lib/auth';
import { postLoginRedirect } from '@/lib/auth/postLoginRedirect';
import { routing } from '@/i18n/routing';
import { trackEvent } from '@/lib/analytics';
import styles from '@/app/[locale]/login/login.module.css';

interface LoginPanelProps {
  onBack: () => void;
  modal?: boolean;
  /** Guest revealed a must-eat on site (50 m) — swap the sub line to explain
   *  why login is needed: the card lands in the deck only with an account. */
  mustEatGate?: boolean;
}

export default function LoginPanel({ onBack, modal = false, mustEatGate = false }: LoginPanelProps) {
  const { t } = useTranslation();
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const locale = useLocale();
  const { sendLink, state: magicState, errorMessage: magicError, reset: magicReset } = useMagicLink();

  const [email, setEmail]           = useState('');
  const [googleBusy, setGoogleBusy] = useState(false);
  const authMethod = useRef<'google' | null>(null);
  const emailInputId = useId();

  useEffect(() => {
    trackEvent('login_view', {
      surface: modal ? 'modal' : 'page',
      context: mustEatGate ? 'must_eat_gate' : 'general',
    });
  }, [modal, mustEatGate]);

  useEffect(() => {
    if (!user || authMethod.current !== 'google') return;
    authMethod.current = null;
    const created = new Date(user.metadata.creationTime ?? 0).getTime();
    const signedIn = new Date(user.metadata.lastSignInTime ?? 0).getTime();
    const event = Math.abs(signedIn - created) < 10_000 ? 'sign_up' : 'login';
    trackEvent(event, { method: 'google' });
  }, [user]);

  // Redirect to the home hub after sign-in on the standalone /login page. In the
  // modal, BridgeAuth owns this redirect (it controls the modal lifecycle), so
  // skip it here to avoid a double-navigation.
  useEffect(() => {
    if (loading || !user || modal) return;
    void postLoginRedirect(user.uid, router, locale);
  }, [user, loading, modal, router, locale]);

  const handleGoogle = useCallback(async () => {
    authMethod.current = 'google';
    trackEvent('login_start', { method: 'google' });
    setGoogleBusy(true);
    try {
      await signInWithGoogle();
    } catch {
      authMethod.current = null;
      setGoogleBusy(false);
    }
  }, [signInWithGoogle]);

  const agbHref = locale === routing.defaultLocale ? '/agb' : `/${locale}/agb`;
  const dsHref  = locale === routing.defaultLocale ? '/datenschutz' : `/${locale}/datenschutz`;
  const sent = magicState === 'sent';
  const sloganLines = t('modals.login.kicker').split('|');
  const frameClassName = [
    styles.frame,
    modal ? styles.frameModal : '',
    sent ? styles.frameSent : '',
  ].filter(Boolean).join(' ');

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
      <span className={styles.headlineSr}>{t('modals.login.heroHeadline')}</span>

      {sent ? (
        <>
          <div className={styles.plane} aria-hidden="true">
            <svg viewBox="0 0 100 78" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M92 6 L8 36 L40 44 L58 72 L92 6 Z" fill="#ffd84a" stroke="#0a0a0a" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
              <path d="M92 6 L40 44" stroke="#0a0a0a" strokeWidth="2" strokeLinecap="round" />
              <path d="M40 44 L46 60" stroke="#0a0a0a" strokeWidth="2" strokeLinecap="round" />
              <path d="M4 50 L18 48" stroke="#0a0a0a" strokeWidth="2.4" strokeLinecap="round" opacity=".55" />
              <path d="M2 62 L14 60" stroke="#0a0a0a" strokeWidth="2.4" strokeLinecap="round" opacity=".4" />
              <path d="M6 72 L16 72" stroke="#0a0a0a" strokeWidth="2.4" strokeLinecap="round" opacity=".3" />
            </svg>
          </div>
          <div className={styles.kicker}>{t('modals.login.sentKicker')}</div>
          <h1 className={styles.h1}>{t('modals.login.sentH1')}</h1>

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
            <button
              type="button"
              className={styles.ctaPrimary}
              onClick={() => sendLink(email)}
            >
              <span>{t('modals.login.resendBtn')}</span>
              <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2.6}>
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </button>
            <button
              type="button"
              className={styles.textlink}
              onClick={() => { magicReset(); setEmail(''); }}
            >
              {t('modals.login.otherEmail')}
            </button>
          </div>
        </>
      ) : modal ? (
        <div className={styles.modalSimple}>
          <section className={styles.modalPack} aria-labelledby="login-panel-title">
            <p className={styles.modalBrand}>EAT THIS</p>
            <div className={styles.modalPackHero} aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/pics/booster/booster_free.webp" alt="" loading="eager" decoding="sync" fetchPriority="high" />
            </div>
            <h1 id="login-panel-title" className={styles.modalTitle}>{t('modals.login.modalTagline')}</h1>
            <p className={styles.modalBadge}>{t('modals.login.modalBadge')}</p>
          </section>

          <section className={styles.modalLogin} aria-label={t('modals.login.heroHeadline')}>
            <div className={styles.modalLoginHead}>
              <p className={styles.modalEyebrow}>{t('modals.login.heroH1')}</p>
              <h2 className={styles.modalFormTitle}>{t('modals.login.heroHeadline')}</h2>
              <p className={styles.modalPitch}>{t('modals.login.heroSub')}</p>
            </div>
            <form
              className={styles.modalForm}
              noValidate
              onSubmit={(e) => { e.preventDefault(); sendLink(email); }}
            >
              <label className={styles.fieldLabel} htmlFor={emailInputId}>{t('modals.login.emailLabel')}</label>
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
              {magicState === 'error' && <p className={styles.error}>{magicError}</p>}
              <button
                type="submit"
                className={styles.ctaPrimary}
                disabled={magicState === 'sending'}
              >
                <span>{t('modals.login.sendLinkBtn')}</span>
                <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
              <p className={styles.formHint}>{t('modals.login.magicLinkHint')}</p>
            </form>

            <div className={styles.or}><span>{t('modals.login.dividerOr')}</span></div>

            <button
              type="button"
              className={styles.ctaGoogle}
              onClick={handleGoogle}
              disabled={googleBusy}
            >
              <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true">
                <path fill="#4285F4" d="M22.5 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.75 3.28-8.09Z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.24 1.05-3.72 1.05-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
                <path fill="#FBBC05" d="M5.85 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.35-2.1V7.06H2.18a11 11 0 0 0 0 9.88l3.67-2.84Z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.64l3.16-3.16C17.45 2.1 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.67 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
              </svg>
              <span>{t('modals.login.googleBtn')}</span>
            </button>

            <p className={styles.legal}>
              {t('modals.login.legalLead')}{' '}
              <a className={styles.legalLink} href={agbHref}>{t('modals.login.termsLink')}</a>{' '}
              {t('modals.login.legalAnd')}{' '}
              <a className={styles.legalLink} href={dsHref}>{t('modals.login.privacyLink')}</a>.
            </p>
          </section>
        </div>
      ) : (
        <div className={styles.loginGrid}>
          <section className={styles.coverPanel} aria-labelledby="login-panel-title">
            <div className={styles.menuTop} aria-hidden="true">
              <span>EAT THIS</span>
              <span>{t('modals.login.menuTitle')}</span>
            </div>
            <div className={`${styles.kicker} ${styles.slogan}`} aria-label={sloganLines.join(' ')}>
              {sloganLines.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </div>
            <h1 id="login-panel-title" className={styles.h1}>{t('modals.login.heroH1')}</h1>
            <div className={styles.packHero} aria-hidden="true">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/pics/booster/booster_free.webp" alt="" loading="eager" decoding="sync" fetchPriority="high" />
            </div>
          </section>

          <section className={styles.formPanel}>
            <ul className={styles.menuList} aria-hidden="true">
              <li>
                <span>{t('modals.login.menuSpotsLabel')}</span>
                <strong>{t('modals.login.menuSpotsText')}</strong>
              </li>
              <li>
                <span>{t('modals.login.menuMustEatsLabel')}</span>
                <strong>{t('modals.login.menuMustEatsText')}</strong>
              </li>
              <li>
                <span>{t('modals.login.menuProfileLabel')}</span>
                <strong>{t('modals.login.menuProfileText')}</strong>
              </li>
            </ul>
            <p className={styles.sub}>{t(mustEatGate ? 'modals.login.mustEatGateSub' : 'modals.login.heroSub')}</p>

            <form
              className={styles.form}
              noValidate
              onSubmit={(e) => { e.preventDefault(); sendLink(email); }}
            >
              <input
                className={styles.input}
                type="email"
                placeholder={t('modals.login.emailPlaceholder')}
                required
                autoComplete="email"
                aria-label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {magicState === 'error' && <p className={styles.error}>{magicError}</p>}
              <button
                type="submit"
                className={styles.ctaPrimary}
                disabled={magicState === 'sending'}
              >
                <span>{t('modals.login.sendLinkBtn')}</span>
                <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </form>

            <div className={styles.or}><span>{t('modals.login.dividerOr')}</span></div>

            <button
              type="button"
              className={styles.ctaGoogle}
              onClick={handleGoogle}
              disabled={googleBusy}
            >
              <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true">
                <path fill="#4285F4" d="M22.5 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.75 3.28-8.09Z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.24 1.05-3.72 1.05-2.86 0-5.29-1.93-6.15-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
                <path fill="#FBBC05" d="M5.85 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.35-2.1V7.06H2.18a11 11 0 0 0 0 9.88l3.67-2.84Z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.64l3.16-3.16C17.45 2.1 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.67 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
              </svg>
              <span>{t('modals.login.googleBtn')}</span>
            </button>

            <p className={styles.legal}>
              {t('modals.login.legalLead')}{' '}
              <a className={styles.legalLink} href={agbHref}>{t('modals.login.termsLink')}</a>{' '}
              {t('modals.login.legalAnd')}{' '}
              <a className={styles.legalLink} href={dsHref}>{t('modals.login.privacyLink')}</a>.
            </p>
            <p className={styles.menuWord} aria-hidden="true">{t('modals.login.menuTitle')}</p>
          </section>
        </div>
      )}

      {(googleBusy || (!loading && user)) && (
        <div className={styles.loadingOverlay} aria-hidden="true">
          <div className={styles.spinner} />
        </div>
      )}
    </div>
  );
}
