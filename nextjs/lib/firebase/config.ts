// Firebase client-side config — these values are public by design.
// Firebase security is enforced via Security Rules, not key secrecy.
// See: https://firebase.google.com/docs/projects/api-keys

import { initializeApp, getApps } from 'firebase/app';
import {
  browserLocalPersistence,
  getAuth,
  indexedDBLocalPersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { isStaging } from '@/lib/env';
import { assertFirebaseProjectBoundary, PRODUCTION_FIREBASE_PROJECT_ID } from './project-boundary';

// authDomain: the auth helper (/__/auth/*) is reverse-proxied through our own
// domain (see rewrites() in next.config.ts), so the popup is SAME-origin — no
// COOP/storage-access breakage — and the Google consent screen shows our host
// instead of the firebaseapp.com project domain. (An earlier
// auth.eatthisdot.com subdomain attempt failed because the credential return
// was still cross-origin; same-origin avoids that entirely.)
//
// This used to apply to www.eatthisdot.com ALONE, and staging paid for it: it
// initialises from App Hosting's auto-config, whose authDomain is
// `eat-this-staging-8a13b.firebaseapp.com`, so its popup ran the very
// cross-origin flow the paragraph above calls broken — it opened, did
// something, and closed again without signing anyone in (user report,
// 2026-08-26). The proxy was there all along: `/__/firebase/init.json` and
// `/__/auth/iframe` both answer 200 through the staging host, and
// `firebaseAuthProjectId` in next.config.ts already points it at the right
// project. Only authDomain never used it.
//
// So the rule is now the deployment-wide one it should always have been: on
// any host we serve ourselves, the auth domain IS that host.
//
// Local dev is the exception, and not a cosmetic one: the SDK builds helper
// URLs as https://{authDomain}/__/auth/iframe, so "localhost:3000" would
// resolve to https://localhost:3000 while `next dev` serves plain HTTP.
const PROD_HOST = 'www.eatthisdot.com';
const FALLBACK_AUTH_DOMAIN = 'eat-this-8a13b.firebaseapp.com';

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

/** The host serving this page, when it is one of ours; otherwise null. */
export function sameOriginAuthDomain(): string | null {
  if (typeof window === 'undefined') return null;
  return isLocalHost(window.location.hostname) ? null : window.location.host;
}

const authDomain =
  typeof window !== 'undefined' && window.location.hostname === PROD_HOST
    ? window.location.host
    : FALLBACK_AUTH_DOMAIN;

const productionFirebaseConfig = {
  apiKey: 'AIzaSyDs0361Db_lwHGW9WZfT5ivj-WIB4fyUw0',
  authDomain,
  projectId: PRODUCTION_FIREBASE_PROJECT_ID,
  storageBucket: 'eat-this-8a13b.firebasestorage.app',
  messagingSenderId: '768781457409',
  appId: '1:768781457409:web:607ff46bfa4599d6b08800',
};

const explicitFirebaseValues = [
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
];
const hasAnyExplicitFirebaseValue = explicitFirebaseValues.some(Boolean);
const hasAllExplicitFirebaseValues = explicitFirebaseValues.every(Boolean);

if (hasAnyExplicitFirebaseValue && !hasAllExplicitFirebaseValues) {
  throw new Error('Incomplete NEXT_PUBLIC_FIREBASE_* configuration');
}

/** Name of the second app instance that carries the corrected auth domain. */
const SAME_ORIGIN_APP = 'same-origin-auth';

const explicitFirebaseConfig = hasAllExplicitFirebaseValues
  ? {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
    }
  : null;

// Singleton guard — prevents duplicate app initialization during Next.js hot-reload.
// App Hosting auto-populates no-argument Firebase JS initialization for its
// associated web app. Staging deliberately uses that project-local config;
// falling back to production there would silently reconnect Auth/Firestore.
const baseApp =
  getApps().length > 0
    ? getApps()[0]
    : explicitFirebaseConfig
      ? initializeApp(explicitFirebaseConfig)
      : isStaging
        ? initializeApp()
        : initializeApp(productionFirebaseConfig);

/* Correct the auth domain to our own host wherever the base config points
   somewhere else — which is exactly the App-Hosting auto-config case, i.e.
   staging. Deliberately NOT a second copy of the staging keys in this repo:
   whatever App Hosting injects stays authoritative, and only the one field
   that breaks the popup is overridden. A named second app is the only way to
   change an option after the fact; initialising one opens no connections. */
const desiredAuthDomain = sameOriginAuthDomain();
const app =
  desiredAuthDomain && baseApp.options.authDomain !== desiredAuthDomain
    ? (getApps().find((a) => a.name === SAME_ORIGIN_APP) ??
      initializeApp({ ...baseApp.options, authDomain: desiredAuthDomain }, SAME_ORIGIN_APP))
    : baseApp;

assertFirebaseProjectBoundary({
  actualProjectId: app.options.projectId,
  expectedProjectId: process.env.NEXT_PUBLIC_FIREBASE_EXPECTED_PROJECT_ID,
  staging: isStaging,
  surface: 'client',
});

/* Auth WITHOUT the default popup/redirect resolver.
 *
 * getAuth() bundles Firebase's browserPopupRedirectResolver, and that resolver
 * loads Google's gapi bridge — apis.google.com/js/api.js plus the
 * {authDomain}/__/auth/iframe helper — on every page, for every visitor,
 * before the consent dialog has been answered and whether or not anyone ever
 * signs in. The cookie banner tells people Google Sign-In loads "only when you
 * use it", so it also has to be true.
 *
 * initializeAuth keeps the resolver out; the one flow that needs it passes
 * browserPopupRedirectResolver explicitly (lib/auth/AuthContext.tsx). Email
 * -link sign-in (/welcome) never needed it.
 *
 * Persistence has to be spelled out here: initializeAuth defaults to in-memory,
 * which would sign everyone out on reload. These two are exactly what getAuth()
 * would have picked.
 */
function initAuth(): Auth {
  // Server render: no popup machinery exists to avoid, and initializeAuth's
  // browser persistences would throw.
  if (typeof window === 'undefined') return getAuth(app);
  try {
    return initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    });
  } catch {
    // Already initialized — hot reload, or a second importer racing this one.
    // getAuth returns the existing instance as-is; it does not bolt the
    // resolver onto an auth that was created without one.
    return getAuth(app);
  }
}

export const auth = initAuth();

// Lazy Firestore. A static `getFirestore(app)` pulls the ~85 KB gzip
// firebase/firestore SDK into every route's first-load via the global
// AuthProvider, even though only a handful of hooks ever read Firestore.
// getDb() code-splits the SDK behind a dynamic import and memoizes the
// instance, so callers `await getDb()` (alongside a dynamic
// `import('firebase/firestore')` for the query fns) on demand. Auth stays
// eager — login state is needed on first paint.
let _dbPromise: Promise<Firestore> | null = null;
export function getDb(): Promise<Firestore> {
  if (!_dbPromise) {
    _dbPromise = import('firebase/firestore')
      .then(({ getFirestore }) => getFirestore(app))
      .catch((error: unknown) => {
        // A transient chunk/init failure must not poison every Firestore flow
        // until the next full page load. The next caller gets a fresh attempt.
        _dbPromise = null;
        throw error;
      });
  }
  return _dbPromise;
}

// Dev-only debug hook so the entitlements smoke test in
// /api/_debug/whoami can be exercised from the browser console:
//   await window.__auth.currentUser.getIdToken()
if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
  (window as unknown as { __auth: typeof auth }).__auth = auth;
}
