'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import { useAuth } from '@/lib/auth';

// Firebase error code → i18n key suffix
const ERROR_MAP: Record<string, string> = {
  'auth/email-already-in-use':    'emailInUse',
  'auth/invalid-email':           'invalidEmail',
  'auth/weak-password':           'weakPassword',
  'auth/wrong-password':          'wrongPassword',
  'auth/user-not-found':          'userNotFound',
  'auth/invalid-credential':      'invalidCredential',
  'auth/too-many-requests':       'tooManyRequests',
  'auth/network-request-failed':  'networkFailed',
  'auth/popup-closed-by-user':    '',
  'auth/cancelled-popup-request': '',
};

export default function WelcomeModal() {
  const { t } = useTranslation();
  const { signIn, signUp, signInWithGoogle, sendPasswordReset } = useAuth();

  // ─── Refs to DOM elements ────────────────────────────────────────────────
  const overlayRef   = useRef<HTMLDivElement>(null);
  const emailRef     = useRef<HTMLInputElement>(null);
  const passwordRef  = useRef<HTMLInputElement>(null);
  const nameRef      = useRef<HTMLInputElement>(null);
  const errorRef     = useRef<HTMLParagraphElement>(null);
  const successRef   = useRef<HTMLParagraphElement>(null);
  const submitBtnRef = useRef<HTMLButtonElement>(null);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const showError = useCallback((msg: string) => {
    if (!errorRef.current) return;
    errorRef.current.textContent = msg;
    errorRef.current.style.display = msg ? 'block' : 'none';
  }, []);

  const showSuccess = useCallback((msg: string) => {
    if (!successRef.current) return;
    successRef.current.textContent = msg;
    successRef.current.style.display = msg ? 'block' : 'none';
  }, []);

  const clearMessages = useCallback(() => { showError(''); showSuccess(''); }, [showError, showSuccess]);

  const resetToLanding = useCallback(() => {
    document.getElementById('wmLanding')?.removeAttribute('hidden');
    document.getElementById('wmFormPanel')?.setAttribute('hidden', '');
  }, []);

  const close = useCallback(() => {
    overlayRef.current?.classList.remove('active');
    clearMessages();
    resetToLanding();
  }, [clearMessages, resetToLanding]);

  const open = useCallback(() => overlayRef.current?.classList.add('active'), []);

  // Expose open/close to legacy app.min.js (already set by BridgeAuth but keep
  // in sync in case this component mounts after BridgeAuth).
  useEffect(() => {
    window.openWelcomeModal  = open;
    window.closeWelcomeModal = close;
  }, [open, close]);

  // ─── Panel/mode switching ─────────────────────────────────────────────────

  const showPanel = useCallback((mode: 'signup' | 'login') => {
    const landing   = document.getElementById('wmLanding');
    const formPanel = document.getElementById('wmFormPanel');
    const nameField = document.getElementById('wmNameField');
    const forgotEl  = document.getElementById('wmForgot');
    const titleEl   = document.getElementById('wmFormTitle');
    const hintEl    = document.getElementById('wmBoosterHint');
    const submitEl  = document.getElementById('wmSubmitText');
    const toggleEl  = document.getElementById('wmModeToggle');

    landing?.setAttribute('hidden', '');
    formPanel?.removeAttribute('hidden');

    clearMessages();

    if (mode === 'signup') {
      nameField?.removeAttribute('hidden');
      forgotEl?.setAttribute('hidden', '');
      if (titleEl)  titleEl.textContent  = t('modals.login.titleRegister');
      if (hintEl)   hintEl.textContent   = t('modals.login.subtitleRegister');
      if (submitEl) submitEl.textContent = t('modals.login.submitRegister');
      if (toggleEl) {
        toggleEl.textContent = '';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'login-mode-link';
        btn.textContent = t('modals.login.toggleToLogin');
        btn.onclick = () => showPanel('login');
        toggleEl.appendChild(btn);
      }
    } else {
      nameField?.setAttribute('hidden', '');
      forgotEl?.removeAttribute('hidden');
      if (titleEl)  titleEl.textContent  = t('modals.login.titleLogin');
      if (hintEl)   hintEl.textContent   = t('modals.login.subtitleLogin');
      if (submitEl) submitEl.textContent = t('modals.login.submitLogin');
      if (toggleEl) {
        toggleEl.textContent = '';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'login-mode-link';
        btn.textContent = t('modals.login.toggleToRegister');
        btn.onclick = () => showPanel('signup');
        toggleEl.appendChild(btn);
      }
    }

    // Store current mode on the form for submit handler to read
    const form = document.getElementById('wmEmailForm') as HTMLFormElement | null;
    if (form) form.dataset.mode = mode;
  }, [t, clearMessages]);

  const goBack = useCallback(() => {
    document.getElementById('wmLanding')?.removeAttribute('hidden');
    document.getElementById('wmFormPanel')?.setAttribute('hidden', '');
    clearMessages();
  }, [clearMessages]);

  // ─── Firebase error → localised string ───────────────────────────────────

  const localiseError = useCallback((code: string): string => {
    const suffix = ERROR_MAP[code];
    if (suffix === '') return '';                             // user-cancelled, silent
    if (suffix) return t(`modals.login.errors.${suffix}`);
    return t('modals.login.errors.generic');
  }, [t]);

  // ─── Form submit ─────────────────────────────────────────────────────────

  const handleSubmit = useCallback(async (e: Event) => {
    e.preventDefault();
    clearMessages();

    const email    = emailRef.current?.value.trim()    ?? '';
    const password = passwordRef.current?.value        ?? '';
    const name     = nameRef.current?.value.trim()     ?? '';
    const form     = document.getElementById('wmEmailForm') as HTMLFormElement | null;
    const mode     = (form?.dataset.mode ?? 'signup') as 'signup' | 'login';

    if (!email)                           { showError(t('modals.login.errors.emailRequired'));    return; }
    if (!password)                        { showError(t('modals.login.errors.passwordRequired')); return; }
    if (mode === 'signup' && !name)       { showError(t('modals.login.errors.nameRequired'));     return; }

    if (submitBtnRef.current) submitBtnRef.current.disabled = true;
    try {
      if (mode === 'signup') {
        await signUp(email, password, name);
        const first = name.split(' ')[0] || name;
        window.showNotification?.(t('modals.login.notifications.welcome').replace('{name}', first));
        close();
        setTimeout(() => window.showOnboarding?.(), 400);
      } else {
        const user = await signIn(email, password);
        const first = (user.displayName ?? '').split(' ')[0] || t('footer.signIn');
        window.showNotification?.(t('login.notifications.signedIn').replace('{name}', first));
        close();
        window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'profile' } }));
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      const msg  = localiseError(code);
      if (msg) showError(msg);
    } finally {
      if (submitBtnRef.current) submitBtnRef.current.disabled = false;
    }
  }, [t, signIn, signUp, close, clearMessages, showError, localiseError]);

  // ─── Forgot password ──────────────────────────────────────────────────────

  const handleForgot = useCallback(async () => {
    clearMessages();
    const email = emailRef.current?.value.trim() ?? '';
    if (!email) { showError(t('modals.login.errors.emailRequiredFirst')); return; }

    const btn = document.getElementById('wmForgotBtn') as HTMLButtonElement | null;
    if (btn) btn.disabled = true;
    try {
      await sendPasswordReset(email);
      clearMessages();
      showSuccess(t('modals.login.forgotSuccess'));
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      if (code === 'functions/resource-exhausted') {
        showError(t('modals.login.errors.tooManyRequestsLong'));
      } else {
        showError(t('modals.login.errors.sendFailed'));
      }
    } finally {
      if (btn) btn.disabled = false;
    }
  }, [t, sendPasswordReset, clearMessages, showError, showSuccess]);

  // ─── Google sign-in ───────────────────────────────────────────────────────

  const handleGoogle = useCallback(async (sourceBtn: HTMLElement | null) => {
    clearMessages();
    if (sourceBtn) (sourceBtn as HTMLButtonElement).disabled = true;
    try {
      await signInWithGoogle();
      // onAuthStateChanged in BridgeAuth handles UI update + notification.
      close();
      window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'profile' } }));
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      const msg  = localiseError(code);
      if (msg) showError(msg);
    } finally {
      if (sourceBtn) (sourceBtn as HTMLButtonElement).disabled = false;
    }
  }, [signInWithGoogle, close, clearMessages, showError, localiseError]);

  // ─── Wire DOM events once on mount ────────────────────────────────────────

  useEffect(() => {
    const form      = document.getElementById('wmEmailForm');
    const closeBtn  = document.getElementById('wmClose');
    const backdrop  = document.getElementById('wmBackdrop');
    const backBtn   = document.getElementById('wmBackBtn');
    const forgotBtn = document.getElementById('wmForgotBtn');
    const signupCta = document.getElementById('wmSignupCta');
    const loginCta  = document.getElementById('wmLoginCta');
    const googleLanding = document.getElementById('wmGoogleBtn');
    const agbTrigger    = document.getElementById('wmAgbTrigger');
    const dsTrigger     = document.getElementById('wmDatenschutzTrigger');

    const onSubmit  = (e: Event) => { handleSubmit(e); };
    const onClose   = () => close();
    const onBack    = () => goBack();
    const onForgot  = () => handleForgot();
    const onSignup  = () => showPanel('signup');
    const onLogin   = () => showPanel('login');
    const onGoogle  = (e: Event) => handleGoogle(e.currentTarget as HTMLElement);
    const onAgb     = () => document.getElementById('agbTrigger')?.click();
    const onDs      = () => document.getElementById('datenschutzTrigger')?.click();
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && overlayRef.current?.classList.contains('active')) close();
    };

    form?.addEventListener('submit',  onSubmit);
    closeBtn?.addEventListener('click',  onClose);
    backdrop?.addEventListener('click',  onClose);
    backBtn?.addEventListener('click',   onBack);
    forgotBtn?.addEventListener('click', onForgot);
    signupCta?.addEventListener('click', onSignup);
    loginCta?.addEventListener('click',  onLogin);
    googleLanding?.addEventListener('click', onGoogle);
    agbTrigger?.addEventListener('click', onAgb);
    dsTrigger?.addEventListener('click',  onDs);
    document.addEventListener('keydown', onKeydown);

    return () => {
      form?.removeEventListener('submit',  onSubmit);
      closeBtn?.removeEventListener('click',  onClose);
      backdrop?.removeEventListener('click',  onClose);
      backBtn?.removeEventListener('click',   onBack);
      forgotBtn?.removeEventListener('click', onForgot);
      signupCta?.removeEventListener('click', onSignup);
      loginCta?.removeEventListener('click',  onLogin);
      googleLanding?.removeEventListener('click', onGoogle);
      agbTrigger?.removeEventListener('click', onAgb);
      dsTrigger?.removeEventListener('click',  onDs);
      document.removeEventListener('keydown', onKeydown);
    };
  }, [handleSubmit, close, goBack, handleForgot, showPanel, handleGoogle]);

  // ─── JSX ─────────────────────────────────────────────────────────────────

  return (
    <div className="wm-overlay" id="welcomeModal" ref={overlayRef} aria-modal role="dialog" aria-label="Welcome to Eat This">
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
                <input ref={nameRef} type="text" id="wmName" placeholder={t('modals.login.namePlaceholder')} autoComplete="name" aria-label="Name" />
              </div>
              <div className="wm-field">
                <input ref={emailRef} type="email" id="wmEmail" placeholder={t('modals.login.emailPlaceholder')} required autoComplete="email" aria-label="Email" />
              </div>
              <div className="wm-field">
                <input ref={passwordRef} type="password" id="wmPassword" placeholder={t('modals.login.passwordPlaceholder')} required autoComplete="current-password" minLength={6} aria-label="Password" />
              </div>
              <p className="wm-forgot" id="wmForgot" hidden>
                <button type="button" id="wmForgotBtn">{t('modals.login.forgotPassword')}</button>
              </p>
              <p ref={errorRef} className="wm-msg wm-error" id="wmError" style={{ display: 'none' }}></p>
              <p ref={successRef} className="wm-msg wm-success" id="wmSuccess" style={{ display: 'none' }}></p>
              <button ref={submitBtnRef} type="submit" className="wm-submit">
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

// ─── Global type augmentation ─────────────────────────────────────────────────

declare global {
  interface Window {
    showOnboarding?: () => void;
  }
}
