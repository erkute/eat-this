// Firebase client-side config — these values are public by design.
// Firebase security is enforced via Security Rules, not key secrecy.
// See: https://firebase.google.com/docs/projects/api-keys

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// authDomain uses the default Firebase domain (not auth.eatthisdot.com) for
// reliable signInWithPopup — the custom domain breaks cross-origin credential
// return under modern browser COOP/storage-access rules.
const firebaseConfig = {
  apiKey:            'AIzaSyDs0361Db_lwHGW9WZfT5ivj-WIB4fyUw0',
  authDomain:        'eat-this-8a13b.firebaseapp.com',
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
