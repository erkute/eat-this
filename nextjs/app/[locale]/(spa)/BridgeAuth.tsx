'use client';

/**
 * BridgeAuth — bridges the React Auth context with the legacy window globals.
 *
 * During migration the vanilla JS (app.min.js, auth.min.js) still calls
 * window._signOut / window._sendPasswordReset / window._updateDisplayName /
 * window._deleteAccount. This component wires those globals to the React
 * auth context so the UI keeps working unchanged.
 *
 * It also dispatches a custom 'auth:changed' event on every user change so
 * vanilla JS can react to auth state without polling.
 *
 * Remove this file once auth.min.js is fully migrated to React.
 */

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useTranslation } from '@/lib/i18n';

export default function BridgeAuth() {
  const { user, loading, signOut, sendPasswordReset, updateDisplayName, deleteAccount } = useAuth();
  const { t } = useTranslation();

  // Expose auth operations to vanilla JS globals.
  useEffect(() => {
    window._signOut = async () => {
      await signOut();
      // Vanilla JS auth.min.js shows notification + navigates — keep that behaviour.
      // If it's already migrated away, do it here:
      if (typeof window.showNotification === 'function') {
        window.showNotification(t('modals.login.notifications.signedOut'));
      }
    };

    window._sendPasswordReset = async (email: string) => {
      await sendPasswordReset(email);
    };

    window._updateDisplayName = async (name: string) => {
      await updateDisplayName(name);
    };

    window._deleteAccount = async () => {
      await deleteAccount();
    };
  }, [signOut, sendPasswordReset, updateDisplayName, deleteAccount, t]);

  // Dispatch a custom event whenever auth state changes so vanilla JS can listen.
  useEffect(() => {
    if (loading) return;
    window.dispatchEvent(
      new CustomEvent('auth:changed', { detail: { user } }),
    );
  }, [user, loading]);

  return null;
}

// ─── Global type augmentation ───────────────────────────────────────────────

declare global {
  interface Window {
    _signOut?: () => Promise<void>;
    _sendPasswordReset?: (email: string) => Promise<void>;
    _updateDisplayName?: (name: string) => Promise<void>;
    _deleteAccount?: () => Promise<void>;
    showNotification?: (msg: string) => void;
  }
}
