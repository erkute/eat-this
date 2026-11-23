// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: { emulatorConfig: null },
  connectAuth: vi.fn(), connectFirestore: vi.fn(), initializeFirestore: vi.fn(),
  db: { kind: 'firestore' },
}));
vi.mock('firebase/app', () => ({
  getApps: () => [], initializeApp: (options: object) => ({ options }),
}));
vi.mock('firebase/auth', () => ({
  browserLocalPersistence: {}, indexedDBLocalPersistence: {},
  initializeAuth: () => mocks.auth, getAuth: () => mocks.auth,
  connectAuthEmulator: mocks.connectAuth,
}));
vi.mock('firebase/firestore', () => ({
  getFirestore: () => mocks.db, initializeFirestore: mocks.initializeFirestore, connectFirestoreEmulator: mocks.connectFirestore,
}));
vi.mock('@/lib/env', () => ({ isStaging: false }));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.initializeFirestore.mockReturnValue(mocks.db);
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_EMULATORS', 'true');
  for (const [key, value] of Object.entries({
    API_KEY: 'demo-key', AUTH_DOMAIN: 'demo-eat-this-quality.firebaseapp.com',
    PROJECT_ID: 'demo-eat-this-quality', STORAGE_BUCKET: 'demo-eat-this-quality.firebasestorage.app',
    MESSAGING_SENDER_ID: '123', APP_ID: 'demo-app',
  })) vi.stubEnv(`NEXT_PUBLIC_FIREBASE_${key}`, value);
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_EXPECTED_PROJECT_ID', '');
  vi.stubGlobal('window', { location: { hostname: '127.0.0.1', host: '127.0.0.1:3100' } });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it('connects the demo browser to loopback and shares one lazy Firestore instance', async () => {
  const { getDb } = await import('../config');
  expect(mocks.connectAuth).toHaveBeenCalledWith(mocks.auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  await expect(getDb()).resolves.toBe(mocks.db);
  await expect(getDb()).resolves.toBe(mocks.db);
  expect(mocks.connectFirestore).toHaveBeenCalledExactlyOnceWith(mocks.db, '127.0.0.1', 8089);
});

it('rejects emulator configuration pointing at production', async () => {
  vi.stubEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', 'eat-this-8a13b');
  await expect(import('../config')).rejects.toThrow('Firebase emulators require the demo project on loopback');
  expect(mocks.connectAuth).not.toHaveBeenCalled();
});

it('rejects an emulator build served outside loopback', async () => {
  vi.stubGlobal('window', { location: { hostname: 'www.eatthisdot.com', host: 'www.eatthisdot.com' } });
  await expect(import('../config')).rejects.toThrow('Firebase emulators require the demo project on loopback');
});

it('keeps HTTPS browser emulator connections on the local TLS origin', async () => {
  vi.stubGlobal('window', { location: {
    hostname: '127.0.0.1', host: '127.0.0.1:3101', protocol: 'https:', origin: 'https://127.0.0.1:3101',
  } });
  const { getDb } = await import('../config');
  await expect(getDb()).resolves.toBe(mocks.db);
  expect(mocks.connectAuth).toHaveBeenCalledWith(mocks.auth, 'https://127.0.0.1:3101', { disableWarnings: true });
  expect(mocks.initializeFirestore).toHaveBeenCalledWith(expect.anything(), { host: '127.0.0.1:3101', ssl: true });
  expect(mocks.connectFirestore).not.toHaveBeenCalled();
});
