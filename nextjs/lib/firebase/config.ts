// Firebase client-side config — these values are public by design.
// Firebase security is enforced via Security Rules, not key secrecy.
// See: https://firebase.google.com/docs/projects/api-keys

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';

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

const firebaseConfig = {
  apiKey:            'AIzaSyDs0361Db_lwHGW9WZfT5ivj-WIB4fyUw0',
  authDomain,
  projectId:         'eat-this-8a13b',
  storageBucket:     'eat-this-8a13b.firebasestorage.app',
  messagingSenderId: '768781457409',
  appId:             '1:768781457409:web:607ff46bfa4599d6b08800',
};

// Singleton guard — prevents duplicate app initialization during Next.js hot-reload.
const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

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
    _dbPromise = import('firebase/firestore').then(({ getFirestore }) => getFirestore(app));
  }
  return _dbPromise;
}

// Dev-only debug hook so the entitlements smoke test in
// /api/_debug/whoami can be exercised from the browser console:
//   await window.__auth.currentUser.getIdToken()
if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
  (window as unknown as { __auth: typeof auth }).__auth = auth;
}
