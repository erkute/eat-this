'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useTranslation } from '@/lib/i18n';
import { useAuth, useMagicLink } from '@/lib/auth';
import { postLoginRedirect } from '@/lib/auth/postLoginRedirect';
import { routing } from '@/i18n/routing';

export default function LoginPage() {
  const { t } = useTranslation();
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();
  const locale = useLocale();
  const { sendLink, state: magicState, errorMessage: magicError, reset: magicReset } = useMagicLink();

  const [email, setEmail]       = useState('');
  const [panel, setPanel]       = useState<'landing' | 'form'>('landing');
  const [formMode, setFormMode] = useState<'login' | 'register'>('login');
  const [googleBusy, setGoogleBusy] = useState(false);

  // Already signed in? Route them straight away.
  useEffect(() => {
    if (loading || !user) return;
    void postLoginRedirect(user.uid, router, locale);
  }, [user, loading, router, locale]);

  const showFormPanel = useCallback((mode: 'login' | 'register') => {
    setFormMode(mode);
    magicReset();
    setEmail('');
    setPanel('form');
  }, [magicReset]);

  const goBack = useCallback(() => {
    magicReset();
    setEmail('');
    setPanel('landing');
  }, [magicReset]);

  const handleGoogle = useCallback(async () => {
    setGoogleBusy(true);
    try {
      await signInWithGoogle();
      // postLoginRedirect runs via the useEffect above once user state updates.
    } catch {
      setGoogleBusy(false);
    }
  }, [signInWithGoogle]);

  const agbHref = locale === routing.defaultLocale ? '/agb' : `/${locale}/agb`;
  const dsHref  = locale === routing.defaultLocale ? '/datenschutz' : `/${locale}/datenschutz`;

  return (
    <div className="wm-overlay active" aria-modal={false} role="region" aria-label="Login">
      <div className="wm-dialog">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/pics/login/Black screen.webp" alt="" className="wm-hero-img" decoding="async" />

        <div className="wm-hero-logo-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pics/login/eat 1.webp" alt="Eat This" className="wm-hero-logo" />
        </div>

        {panel === 'landing' && (
          <div className="wm-landing">
            <p className="wm-hero-headline">Hundreds of Must Eats<br />to discover</p>
            <button className="wm-cta-primary" onClick={() => showFormPanel('login')}>
              {t('modals.login.landingLogin')}
            </button>
            <button className="wm-cta-google" onClick={handleGoogle} disabled={googleBusy}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/pics/login/Google.webp" alt="" className="wm-google-icon" width={18} height={18} />
              <span>{t('modals.login.googleBtn')}</span>
            </button>
            <button className="wm-cta-text" onClick={() => showFormPanel('register')}>
              {t('modals.login.toggleToRegister')}
            </button>
          </div>
        )}

        {panel === 'form' && (
          <div className="wm-form-panel">
            <button className="wm-back" type="button" aria-label={t('modals.login.backBtn')} onClick={goBack}>
              <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="15 18 9 12 15 6" />
              </svg>
              <span>{t('modals.login.backBtn')}</span>
            </button>

            <div className="wm-form-wrap">
              <h2 className="wm-form-title">
                {formMode === 'login' ? t('modals.login.titleLogin') : t('modals.login.titleRegister')}
              </h2>
              <p className="wm-booster-hint">
                {formMode === 'login' ? t('modals.login.subtitleLogin') : t('modals.login.subtitleRegister')}
              </p>

              {magicState === 'sent' ? (
                <div>
                  <p className="wm-booster-hint">{t('modals.login.linkSentHint')}</p>
                  <button
                    type="button"
                    className="wm-cta-text"
                    onClick={() => { magicReset(); setEmail(''); }}
                  >
                    {t('modals.login.resendBtn')}
                  </button>
                </div>
              ) : (
                <form
                  className="wm-email-form"
                  noValidate
                  onSubmit={(e) => { e.preventDefault(); sendLink(email); }}
                >
                  <div className="wm-field">
                    <input
                      type="email"
                      placeholder={t('modals.login.emailPlaceholder')}
                      required
                      autoComplete="email"
                      aria-label="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  {magicState === 'error' && (
                    <p className="wm-msg wm-error">{magicError}</p>
                  )}
                  <button type="submit" className="wm-submit" disabled={magicState === 'sending'}>
                    <span>{t('modals.login.sendLinkBtn')}</span>
                    <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                    </svg>
                  </button>
                </form>
              )}

              <p className="wm-terms">
                <span>{t('modals.login.termsText')}</span>{' '}
                <a className="wm-terms-link" href={agbHref}>{t('modals.login.termsLink')}</a>{' '}
                <span>{t('modals.login.termsAnd')}</span>{' '}
                <a className="wm-terms-link" href={dsHref}>{t('modals.login.privacyLink')}</a>
                <span>.</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
