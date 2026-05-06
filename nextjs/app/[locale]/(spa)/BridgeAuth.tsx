'use client';

/**
 * Owns the login modal portal and the pre-hydration auth hints.
 *
 * - window.openLoginModal / window.closeLoginModal: opened by SiteNav and
 *   BurgerDrawer when an unauthenticated user clicks a profile-protected
 *   action. Set as window globals so any client component can trigger the
 *   modal without prop-drilling — there is exactly one modal per app.
 * - localStorage._authHint: read by the inline CRITICAL_BOOTSTRAP in
 *   [locale]/layout.tsx to set the loginBtn text/state synchronously,
 *   before React hydrates, so the user never sees "Sign in" flash to
 *   "Hi <name>".
 * - #loginBtn DOM sync: the burger drawer's login button text and class
 *   need to update on auth state change. The button id is referenced by
 *   the bootstrap script too, hence the imperative DOM update here.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';
import LoginPanel from '@/app/components/LoginPanel';
import modalStyles from '@/app/[locale]/@modal/(.)login/modal.module.css';

export default function BridgeAuth() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const [loginOpen, setLoginOpen] = useState(false);

  // Expose modal triggers as window globals — single modal instance, called
  // from SiteNav (header profile icon) and BurgerDrawer (login button).
  useEffect(() => {
    window.openLoginModal  = () => setLoginOpen(true);
    window.closeLoginModal = () => setLoginOpen(false);
  }, []);

  // Lock body scroll while the login modal is open.
  useEffect(() => {
    if (!loginOpen) return;
    const prevOverflow    = document.body.style.overflow;
    const prevTouchAction = document.body.style.touchAction;
    document.body.style.overflow    = 'hidden';
    document.body.style.touchAction = 'none';
    return () => {
      document.body.style.overflow    = prevOverflow;
      document.body.style.touchAction = prevTouchAction;
    };
  }, [loginOpen]);

  // Sync auth state into the login button + the _authHint localStorage that
  // the pre-hydration bootstrap reads.
  useEffect(() => {
    if (loading) return;

    const loginBtn = document.getElementById('loginBtn');
    const loginSpan = loginBtn?.querySelector('span');

    if (user) {
      const firstName = (user.displayName ?? user.email ?? '')
        .split(' ')[0] || t('footer.signIn');
      loginBtn?.classList.add('logged-in');
      if (loginSpan) loginSpan.textContent = firstName;
      try { localStorage.setItem('_authHint', JSON.stringify({ n: firstName })); } catch {}
      // Close the modal if the user just signed in.
      setLoginOpen(false);
    } else {
      loginBtn?.classList.remove('logged-in');
      if (loginSpan) loginSpan.textContent = t('footer.signIn');
      try { localStorage.removeItem('_authHint'); } catch {}
    }
  }, [user, loading, t]);

  return loginOpen ? createPortal(
    <div
      className={modalStyles.overlay}
      onClick={(e) => { if (e.target === e.currentTarget) setLoginOpen(false); }}
    >
      <LoginPanel onBack={() => setLoginOpen(false)} modal />
    </div>,
    document.body,
  ) : null;
}

declare global {
  interface Window {
    openLoginModal?: () => void;
    closeLoginModal?: () => void;
  }
}
