import { expect, type APIRequestContext, type BrowserContext } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { parse } from 'dotenv';

const project = 'demo-eat-this-quality';
const authHost = '127.0.0.1:9099';
const firestoreHost = '127.0.0.1:8089';

/** These tests can never send an account write to a deployed app. */
export function requireEmulators(baseURL: string | undefined) {
  if (!baseURL || !['127.0.0.1', 'localhost'].includes(new URL(baseURL).hostname)
    || process.env.FIREBASE_ADMIN_PROJECT_ID !== project
    || process.env.FIREBASE_AUTH_EMULATOR_HOST !== authHost
    || process.env.FIRESTORE_EMULATOR_HOST !== firestoreHost) {
    throw new Error('Account browser tests require the loopback app and isolated demo Firebase emulators');
  }
}

export function clientApiKey() {
  const env = existsSync('.env.local') ? parse(readFileSync('.env.local')) : {};
  return process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? env.NEXT_PUBLIC_FIREBASE_API_KEY
    ?? readFileSync('lib/firebase/config.ts', 'utf8').match(/apiKey: '([^']+)'/)![1];
}

/** Block any real Firebase transport in a demo browser build. */
export async function emulatorRoutes(context: BrowserContext) {
  await context.route(/^https:\/\/(identitytoolkit|securetoken|firestore)\.googleapis\.com\//, route => route.abort());
}

export async function createAccount(request: APIRequestContext) {
  const email = `browser-${crypto.randomUUID()}@example.invalid`;
  const response = await request.post(`http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${clientApiKey()}`, {
    data: { email, password: 'local-emulator-test-only', returnSecureToken: true },
  });
  expect(response.ok()).toBe(true);
  const account = await response.json() as { localId: string; idToken: string; refreshToken: string; email: string };
  return { ...account, email };
}

export async function restoreAccount(context: BrowserContext, account: Awaited<ReturnType<typeof createAccount>>) {
  await emulatorRoutes(context);
  await context.addInitScript(({ account, apiKey }) => {
    localStorage.setItem(`firebase:authUser:${apiKey}:[DEFAULT]`, JSON.stringify({
      uid: account.localId, email: account.email, emailVerified: false, displayName: 'Browser Test',
      isAnonymous: false, providerData: [], createdAt: String(Date.now()), lastLoginAt: String(Date.now()),
      stsTokenManager: { refreshToken: account.refreshToken, accessToken: account.idToken, expirationTime: Date.now() + 3600000 },
      apiKey, appName: '[DEFAULT]',
    }));
    sessionStorage.setItem(`starterPackFired:${account.localId}`, '1');
    sessionStorage.setItem(`referralConfirmFired:${account.localId}`, '1');
  }, { account, apiKey: clientApiKey() });
}

export async function readDocument(request: APIRequestContext, path: string) {
  const response = await request.get(`http://${firestoreHost}/v1/projects/${project}/databases/(default)/documents/${path}`, {
    headers: { Authorization: 'Bearer owner' },
  });
  if (response.status() === 404) return null;
  expect(response.ok()).toBe(true);
  return (await response.json()).fields as Record<string, { integerValue?: string; stringValue?: string; arrayValue?: { values?: { stringValue: string }[] } }>;
}
