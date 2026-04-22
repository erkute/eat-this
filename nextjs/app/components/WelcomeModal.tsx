'use client';

import { useTranslation } from '@/lib/i18n';

// Shell for the welcome / auth modal. auth.min.js drives all state:
// form submission, Google auth, mode toggling (signup ↔ login), errors.
// This component owns the DOM contract; IDs are preserved for the binder.
export default function WelcomeModal() {
  const { t } = useTranslation();
  return (
    <div className="wm-overlay" id="welcomeModal" aria-modal={true} role="dialog" aria-label="Welcome to Eat This">
      <div className="wm-backdrop" id="wmBackdrop"></div>
      <div className="wm-dialog">

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/pics/login/Black screen.webp" alt="" className="wm-hero-img" decoding="async" />

        <button className="wm-close" id="wmClose" aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={14} height={14}>
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="wm-hero-logo-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pics/login/eat 1.webp" alt="Eat This" className="wm-hero-logo" />
        </div>

        <div className="wm-landing" id="wmLanding">
          <p className="wm-hero-headline">Hundreds of Must Eats<br />to discover</p>
          <button className="wm-cta-primary" id="wmSignupCta">{t('modals.login.landingSignup')}</button>
          <button className="wm-cta-google" id="wmGoogleBtn">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pics/login/Google.webp" alt="" className="wm-google-icon" width={18} height={18} />
            <span>{t('modals.login.googleBtn')}</span>
          </button>
          <button className="wm-cta-text" id="wmLoginCta">{t('modals.login.landingLogin')}</button>
        </div>

        <div className="wm-form-panel" id="wmFormPanel" hidden>
          <button className="wm-back" id="wmBackBtn" type="button" aria-label={t('modals.login.backBtn')}>
            <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2.5}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>{t('modals.login.backBtn')}</span>
          </button>
          <div className="wm-form-wrap">
            <h2 className="wm-form-title" id="wmFormTitle">{t('modals.login.titleRegister')}</h2>
            <p className="wm-booster-hint" id="wmBoosterHint">{t('modals.login.subtitleRegister')}</p>

            <form className="wm-email-form" id="wmEmailForm" noValidate>
              <div className="wm-field" id="wmNameField">
                <input type="text" id="wmName" placeholder={t('modals.login.namePlaceholder')} autoComplete="name" aria-label="Name" />
              </div>
              <div className="wm-field">
                <input type="email" id="wmEmail" placeholder={t('modals.login.emailPlaceholder')} required autoComplete="email" aria-label="Email" />
              </div>
              <div className="wm-field" id="wmPasswordField">
                <input type="password" id="wmPassword" placeholder={t('modals.login.passwordPlaceholder')} required autoComplete="new-password" minLength={6} aria-label="Password" />
              </div>
              <p className="wm-forgot" id="wmForgot" hidden>
                <button type="button" id="wmForgotBtn">{t('modals.login.forgotPassword')}</button>
              </p>
              <p className="wm-msg wm-error" id="wmError"></p>
              <p className="wm-msg wm-success" id="wmSuccess"></p>
              <button type="submit" className="wm-submit">
                {/* auth.min.js sets this text dynamically */}
                <span id="wmSubmitText">{t('modals.login.titleRegister')}</span>
                <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              </button>
            </form>

            <p className="wm-mode-toggle" id="wmModeToggle"></p>

            <p className="wm-terms">
              <span>{t('modals.login.termsText')}</span>{' '}
              <button className="wm-terms-link" id="wmAgbTrigger">{t('modals.login.termsLink')}</button>{' '}
              <span>{t('modals.login.termsAnd')}</span>{' '}
              <button className="wm-terms-link" id="wmDatenschutzTrigger">{t('modals.login.privacyLink')}</button>
              <span>.</span>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
