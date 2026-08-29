'use client';

/**
 * Renders the login modal portal and synchronizes the resolved auth state.
 * Modal open/close state lives in LoginModalContext; this component only
 * consumes it. Triggers call useLoginModal().open(mode), where mode defaults
 * to 'starter':
 *
 *   BurgerDrawer      login button, only while signed out (default 'starter')
 *   MustEatDetail     reveal flow hits the login wall ('starter')
 *   RestaurantDetail  starter-pack banner ('starter'); existing user ('signin')
 *   RestaurantList    end-of-list promo, rendered only when signed out ('signin')
 *   useFavorites      heart toggle with no signed-in user ('signin')
 *
 * SiteNav does not open the modal — it has no login affordance at all.
 *
 * - localStorage._authHint: read by the inline CRITICAL_BOOTSTRAP in
 *   [locale]/layout.tsx only to set html[data-auth] before paint. The
 *   bootstrap never changes React-owned text, because the hint may be stale.
 * - #loginBtn DOM sync: after hydration, the burger drawer's login button
 *   text and class update with the verified Firebase auth state.
 */

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import { useLocale } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useAuth, useLoginModal } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';
import LoginModalBarLock from '@/app/components/LoginModalBarLock';
import { AUTH_SCREEN_HOLD_MS } from '@/app/components/AuthScreen';
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
  //
  // Gehalten wird vorher: der Wartescreen (AuthScreen) haengt im Panel, also
  // an genau diesem Modal. Schliesst es in derselben Runde, in der Firebase
  // den Nutzer meldet, ist der Screen weg, bevor er gelesen ist — beim
  // Google-Popup bekommt er sowieso erst nach dem Popup-Fenster seinen
  // Auftritt. Deshalb schliesst und leitet erst dieser Timer weiter, und
  // nicht mehr der Sync-Effekt darunter.
  useEffect(() => {
    if (loading || !user || !loginOpen) return;
    const timer = window.setTimeout(() => {
      try {
        sessionStorage.setItem(
          TOAST_HANDOFF_KEY,
          locale === 'de' ? 'Du bist angemeldet' : "You're signed in"
        );
      } catch {
        /* private mode */
      }
      closeLogin();
      router.replace('/');
    }, AUTH_SCREEN_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [user, loading, loginOpen, router, locale, closeLogin]);

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
      const firstName = (user.displayName ?? user.email ?? '').split(' ')[0] || t('footer.signIn');
      loginBtn?.classList.add('logged-in');
      if (loginSpan) loginSpan.textContent = t('burger.profile');
      // Keep the pre-paint flag accurate once auth actually resolves (the
      // bootstrap only guesses from the possibly-stale _authHint).
      document.documentElement.setAttribute('data-auth', '1');
      try {
        const cachedAvatar = Number(localStorage.getItem(`eatthis_avatar_${user.uid}`));
        const avatar =
          cachedAvatar === 1 || cachedAvatar === 2 || cachedAvatar === 3 ? cachedAvatar : null;
        localStorage.setItem(
          '_authHint',
          JSON.stringify({ n: firstName, u: user.uid, ...(avatar ? { a: avatar } : {}) })
        );
      } catch {}
      // Das Schliessen liegt im Effekt darueber — es faellt mit der
      // Weiterleitung zusammen und wartet mit ihr die Haltezeit des
      // Wartescreens ab.
    } else {
      loginBtn?.classList.remove('logged-in');
      if (loginSpan) loginSpan.textContent = t('footer.signIn');
      document.documentElement.removeAttribute('data-auth');
      try {
        localStorage.removeItem('_authHint');
      } catch {}
    }
  }, [user, loading, t]);

  return loginOpen
    ? createPortal(
        <div
          className={modalStyles.overlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeLogin();
          }}
        >
          {/* Recolors the iOS bottom-URL-bar zone while the modal is open. */}
          <LoginModalBarLock />
          <LoginPanel onBack={closeLogin} mode={loginMode} />
        </div>,
        document.body
      )
    : null;
}
