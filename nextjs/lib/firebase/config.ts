// Firebase client-side config — these values are public by design.
// Firebase security is enforced via Security Rules, not key secrecy.
// See: https://firebase.google.com/docs/projects/api-keys

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';

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
export const functions   = getFunctions(app);
export const functionsEU = getFunctions(app, 'europe-west1');
