'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useAuth, useMagicLink } from '@/lib/auth';

export default function WelcomeModal() {
  const { t } = useTranslation();
  const { signInWithGoogle } = useAuth();
  const { sendLink, state: magicState, errorMessage: magicError, reset: magicReset } = useMagicLink();
  const [email, setEmail] = useState('');

  const overlayRef = useRef<HTMLDivElement>(null);

  // ─── Open / close ─────────────────────────────────────────────────────────

  const open  = useCallback(() => overlayRef.current?.classList.add('active'),    []);
  const close = useCallback(() => {
    overlayRef.current?.classList.remove('active');
    magicReset();
    setEmail('');
    document.getElementById('wmLanding')?.removeAttribute('hidden');
    document.getElementById('wmFormPanel')?.setAttribute('hidden', '');
  }, [magicReset]);

  useEffect(() => {
    window.openWelcomeModal  = open;
    window.closeWelcomeModal = close;
    window.openLoginModal    = open;
    return () => {
      window.openWelcomeModal  = undefined;
      window.closeWelcomeModal = undefined;
      window.openLoginModal    = undefined;
    };
  }, [open, close]);

  // ─── Panel switching ───────────────────────────────────────────────────────

  const showFormPanel = useCallback(() => {
    document.getElementById('wmLanding')?.setAttribute('hidden', '');
    document.getElementById('wmFormPanel')?.removeAttribute('hidden');
    magicReset();
    setEmail('');
  }, [magicReset]);

  const goBack = useCallback(() => {
    document.getElementById('wmLanding')?.removeAttribute('hidden');
    document.getElementById('wmFormPanel')?.setAttribute('hidden', '');
    magicReset();
    setEmail('');
  }, [magicReset]);

  // ─── Google sign-in ────────────────────────────────────────────────────────

  const handleGoogle = useCallback(async (sourceBtn: HTMLElement | null) => {
    if (sourceBtn) (sourceBtn as HTMLButtonElement).disabled = true;
    try {
      await signInWithGoogle();
      close();
      window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'profile' } }));
    } catch {
      // user-cancelled or error — stay open
    } finally {
      if (sourceBtn) (sourceBtn as HTMLButtonElement).disabled = false;
    }
  }, [signInWithGoogle, close]);

  // ─── Wire DOM events ───────────────────────────────────────────────────────

  useEffect(() => {
    const closeBtn   = document.getElementById('wmClose');
    const backdrop   = document.getElementById('wmBackdrop');
    const backBtn    = document.getElementById('wmBackBtn');
    const signupCta  = document.getElementById('wmSignupCta');
    const loginCta   = document.getElementById('wmLoginCta');
    const googleBtn  = document.getElementById('wmGoogleBtn');
    const agbTrigger = document.getElementById('wmAgbTrigger');
    const dsTrigger  = document.getElementById('wmDatenschutzTrigger');

    const onClose  = () => close();
    const onBack   = () => goBack();
    const onSignup = () => showFormPanel();
    const onLogin  = () => showFormPanel();
    const onGoogle = (e: Event) => handleGoogle(e.currentTarget as HTMLElement);
    const onAgb    = () => document.getElementById('agbTrigger')?.click();
    const onDs     = () => document.getElementById('datenschutzTrigger')?.click();
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && overlayRef.current?.classList.contains('active')) close();
    };

    closeBtn?.addEventListener('click',  onClose);
    backdrop?.addEventListener('click',  onClose);
    backBtn?.addEventListener('click',   onBack);
    signupCta?.addEventListener('click', onSignup);
    loginCta?.addEventListener('click',  onLogin);
    googleBtn?.addEventListener('click', onGoogle);
    agbTrigger?.addEventListener('click', onAgb);
    dsTrigger?.addEventListener('click',  onDs);
    document.addEventListener('keydown', onKeydown);

    return () => {
      closeBtn?.removeEventListener('click',  onClose);
      backdrop?.removeEventListener('click',  onClose);
      backBtn?.removeEventListener('click',   onBack);
      signupCta?.removeEventListener('click', onSignup);
      loginCta?.removeEventListener('click',  onLogin);
      googleBtn?.removeEventListener('click', onGoogle);
      agbTrigger?.removeEventListener('click', onAgb);
      dsTrigger?.removeEventListener('click',  onDs);
      document.removeEventListener('keydown', onKeydown);
    };
  }, [close, goBack, showFormPanel, handleGoogle]);

  // ─── JSX ──────────────────────────────────────────────────────────────────

  return (
    <div className="wm-overlay" id="welcomeModal" ref={overlayRef} aria-modal={true} role="dialog" aria-label="Welcome to Eat This">
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

        {/* Landing panel — unchanged visually */}
        <div className="wm-landing" id="wmLanding">
          <p className="wm-hero-headline">Hundreds of Must Eats<br />to discover</p>
          <button className="wm-cta-primary" id="wmSignupCta">{t('modals.login.landingSignup')}</button>
          <button className="wm-cta-google" id="wmGoogleBtn">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pics/login/Google.webp" alt="" className="wm-google-icon" width={18} height={18} />
            <span>{t('modals.login.googleBtn')}</span>
          </button>
          <button className="wm-cta-text" id="wmLoginCta">{t('modals.login.emailCta')}</button>
        </div>

        {/* Form panel — magic link only */}
        <div className="wm-form-panel" id="wmFormPanel" hidden>
          <button className="wm-back" id="wmBackBtn" type="button" aria-label={t('modals.login.backBtn')}>
            <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2.5}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
            <span>{t('modals.login.backBtn')}</span>
          </button>

          <div className="wm-form-wrap">
            <h2 className="wm-form-title">{t('modals.login.titleRegister')}</h2>
            <p className="wm-booster-hint">{t('modals.login.subtitleRegister')}</p>

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
                <button
                  type="submit"
                  className="wm-submit"
                  disabled={magicState === 'sending'}
                >
                  <span>{t('modals.login.sendLinkBtn')}</span>
                  <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                  </svg>
                </button>
              </form>
            )}

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

