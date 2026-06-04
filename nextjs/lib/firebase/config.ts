// Firebase client-side config — these values are public by design.
// Firebase security is enforced via Security Rules, not key secrecy.
// See: https://firebase.google.com/docs/projects/api-keys

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// authDomain: on production the auth helper (/__/auth/*) is reverse-proxied
// through our own domain (see rewrites() in next.config.ts), so the popup is
// SAME-origin — no COOP/storage-access breakage — and the Google consent
// screen shows "Weiter zu eatthisdot.com" instead of the firebaseapp.com
// project domain. (An earlier auth.eatthisdot.com subdomain attempt failed
// because the credential return was still cross-origin; same-origin avoids
// that entirely.) Everywhere else (localhost, staging) we keep the default
// domain — only the production handler URL is registered as an OAuth
// redirect URI in Google Cloud Console.
const PROD_HOST = 'www.eatthisdot.com';
const authDomain =
  typeof window !== 'undefined' && window.location.hostname === PROD_HOST
    ? PROD_HOST
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
export const db          = getFirestore(app);
export const functions   = getFunctions(app);
export const functionsEU = getFunctions(app, 'europe-west1');

// Dev-only debug hook so the entitlements smoke test in
// /api/_debug/whoami can be exercised from the browser console:
//   await window.__auth.currentUser.getIdToken()
if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
  (window as unknown as { __auth: typeof auth }).__auth = auth;
}
