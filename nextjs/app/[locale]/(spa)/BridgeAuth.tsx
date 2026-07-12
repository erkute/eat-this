'use client';

/**
 * Renders the login modal portal and runs the pre-hydration auth-button sync.
 * Modal open/close state lives in LoginModalContext; this component only
 * consumes it. Triggers come from SiteNav (header profile icon), BurgerDrawer
 * (login button), and MustEatTeaserSection (locked card click) via
 * useLoginModal().
 *
 * - localStorage._authHint: read by the inline CRITICAL_BOOTSTRAP in
 *   [locale]/layout.tsx to set the loginBtn text/state synchronously,
 *   before React hydrates, so the user never sees "Sign in" flash to
 *   "Hi <name>".
 * - #loginBtn DOM sync: the burger drawer's login button text and class
 *   need to update on auth state change. The button id is referenced by
 *   the bootstrap script too, hence the imperative DOM update here.
 */

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useLocale } from 'next-intl';
import { useAuth, useLoginModal } from '@/lib/auth';
import { postLoginRedirect } from '@/lib/auth/postLoginRedirect';
import { useTranslation } from '@/lib/i18n';
import LoginModalBarLock from '@/app/components/LoginModalBarLock';
import { TOAST_HANDOFF_KEY } from '@/app/components/NotificationToast';
import modalStyles from '@/app/components/LoginModalOverlay.module.css';

const LoginPanel = dynamic(() => import('@/app/components/LoginPanel'), { ssr: false });

export default function BridgeAuth() {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const { isOpen: loginOpen, mode: loginMode, close: closeLogin } = useLoginModal();
  const router = useRouter();
  const locale = useLocale();

  // A sign-in that completes while the modal is open (Google popup or
  // magic-link return) lands the user in their profile — the same destination
  // the /login page uses. BridgeAuth owns the modal lifecycle, so it owns this
  // redirect rather than relying on the soon-to-unmount LoginPanel's effect.
  useEffect(() => {
    if (loading || !user || !loginOpen) return;
    try {
      sessionStorage.setItem(
        TOAST_HANDOFF_KEY,
        locale === 'de' ? 'Du bist angemeldet' : "You're signed in"
      );
    } catch {
      /* private mode */
    }
    void postLoginRedirect(user.uid, router, locale);
  }, [user, loading, loginOpen, router, locale]);

  // Scroll lock + iOS bar recolor live in <LoginModalBarLock /> inside the
  // overlay (single owner — a second snapshot-restore lock here raced with
  // the closing burger drawer and left the page scroll-locked).

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
      if (loginSpan) loginSpan.textContent = t('burger.profile');
      // Keep the pre-paint flag accurate once auth actually resolves (the
      // bootstrap only guesses from the possibly-stale _authHint).
      document.documentElement.setAttribute('data-auth', '1');
      try {
        const cachedAvatar = Number(localStorage.getItem(`eatthis_avatar_${user.uid}`));
        const avatar = cachedAvatar === 1 || cachedAvatar === 2 || cachedAvatar === 3
          ? cachedAvatar
          : null;
        localStorage.setItem(
          '_authHint',
          JSON.stringify({ n: firstName, u: user.uid, ...(avatar ? { a: avatar } : {}) }),
        );
      } catch {}
      // Close the modal if the user just signed in.
      closeLogin();
    } else {
      loginBtn?.classList.remove('logged-in');
      if (loginSpan) loginSpan.textContent = t('footer.signIn');
      document.documentElement.removeAttribute('data-auth');
      try { localStorage.removeItem('_authHint'); } catch {}
    }
  }, [user, loading, t, closeLogin]);

  return loginOpen ? createPortal(
    <div
      className={modalStyles.overlay}
      onClick={(e) => { if (e.target === e.currentTarget) closeLogin(); }}
    >
      {/* Recolors the iOS bottom-URL-bar zone while the modal is open. */}
      <LoginModalBarLock />
      <LoginPanel onBack={closeLogin} modal mode={loginMode} />
    </div>,
    document.body,
  ) : null;
}
