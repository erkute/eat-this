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
  onIdTokenChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  deleteUser,
  type User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import {
  clearMapDataCaches,
  reconcileMapDataCacheIdentity,
} from '@/lib/map/map-data-cache';

// ─── Types ─────────────────────────────────────────────────────────────────

interface AuthContextValue {
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

async function clearPremiumAccess(): Promise<void> {
  const response = await fetch('/api/auth/premium-access', { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to clear premium access');
}

async function synchronizePremiumAccess(user: User | null): Promise<void> {
  if (!user) return clearPremiumAccess();
  const idToken = await user.getIdToken();
  const response = await fetch('/api/auth/premium-access', {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!response.ok) throw new Error('Failed to synchronize premium access');
}

// ─── Provider ──────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Synchronize the server-verifiable image session before exposing a Firebase
  // identity to the app. onIdTokenChanged also refreshes the session when the
  // SDK rotates its ID token.
  useEffect(() => {
    let active = true;
    let generation = 0;
    const unsubscribe = onIdTokenChanged(auth, (firebaseUser) => {
      const currentGeneration = ++generation;
      setLoading(true);
      reconcileMapDataCacheIdentity(firebaseUser?.uid ?? null);
      void synchronizePremiumAccess(firebaseUser)
        .then(() => {
          if (!active || currentGeneration !== generation) return;
          setUser(firebaseUser);
          setLoading(false);
        })
        .catch(async () => {
          // Best-effort second clear. If synchronization is unavailable, keep
          // the UI anonymous so a new identity never inherits old content.
          await clearPremiumAccess().catch(() => undefined);
          if (!active || currentGeneration !== generation) return;
          setUser(null);
          setLoading(false);
        });
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // ─── Auth operations ─────────────────────────────────────────────────────

  const signInWithGoogle = useCallback(async (): Promise<void> => {
    await signInWithPopup(auth, googleProvider);
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    // Clear the HttpOnly premium-image capability before Firebase drops the
    // browser identity. Failure is surfaced to the caller so a shared browser
    // never appears signed out while retaining the short-lived capability.
    clearMapDataCaches();
    await clearPremiumAccess();
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
    clearMapDataCaches();
    await clearPremiumAccess();
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
