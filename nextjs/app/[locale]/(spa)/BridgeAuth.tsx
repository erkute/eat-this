'use client';

/**
 * BridgeAuth — bridges the React Auth context with the legacy window globals.
 *
 * During migration the vanilla JS (app.min.js, auth.min.js) still calls
 * window._signOut / window._sendPasswordReset / window._updateDisplayName /
 * window._deleteAccount / window.openWelcomeModal / window.closeWelcomeModal.
 * This component wires those globals to the React auth context so the UI keeps
 * working unchanged.
 *
 * Auth-state side effects (loginBtn DOM, _authHint, _currentUser,
 * _revealBlurredCards, _initProfilePage) were previously handled by
 * auth.min.js's onAuthStateChanged callback — now owned here so that
 * auth.min.js can be dropped.
 *
 * Remove this file once auth.min.js is fully migrated to React.
 */

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';

export default function BridgeAuth() {
  const { user, loading, signOut, sendPasswordReset, updateDisplayName, deleteAccount } = useAuth();
  const { t } = useTranslation();

  // ─── Expose auth operations to vanilla JS globals ──────────────────────────

  useEffect(() => {
    window._signOut = async () => {
      await signOut();
      if (typeof window.showNotification === 'function') {
        window.showNotification(t('login.notifications.signedOut'));
      }
    };
    window._sendPasswordReset = async (email: string) => { await sendPasswordReset(email); };
    window._updateDisplayName = async (name: string)  => { await updateDisplayName(name); };
    window._deleteAccount     = async ()               => { await deleteAccount(); };

    // WelcomeModal open/close — app.min.js calls these when profile icon is
    // clicked without auth. The DOM modal is owned by WelcomeModal.tsx.
    const openModal = () => document.getElementById('welcomeModal')?.classList.add('active');
    const closeModal = () => document.getElementById('welcomeModal')?.classList.remove('active');
    window.openWelcomeModal = openModal;
    window.closeWelcomeModal = closeModal;
    // favourites.min.js calls openLoginModal when user taps a fav without auth.
    // app.min.js used to define it pointing to #loginModal (removed); override
    // here so it opens the WelcomeModal instead.
    window.openLoginModal = openModal;
  }, [signOut, sendPasswordReset, updateDisplayName, deleteAccount, t]);

  // ─── Auth-state side effects ───────────────────────────────────────────────
  // Replaces the onAuthStateChanged callback in auth.min.js.

  useEffect(() => {
    if (loading) return;

    // 1. Sync window._currentUser for legacy consumers (app.min.js, profile.min.js).
    window._currentUser = user ?? null;

    const loginBtn = document.getElementById('loginBtn');
    const loginSpan = loginBtn?.querySelector('span');

    if (user) {
      // 2. Update navbar loginBtn to show first name.
      const firstName = (user.displayName ?? user.email ?? '')
        .split(' ')[0] || t('footer.signIn');
      loginBtn?.classList.add('logged-in');
      if (loginSpan) loginSpan.textContent = firstName;

      // 3. Persist auth hint for pre-hydration bootstrap (avoids flash).
      try { localStorage.setItem('_authHint', JSON.stringify({ n: firstName })); } catch {}

      // 4. Reveal album/blurred cards for logged-in users.
      if (typeof window._revealBlurredCards === 'function') {
        window._revealBlurredCards();
      } else if (typeof window._renderAlbum === 'function') {
        window._renderAlbum();
      }
    } else {
      // 5. Logged-out state.
      loginBtn?.classList.remove('logged-in');
      if (loginSpan) loginSpan.textContent = t('footer.signIn');
      try { localStorage.removeItem('_authHint'); } catch {}
    }

    // 6. Notify profile page (profile.min.js defines _initProfilePage).
    window._initProfilePage?.(user ?? null);

    // 7. Dispatch for any other vanilla JS listeners.
    window.dispatchEvent(new CustomEvent('auth:changed', { detail: { user } }));
  }, [user, loading, t]);

  return null;
}

// ─── Global type augmentation ───────────────────────────────────────────────

declare global {
  interface Window {
    _currentUser?: import('firebase/auth').User | null;
    _signOut?: () => Promise<void>;
    _sendPasswordReset?: (email: string) => Promise<void>;
    _updateDisplayName?: (name: string) => Promise<void>;
    _deleteAccount?: () => Promise<void>;
    openWelcomeModal?: () => void;
    closeWelcomeModal?: () => void;
    openLoginModal?: () => void;
    closeLoginModal?: () => void;
    showNotification?: (msg: string) => void;
    _revealBlurredCards?: () => void;
    _renderAlbum?: () => void;
    _initProfilePage?: (user: import('firebase/auth').User | null) => void;
  }
}
