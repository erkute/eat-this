'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  getRedirectResult,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  deleteUser,
  type User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface AuthContextValue {
  user: User | null;
  /** True while the initial auth state is being resolved from Firebase. */
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

// ─── Context ───────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Google provider ───────────────────────────────────────────────────────

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// ─── Provider ──────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Subscribe to Firebase auth state changes.
  // This fires once immediately with the current user (from IndexedDB persistence),
  // then on every subsequent sign-in / sign-out.
  useEffect(() => {
    // Process pending redirect from signInWithRedirect (mobile Google flow).
    // Firebase v9+ also processes this internally before onAuthStateChanged
    // fires, but calling explicitly surfaces errors and lets us announce a
    // *fresh* sign-in (vs. silent session restore) so BridgeAuth can show the
    // welcome notification + nav-to-profile that the in-modal handler can't
    // run (the redirect navigated the page away before it had a chance).
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          window.dispatchEvent(
            new CustomEvent('auth:redirectComplete', { detail: { user: result.user } }),
          );
        }
      })
      .catch((err: unknown) => {
        const code = (err as { code?: string }).code ?? err;
        console.warn('[auth] getRedirectResult failed:', code);
      });

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // ─── Auth operations ─────────────────────────────────────────────────────

  const signInWithGoogle = useCallback(async (): Promise<void> => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    await firebaseSignOut(auth);
  }, []);

  const updateDisplayName = useCallback(async (name: string): Promise<void> => {
    if (!auth.currentUser) throw new Error('Not authenticated');
    await updateProfile(auth.currentUser, { displayName: name });
    // Refresh local user state to reflect the updated display name
    setUser({ ...auth.currentUser });
  }, []);

  const deleteAccount = useCallback(async (): Promise<void> => {
    if (!auth.currentUser) throw new Error('Not authenticated');
    await deleteUser(auth.currentUser);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signInWithGoogle,
      signOut,
      updateDisplayName,
      deleteAccount,
    }),
    [user, loading, signInWithGoogle, signOut, updateDisplayName, deleteAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
