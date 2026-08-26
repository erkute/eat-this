// @vitest-environment jsdom
import { describe, expect, it, afterEach, vi } from 'vitest';

/** Setzt window.location.hostname/host für einen Testfall. */
function at(host: string) {
  const [hostname] = host.split(':');
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, host, hostname },
  });
}

afterEach(() => {
  vi.resetModules();
});

async function sameOriginAuthDomain() {
  vi.resetModules();
  vi.doMock('@/lib/env', () => ({ isStaging: false }));
  vi.doMock('firebase/app', () => ({
    initializeApp: () => ({ name: '[DEFAULT]', options: { projectId: 'eat-this-8a13b' } }),
    getApps: () => [],
  }));
  vi.doMock('firebase/auth', () => ({
    getAuth: () => ({}),
    initializeAuth: () => ({}),
    browserLocalPersistence: {},
    indexedDBLocalPersistence: {},
  }));
  vi.doMock('./project-boundary', () => ({
    assertFirebaseProjectBoundary: () => {},
    PRODUCTION_FIREBASE_PROJECT_ID: 'eat-this-8a13b',
  }));
  const mod = await import('./config');
  return mod.sameOriginAuthDomain();
}

describe('sameOriginAuthDomain', () => {
  it('nimmt die eigene Domain auf prod', () => {
    at('www.eatthisdot.com');
    return expect(sameOriginAuthDomain()).resolves.toBe('www.eatthisdot.com');
  });

  it('nimmt sie auch auf Staging — dort lag der Fehler', async () => {
    /* Staging initialisiert aus der App-Hosting-Auto-Config, deren authDomain
       auf eat-this-staging-8a13b.firebaseapp.com zeigt. Der Popup lief damit
       cross-origin und schloss sich wieder, ohne jemanden anzumelden (User,
       26.08.2026) — obwohl der Proxy unter /__/ dort nachweislich antwortet. */
    at('eat-this-staging--eat-this-staging-8a13b.us-central1.hosted.app');
    await expect(sameOriginAuthDomain()).resolves.toBe(
      'eat-this-staging--eat-this-staging-8a13b.us-central1.hosted.app'
    );
  });

  it('lässt localhost in Ruhe', async () => {
    /* Der SDK baut https://{authDomain}/__/auth/iframe — "localhost:3000"
       zeigte damit auf HTTPS, während next dev HTTP ausliefert. */
    at('localhost:3000');
    await expect(sameOriginAuthDomain()).resolves.toBeNull();
    at('127.0.0.1:3011');
    await expect(sameOriginAuthDomain()).resolves.toBeNull();
  });
});
