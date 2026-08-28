// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

/* vi.mock-Factories laufen vor allem anderen — die Doubles müssen deshalb
   durch vi.hoisted, sonst greift die Factory auf uninitialisierte Variablen. */
const mocks = vi.hoisted(() => ({
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(),
  getRedirectResult: vi.fn(),
  resolver: { marker: 'popup-redirect-resolver' },
}));

vi.mock('firebase/auth', () => ({
  browserPopupRedirectResolver: mocks.resolver,
  getRedirectResult: mocks.getRedirectResult,
  onIdTokenChanged: (_auth: unknown, cb: (u: null) => void) => {
    cb(null);
    return () => {};
  },
  signInWithPopup: mocks.signInWithPopup,
  signInWithRedirect: mocks.signInWithRedirect,
  GoogleAuthProvider: class {
    setCustomParameters() {}
  },
  signOut: vi.fn(),
  updateProfile: vi.fn(),
  deleteUser: vi.fn(),
}));
vi.mock('@/lib/firebase/config', () => ({
  auth: { app: { options: { authDomain: 'www.eatthisdot.com' }, name: '[DEFAULT]' } },
}));
vi.mock('@sentry/nextjs', () => ({ captureException: vi.fn(), captureMessage: vi.fn() }));
vi.mock('@/lib/map/map-data-cache', () => ({
  clearMapDataCaches: vi.fn(),
  reconcileMapDataCacheIdentity: vi.fn(),
}));
vi.mock('./googlePopupWarmup', () => ({ warmGooglePopup: vi.fn() }));

import { AuthProvider, useAuth } from './AuthContext';

function blockedError() {
  return Object.assign(new Error('popup blocked'), { code: 'auth/popup-blocked' });
}

async function mountAuth() {
  const hook = renderHook(() => useAuth(), { wrapper: AuthProvider });
  await waitFor(() => expect(hook.result.current).toBeTruthy());
  return hook;
}

describe('signInWithGoogle — wenn der Browser das Fenster blockt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.signInWithRedirect.mockResolvedValue(undefined);
    mocks.getRedirectResult.mockResolvedValue(null);
    global.fetch = vi.fn(() => Promise.resolve({ ok: true } as Response));
    window.history.replaceState(null, '', '/');
  });

  /* Der Kern der Sache: auf iOS Safari kommt `auth/popup-blocked` auch dann,
     wenn vorgewärmt wurde — das Vorwärmen verkürzt die Wartezeit, garantiert
     sie aber nicht weg (Nutzer, 28.08.2026). Eine Navigation braucht keine
     Nutzer-Aktivierung und trägt deshalb auch dann noch. */
  it('schaltet auf den Redirect um, statt den Fehler durchzureichen', async () => {
    mocks.signInWithPopup.mockRejectedValueOnce(blockedError());
    const { result } = await mountAuth();

    await act(async () => {
      await result.current.signInWithGoogle();
    });

    expect(mocks.signInWithRedirect).toHaveBeenCalledTimes(1);
    // Mit unserem Resolver — die Auth-Instanz hat selbst keinen.
    expect(mocks.signInWithRedirect.mock.calls[0][2]).toBe(mocks.resolver);
  });

  /* Wer von einem gesperrten Spot kommt, muss nach der Rückkehr noch eingelöst
     werden. Diesen Code-Pfad erlebt die Rückkehr nicht mehr — die Seite
     navigiert vorher weg. Also muss die Adresse den Marker tragen. */
  it('hinterlässt die Rückkehr-Adresse, bevor es navigiert', async () => {
    mocks.signInWithPopup.mockRejectedValueOnce(blockedError());
    const { result } = await mountAuth();

    await act(async () => {
      await result.current.signInWithGoogle({ returnTo: '/map?r=hallmann&claim=1' });
    });

    expect(window.location.pathname + window.location.search).toBe('/map?r=hallmann&claim=1');
    expect(mocks.signInWithRedirect).toHaveBeenCalledTimes(1);
  });

  it('lässt echte Fehler weiterhin durch, ohne zu navigieren', async () => {
    // auth/unauthorized-domain heisst etwas völlig anderes und wäre per
    // Redirect genauso kaputt — hier hilft nur die Meldung.
    mocks.signInWithPopup.mockRejectedValueOnce(
      Object.assign(new Error('nope'), { code: 'auth/unauthorized-domain' })
    );
    const { result } = await mountAuth();

    await expect(
      act(async () => {
        await result.current.signInWithGoogle();
      })
    ).rejects.toThrow();
    expect(mocks.signInWithRedirect).not.toHaveBeenCalled();
  });

  it('holt beim Start ein Redirect-Ergebnis ab', async () => {
    await mountAuth();
    await waitFor(() => expect(mocks.getRedirectResult).toHaveBeenCalled());
    expect(mocks.getRedirectResult.mock.calls[0][1]).toBe(mocks.resolver);
  });
});
