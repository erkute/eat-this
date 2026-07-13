// Firebase client-side config — these values are public by design.
// Firebase security is enforced via Security Rules, not key secrecy.
// See: https://firebase.google.com/docs/projects/api-keys

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { isStaging } from '@/lib/env';
import {
  assertFirebaseProjectBoundary,
  PRODUCTION_FIREBASE_PROJECT_ID,
} from './project-boundary'

// authDomain: on production the auth helper (/__/auth/*) is reverse-proxied
// through our own domain (see rewrites() in next.config.ts), so the popup is
// SAME-origin — no COOP/storage-access breakage — and the Google consent
// screen shows "Weiter zu eatthisdot.com" instead of the firebaseapp.com
// project domain. (An earlier auth.eatthisdot.com subdomain attempt failed
// because the credential return was still cross-origin; same-origin avoids
// that entirely.)
//
// Keep local dev on the Firebase domain: the Firebase Auth SDK builds helper
// iframe URLs as https://{authDomain}/__/auth/iframe, so authDomain
// "localhost:3000" points at https://localhost:3000 while next dev serves HTTP.
const PROD_HOST = 'www.eatthisdot.com';
const authDomain =
  typeof window !== 'undefined' && window.location.hostname === PROD_HOST
    ? window.location.host
    : 'eat-this-8a13b.firebaseapp.com';

const productionFirebaseConfig = {
  apiKey:            'AIzaSyDs0361Db_lwHGW9WZfT5ivj-WIB4fyUw0',
  authDomain,
  projectId:         PRODUCTION_FIREBASE_PROJECT_ID,
  storageBucket:     'eat-this-8a13b.firebasestorage.app',
  messagingSenderId: '768781457409',
  appId:             '1:768781457409:web:607ff46bfa4599d6b08800',
};

const explicitFirebaseValues = [
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
]
const hasAnyExplicitFirebaseValue = explicitFirebaseValues.some(Boolean)
const hasAllExplicitFirebaseValues = explicitFirebaseValues.every(Boolean)

if (hasAnyExplicitFirebaseValue && !hasAllExplicitFirebaseValues) {
  throw new Error('Incomplete NEXT_PUBLIC_FIREBASE_* configuration')
}

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
const app = getApps().length > 0
  ? getApps()[0]
  : explicitFirebaseConfig
    ? initializeApp(explicitFirebaseConfig)
    : isStaging
      ? initializeApp()
      : initializeApp(productionFirebaseConfig);

assertFirebaseProjectBoundary({
  actualProjectId: app.options.projectId,
  expectedProjectId: process.env.NEXT_PUBLIC_FIREBASE_EXPECTED_PROJECT_ID,
  staging: isStaging,
  surface: 'client',
})

export const auth        = getAuth(app);

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
