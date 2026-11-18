'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  browserPopupRedirectResolver,
  getRedirectResult,
  getAdditionalUserInfo,
  onIdTokenChanged,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  updateProfile,
  deleteUser,
  type User,
} from 'firebase/auth';
import * as Sentry from '@/lib/sentry/client-reporting';
import { describeGoogleSignInError } from './googleSignInError';
import { warmGooglePopup } from './googlePopupWarmup';
import { announceSignedIn } from './afterSignIn';
import { auth } from '@/lib/firebase/config';
import { trackEvent } from '@/lib/analytics';
import { clearMapDataCaches, reconcileMapDataCacheIdentity } from '@/lib/map/map-data-cache';

// ─── Types ─────────────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  /** True while the initial auth state is being resolved from Firebase. */
  loading: boolean;
  /**
   * Das Konto, das Firebase meldet, schon bevor die Bild-Sitzung steht und
   * `user` freigegeben wird: `undefined`, bis Firebase sich gemeldet hat,
   * `null` ohne Konto. Nur für Abrufe, die per ID-Token laufen und darum
   * nicht auf die Sitzung warten müssen (useMapData).
   */
  firebaseUid: string | null | undefined;
  /**
   * Ob der Server das Konto als Admin kennt (ADMIN_EMAILS bzw. Claim). Nur für
   * die Sichtbarkeit von Admin-Eingängen — geschützt wird serverseitig.
   */
  isAdmin: boolean;
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

// All cookie mutations in this document share a queue, including remounts.
// Do not abort requests: their Set-Cookie may already be on its way.
let sessionMutation: Promise<unknown> = Promise.resolve();
// Shared with the queue: a remount must not schedule a signed-in sync during logout.
let endingSessions = 0;
function enqueueSessionMutation<T>(operation: () => Promise<T>): Promise<T> {
  const result = sessionMutation.then(operation);
  sessionMutation = result.catch(() => undefined);
  return result;
}

const PREMIUM_ACCESS_URL = '/api/auth/premium-access';

async function clearPremiumAccess(): Promise<void> {
  // Keep cookie cleanup running if the page is leaving. If the request
  // reaches the server as GET (JAVASCRIPT-AG), repeat it as a regular POST.
  let response = await fetch(PREMIUM_ACCESS_URL, { method: 'DELETE', keepalive: true });
  if (response.status === 405) {
    response = await fetch(PREMIUM_ACCESS_URL, {
      method: 'POST',
      redirect: 'error',
      headers: { 'X-EatThis-Action': 'clear-premium-access' },
    });
  }
  if (!response.ok) throw new Error(`Failed to clear premium access (HTTP ${response.status})`);
}

/** Liefert, ob der Server das Konto als Admin kennt. */
async function synchronizePremiumAccess(user: User | null): Promise<boolean> {
  if (!user) {
    await clearPremiumAccess();
    return false;
  }
  const idToken = await user.getIdToken();
  const response = await fetch(PREMIUM_ACCESS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!response.ok) throw new Error('Failed to synchronize premium access');
  const body = (await response.json().catch(() => null)) as { admin?: unknown } | null;
  return body?.admin === true;
}

/* Ein Versuch reicht nicht. Der Aufruf faellt typischerweise genau dann aus,
   wenn er am wichtigsten ist: direkt nach dem Magic-Link-Redirect, waehrend
   das Netz der Mail-App noch auf das neue Dokument umschaltet. Ein einzelner
   Aussetzer darf keine Anmeldung kosten. */
const SYNC_RETRY_DELAY_MS = 600;

async function synchronizePremiumAccessWithRetry(user: User | null): Promise<boolean> {
  try {
    return await synchronizePremiumAccess(user);
  } catch {
    await new Promise((resolve) => setTimeout(resolve, SYNC_RETRY_DELAY_MS));
  }
  return synchronizePremiumAccess(user);
}

