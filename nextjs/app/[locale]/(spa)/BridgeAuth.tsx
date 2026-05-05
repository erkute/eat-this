'use client';

/**
 * BridgeAuth — bridges the React Auth context with the legacy window globals.
 *
 * During migration the vanilla JS (app.min.js, profile.min.js) still calls
 * window._signOut / window._updateDisplayName / window._deleteAccount.
 * This component wires those globals to the React auth context so the UI
 * keeps working unchanged.
 *
 * Auth-state side effects (loginBtn DOM, _authHint, _currentUser) were
 * previously handled by auth.min.js's onAuthStateChanged callback — now
 * owned here so that auth.min.js can be dropped.
 *
 * Remove this file once app.min.js / profile.min.js are fully migrated to React.
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';
import LoginPanel from '@/app/components/LoginPanel';
import modalStyles from '@/app/[locale]/@modal/(.)login/modal.module.css';

export default function BridgeAuth() {
  const { user, loading, signOut, updateDisplayName, deleteAccount } = useAuth();
  const { t } = useTranslation();
  const [loginOpen, setLoginOpen] = useState(false);

  // ─── Login modal — state-driven portal (no Next.js intercepting route) ──
  // Reliable on all pages regardless of routing context or Legacy JS state.

  useEffect(() => {
    window.openLoginModal  = () => setLoginOpen(true);
    window.closeLoginModal = () => setLoginOpen(false);
  }, []);

  // Lock body scroll while the login modal is open so the page underneath
  // can't scroll behind the overlay (and on mobile, prevent rubber-banding).
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

  // ─── Expose auth operations to vanilla JS globals ──────────────────────────

  useEffect(() => {
    window._signOut = async () => {
      await signOut();
      if (typeof window.showNotification === 'function') {
        window.showNotification(t('modals.login.notifications.signedOut'));
      }
    };
    window._updateDisplayName = async (name: string)  => { await updateDisplayName(name); };
    window._deleteAccount     = async ()               => { await deleteAccount(); };
  }, [signOut, updateDisplayName, deleteAccount, t]);

  // ─── Auth-state side effects ───────────────────────────────────────────────
  // Replaces the onAuthStateChanged callback in auth.min.js.

  useEffect(() => {
    if (loading) return;

    // 1. Sync window._currentUser for legacy consumers (app.min.js).
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

      // 4. Close login modal if user just signed in.
      setLoginOpen(false);
    } else {
      // 6. Logged-out state.
      loginBtn?.classList.remove('logged-in');
      if (loginSpan) loginSpan.textContent = t('footer.signIn');
      try { localStorage.removeItem('_authHint'); } catch {}
    }

    // 7. Dispatch for any other vanilla JS listeners.
    window.dispatchEvent(new CustomEvent('auth:changed', { detail: { user } }));
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

// ─── Global type augmentation ───────────────────────────────────────────────

declare global {
  interface Window {
    _currentUser?: import('firebase/auth').User | null;
    _signOut?: () => Promise<void>;
    _updateDisplayName?: (name: string) => Promise<void>;
    _deleteAccount?: () => Promise<void>;
    showNotification?: (msg: string) => void;
    openLoginModal?: () => void;
    closeLoginModal?: () => void;
  }
}
