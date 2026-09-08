// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { User } from 'firebase/auth';

/* vi.mock-Factories laufen vor allem anderen — die Doubles müssen deshalb
   durch vi.hoisted. */
const mocks = vi.hoisted(() => ({
  getRedirectResult: vi.fn(),
  captureException: vi.fn(),
  /** Der Rückruf, den AuthProvider bei onIdTokenChanged hinterlegt. */
  emitIdToken: null as null | ((user: User | null) => void),
}));

vi.mock('firebase/auth', () => ({
  browserPopupRedirectResolver: {},
  getRedirectResult: mocks.getRedirectResult,
  onIdTokenChanged: (_auth: unknown, cb: (user: User | null) => void) => {
    mocks.emitIdToken = cb;
    return () => {};
  },
  signInWithPopup: vi.fn(),
  signInWithRedirect: vi.fn(),
  GoogleAuthProvider: class {
    setCustomParameters() {}
  },
  signOut: vi.fn(),
  updateProfile: vi.fn(),
  deleteUser: vi.fn(),
}));
vi.mock('@/lib/firebase/config', () => ({ auth: {} }));
vi.mock('@sentry/nextjs', () => ({
  captureException: mocks.captureException,
  captureMessage: vi.fn(),
}));
vi.mock('@/lib/map/map-data-cache', () => ({
  clearMapDataCaches: vi.fn(),
  reconcileMapDataCacheIdentity: vi.fn(),
}));
vi.mock('./googlePopupWarmup', () => ({ warmGooglePopup: vi.fn() }));

import { AuthProvider, useAuth } from './AuthContext';

const signedIn = {
  uid: 'u-1',
  displayName: 'Lukas',
  getIdToken: vi.fn().mockResolvedValue('id-token'),
} as unknown as User;

/** Sammelt die Aufrufe an /api/auth/premium-access nach Methode. */
function stubPremiumAccess(outcomes: ('ok' | 'fail')[]) {
  const calls: string[] = [];
  const queue = [...outcomes];
  const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    calls.push(method);
    // DELETE ist der Aufräum-Versuch, nicht der Sync — er hat seine eigene
    // Antwort und darf die Reihenfolge der Sync-Versuche nicht verbrauchen.
    if (method === 'DELETE') return Promise.resolve({ ok: true } as Response);
    const next = queue.shift() ?? 'ok';
    if (next === 'fail') return Promise.reject(new Error('network blip'));
    return Promise.resolve({ ok: true } as Response);
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return { calls, fetchMock };
}

function mountAuth() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider });
}

describe('AuthContext — Sync der Bild-Sitzung', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.emitIdToken = null;
    mocks.getRedirectResult.mockResolvedValue(null);
  });

  /* Der Aufruf fällt typischerweise genau dann aus, wenn er am wichtigsten
     ist: direkt nach dem Magic-Link-Redirect. Ein einzelner Aussetzer darf
     keine Anmeldung kosten. */
  it('wiederholt den Sync einmal und meldet den Aussetzer nicht', async () => {
    const { calls } = stubPremiumAccess(['fail', 'ok']);
    const { result } = mountAuth();
    await waitFor(() => expect(mocks.emitIdToken).toBeTypeOf('function'));

    await act(async () => {
      mocks.emitIdToken!(signedIn);
    });

    await waitFor(() => expect(result.current.user).toBe(signedIn));
    expect(result.current.loading).toBe(false);
    expect(calls.filter((m) => m === 'POST')).toHaveLength(2);
    expect(mocks.captureException).not.toHaveBeenCalled();
  });

  /* Der Kern der Sache: die Bild-Sitzung ist ein Nebenaufruf. Vorher setzte
     ein einziger Fehlschlag den Nutzer auf null — die App zeigte „nicht
     angemeldet", während Firebase die Sitzung hielt, und der Zustand löste
     sich erst beim Token-Refresh eine Stunde später. */
  it('behält den angemeldeten Zustand, wenn auch der zweite Versuch scheitert', async () => {
    const { calls } = stubPremiumAccess(['fail', 'fail']);
    const { result } = mountAuth();
    await waitFor(() => expect(mocks.emitIdToken).toBeTypeOf('function'));

    await act(async () => {
      mocks.emitIdToken!(signedIn);
    });

    await waitFor(() => expect(result.current.user).toBe(signedIn));
    expect(result.current.loading).toBe(false);
    expect(calls.filter((m) => m === 'POST')).toHaveLength(2);
    // Die Sitzung des vorigen Kontos bleibt trotzdem nicht stehen.
    expect(calls).toContain('DELETE');
  });

  it('meldet den Fehlschlag an Sentry, statt ihn zu verschlucken', async () => {
    stubPremiumAccess(['fail', 'fail']);
    const { result } = mountAuth();
    await waitFor(() => expect(mocks.emitIdToken).toBeTypeOf('function'));

    await act(async () => {
      mocks.emitIdToken!(signedIn);
    });

    await waitFor(() => expect(mocks.captureException).toHaveBeenCalled());
    const [, options] = mocks.captureException.mock.calls[0];
    expect(options.tags.auth_flow).toBe('premium_access_sync');
    expect(options.tags.auth_sync_target).toBe('signed_in');
    expect(result.current.user).toBe(signedIn);
  });

  it('bleibt abgemeldet, wenn das Abmelden selbst den Sync verliert', async () => {
    // Beim Abmelden ist der Sync ein DELETE — hier scheitert also genau der.
    const fetchMock = vi.fn(() => Promise.reject(new Error('offline')));
    global.fetch = fetchMock as unknown as typeof fetch;
    const { result } = mountAuth();
    await waitFor(() => expect(mocks.emitIdToken).toBeTypeOf('function'));

    await act(async () => {
      mocks.emitIdToken!(null);
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    await waitFor(() => expect(mocks.captureException).toHaveBeenCalled());
    expect(mocks.captureException.mock.calls[0][1].tags.auth_sync_target).toBe('signed_out');
  });
});