// ─── Provider ──────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [identity, setIdentity] = useState<{ user: User | null }>({ user: null });
  const [loading, setLoading] = useState(true);
  const [firebaseUid, setFirebaseUid] = useState<string | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState(false);

  // Synchronize the server-verifiable image session before exposing a Firebase
  // identity to the app. onIdTokenChanged also refreshes the session when the
  // SDK rotates its ID token.
  useEffect(() => {
    let active = true;
    let generation = 0;
    const unsubscribe = onIdTokenChanged(auth, (firebaseUser) => {
      if (endingSessions > 0 && firebaseUser) return;
      const currentGeneration = ++generation;
      setLoading(true);
      setFirebaseUid(firebaseUser?.uid ?? null);
      reconcileMapDataCacheIdentity(firebaseUser?.uid ?? null);
      let admin = false;
      void enqueueSessionMutation(async () => {
        if (!active || currentGeneration !== generation || (endingSessions > 0 && firebaseUser)) {
          return false;
        }
        return synchronizePremiumAccessWithRetry(firebaseUser).catch(async (error: unknown) => {
          // Cleanup belongs to the same queue entry as the failed sync.
          await clearPremiumAccess().catch(() => undefined);
          throw error;
        });
      })
        .then((result) => {
          admin = result;
        })
        .catch((error: unknown) => {
          /* Die Bild-Sitzung ist ein Nebenaufruf. Fällt sie aus, fehlen
             signierte Bilder; die Anmeldung selbst hält Firebase, und die darf
             ein Fehlschlag hier nicht wegwerfen: Sonst zeigte die App „nicht
             angemeldet", bis eine Stunde später das Token rotiert. Also: melden
             statt schlucken, und den angemeldeten Zustand behalten. */
          Sentry.captureException(error, {
            level: 'error',
            tags: {
              auth_flow: 'premium_access_sync',
              auth_sync_target: firebaseUser ? 'signed_in' : 'signed_out',
            },
          });
          console.warn('[auth] premium access sync failed:', error);
        })
        .finally(() => {
          if (!active || currentGeneration !== generation) return;
          setIdentity({ user: firebaseUser });
          setIsAdmin(admin);
          setLoading(false);
        });
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  /* Holt das Ergebnis des Redirect-Wegs ab. Die Auth-Instanz ist ohne
     Popup-/Redirect-Resolver initialisiert (lib/firebase/config.ts), also wird
     er hier mitgegeben. Fuer alle anderen kostet das nichts: getRedirectResult
     liest zuerst den sessionStorage-Marker und laedt Googles Iframe nur, wenn
     eine Anmeldung unterwegs ist. */
  useEffect(() => {
    /* Wer ueber den Redirect zurueckkommt, ist angemeldet — weiter ins Profil
       wie nach dem Popup (afterSignIn.ts). */
    void getRedirectResult(auth, browserPopupRedirectResolver).then(
      (result) => {
        if (result?.user) {
          trackEvent(getAdditionalUserInfo(result)?.isNewUser ? 'sign_up' : 'login', {
            method: 'google',
          });
          announceSignedIn();
        }
      },
      (error: unknown) => {
        const { code, benign } = describeGoogleSignInError(error);
        Sentry.captureException(error, {
          level: benign ? 'warning' : 'error',
          tags: { auth_flow: 'google_redirect', auth_error_code: code },
        });
        console.warn('[auth] Google redirect result failed:', code, error);
      }
    );
  }, []);

  // ─── Auth operations ─────────────────────────────────────────────────────

  const prepareGoogleSignIn = useCallback((): void => warmGooglePopup(), []);

  const signInWithGoogle = useCallback(async (options?: { returnTo?: string }): Promise<void> => {
    try {
      // The resolver is passed here rather than baked into the auth instance:
      // it drags in Google's gapi iframe, which must not load for visitors who
      // never sign in (see lib/firebase/config.ts).
      const credential = await signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);
      trackEvent(getAdditionalUserInfo(credential)?.isNewUser ? 'sign_up' : 'login', {
        method: 'google',
      });
      announceSignedIn();
      return;
    } catch (error) {
      /* Reported here rather than at the two call sites: a Google sign-in that
         fails silently leaves no trace otherwise. The code goes in as a tag. */
      const { code, benign, blocked } = describeGoogleSignInError(error);

      if (blocked) {
        /* Der Browser hat das Fenster nicht aufgehen lassen. Auf iOS Safari ist
           das häufig: `window.open` geht nur im Klick-Task, und
           `signInWithPopup` wartet vorher auf Googles Iframe-Helfer. Das
           Vorwärmen (googlePopupWarmup.ts) verkürzt das nur. Eine Navigation
           braucht keine Nutzer-Aktivierung, also schalten wir selbst auf den
           Redirect um. */
        Sentry.captureMessage('Google-Popup geblockt — Wechsel auf Redirect', {
          level: 'info',
          tags: { auth_flow: 'google_popup', auth_error_code: code, auth_fallback: 'redirect' },
          extra: { host: window.location.host },
        });
        /* Der Redirect kehrt zur AKTUELLEN Adresse zurueck — mitsamt dem, was
             der Aufrufer als `returnTo` mitgibt (etwa `?r=<slug>`, damit der
             offene Spot nach der Rueckkehr wieder offen ist). */
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

      /* Immer melden, auch den Abbruch, nur leiser: `benign` entscheidet, ob
         der Leser eine Meldung sieht, nicht ob wir eine bekommen. Ein
         zugegangenes Fenster sieht gleich aus, ob es der Leser war oder die
         Übergabe. */
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
    endingSessions += 1;
    try {
      await enqueueSessionMutation(async () => {
        await clearPremiumAccess();
        await firebaseSignOut(auth);
      });
    } finally {
      endingSessions -= 1;
    }
  }, []);

  const updateDisplayName = useCallback(async (name: string): Promise<void> => {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Not authenticated');
    await updateProfile(currentUser, { displayName: name });
    // Preserve the SDK instance, including its prototype methods.
    if (auth.currentUser === currentUser) setIdentity({ user: currentUser });
  }, []);

  const deleteAccount = useCallback(async (): Promise<void> => {
    if (!auth.currentUser) throw new Error('Not authenticated');
    clearMapDataCaches();
    const currentUser = auth.currentUser;
    endingSessions += 1;
    try {
      await enqueueSessionMutation(async () => {
        await clearPremiumAccess();
        await deleteUser(currentUser);
      });
    } finally {
      endingSessions -= 1;
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: identity.user,
      loading,
      firebaseUid,
      isAdmin,
      prepareGoogleSignIn,
      signInWithGoogle,
      signOut,
      updateDisplayName,
      deleteAccount,
    }),
    [
      identity,
      loading,
      firebaseUid,
      isAdmin,
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
