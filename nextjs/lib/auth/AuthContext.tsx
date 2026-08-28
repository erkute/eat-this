'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  browserPopupRedirectResolver,
  getRedirectResult,
  onIdTokenChanged,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  deleteUser,
  type User,
} from 'firebase/auth';
import * as Sentry from '@sentry/nextjs';
import { describeGoogleSignInError } from './googleSignInError';
import { warmGooglePopup } from './googlePopupWarmup';
import { auth } from '@/lib/firebase/config';
import { clearMapDataCaches, reconcileMapDataCacheIdentity } from '@/lib/map/map-data-cache';

// ─── Types ─────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  /** True while the initial auth state is being resolved from Firebase. */
  loading: boolean;
  /**
   * Lädt den Popup-Helfer vor. Aufrufen, sobald eine Anmelde-Oberfläche
   * sichtbar wird — ohne das frisst der Popup-Blocker den ersten Klick
   * (siehe googlePopupWarmup.ts).
   */
  prepareGoogleSignIn: () => void;
  /**
   * Meldet mit Google an. Wird das Popup vom Browser geblockt, schaltet der
   * Aufruf selbsttätig auf den Redirect-Weg um — dann kehrt der Leser über
   * `returnTo` zurück (Vorgabe: die aktuelle Adresse), und diese Promise löst
   * nie auf, weil die Seite vorher navigiert.
   */
  signInWithGoogle: (options?: { returnTo?: string }) => Promise<void>;
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
  const [user, setUser] = useState<User | null>(null);
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

  /* Holt das Ergebnis des Redirect-Wegs ab. Unsere Auth-Instanz kann das nicht
     von selbst: sie ist ohne Popup-/Redirect-Resolver initialisiert (siehe
     lib/firebase/config.ts), also muss er hier mitgegeben werden.

     Fuer alle anderen Besucher kostet der Aufruf nichts: getRedirectResult
     liest zuerst den sessionStorage-Marker und laedt Googles Iframe nur, wenn
     wirklich eine Anmeldung unterwegs ist. Die Zusage des Cookie-Banners —
     Google Sign-In laedt nur, wenn man es nutzt — bleibt damit unberuehrt. */
  useEffect(() => {
    void getRedirectResult(auth, browserPopupRedirectResolver).catch((error: unknown) => {
      const { code, benign } = describeGoogleSignInError(error);
      Sentry.captureException(error, {
        level: benign ? 'warning' : 'error',
        tags: { auth_flow: 'google_redirect', auth_error_code: code },
      });
      console.warn('[auth] Google redirect result failed:', code, error);
    });
  }, []);

  // ─── Auth operations ─────────────────────────────────────────────────────

  const prepareGoogleSignIn = useCallback((): void => warmGooglePopup(), []);

  const signInWithGoogle = useCallback(async (options?: { returnTo?: string }): Promise<void> => {
    try {
      // The resolver is passed here rather than baked into the auth instance:
      // it drags in Google's gapi iframe, which must not load for visitors who
      // never sign in (see lib/firebase/config.ts).
      await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
      return;
    } catch (error) {
      /* Reported HERE rather than in the two call sites, both of which used to
           swallow it whole. A Google sign-in that fails silently is invisible
           three times over: no message on screen, nothing in the console, nothing
           in Sentry — which is how a broken popup on staging survived three
           rounds of guessing (user, 2026-08-26). The code IS the diagnosis, so it
           goes in as a tag rather than being buried in the message. */
      const { code, benign, blocked } = describeGoogleSignInError(error);

      if (blocked) {
        /* Der Browser hat das Fenster nicht aufgehen lassen. Auf iOS Safari
             ist das der Normalfall, solange Googles Iframe-Helfer beim Tippen
             noch laedt: Safari erlaubt `window.open` nur im Klick-Task, und
             `signInWithPopup` wartet vorher auf diesen Helfer. Auf dem Handy
             dauert das — einmal ist er dort sogar ganz im Netz gescheitert
             (auth/network-request-failed, 28.08.2026). Das Vorwaermen
             (googlePopupWarmup.ts) verkuerzt die Wartezeit, aber es garantiert
             sie nicht weg.

             Eine Navigation braucht keine Nutzer-Aktivierung und traegt
             deshalb auch dann noch. Der Leser muss dafuer kein zweites Mal
             tippen: wir schalten hier selbst um. */
        Sentry.captureMessage('Google-Popup geblockt — Wechsel auf Redirect', {
          level: 'info',
          tags: { auth_flow: 'google_popup', auth_error_code: code, auth_fallback: 'redirect' },
          extra: { host: window.location.host },
        });
        /* Der Redirect kehrt zur AKTUELLEN Adresse zurueck. Wer von einem
             gesperrten Spot kommt, braucht dort `?r=<slug>&claim=1` — denselben
             Marker, den der Magic-Link-Weg hinterlaesst und den
             useSignupSpotClaim beim Landen einloest. Ohne ihn faende die
             Rueckkehr zwar ein angemeldetes Konto vor, aber niemanden mehr,
             der den Spot einloest. */
        if (options?.returnTo) window.history.replaceState(null, '', options.returnTo);
        try {
          await signInWithRedirect(auth, googleProvider, browserPopupRedirectResolver);
          return;
        } catch (redirectError) {
          const { code: redirectCode } = describeGoogleSignInError(redirectError);
          Sentry.captureException(redirectError, {
            level: 'error',
            tags: { auth_flow: 'google_redirect', auth_error_code: redirectCode },
            extra: { authDomain: auth.app.options.authDomain, host: window.location.host },
          });
          console.warn('[auth] Google redirect failed:', redirectCode, redirectError);
          throw redirectError;
        }
      }

      /* IMMER melden, auch den Abbruch — nur leiser. `benign` entscheidet, ob
           der Leser eine Meldung sieht, nicht ob wir eine bekommen: ein
           zugegangenes Fenster sieht identisch aus, ob es der Leser war oder die
           Übergabe. Genau diese Kopplung machte die vorige Fassung blind. */
      Sentry.captureException(error, {
        level: benign ? 'warning' : 'error',
        tags: { auth_flow: 'google_popup', auth_error_code: code, auth_benign: String(benign) },
        extra: {
          authDomain: auth.app.options.authDomain,
          appName: auth.app.name,
          host: window.location.host,
        },
      });
      // Auch in der Konsole, damit man es ohne Umweg über Sentry sieht.
      console.warn('[auth] Google sign-in failed:', code, error);
      throw error;
    }
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
      prepareGoogleSignIn,
      signInWithGoogle,
      signOut,
      updateDisplayName,
      deleteAccount,
    }),
    [
      user,
      loading,
      prepareGoogleSignIn,
      signInWithGoogle,
      signOut,
      updateDisplayName,
      deleteAccount,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
