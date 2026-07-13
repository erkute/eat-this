// Firebase Admin SDK — server-side only.
// Used to generate sign-in-with-email links so we can send the email
// ourselves via Resend with a fully branded HTML template.

import { initializeApp, getApps, cert, applicationDefault, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';
import { isStaging } from '@/lib/env'
import { assertFirebaseProjectBoundary } from './project-boundary'

let adminApp: App | null = null;

function getAdminApp(): App {
  if (adminApp) return adminApp;

  const existing = getApps();
  if (existing.length > 0) {
    adminApp = existing[0];
    assertAdminProjectBoundary(adminApp)
    return adminApp;
  }

  const projectId   = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  const hasAnyExplicitCredential = Boolean(clientEmail || privateKey);
  if (hasAnyExplicitCredential && (!projectId || !clientEmail || !privateKey)) {
    throw new Error('Incomplete explicit Firebase Admin credentials in env');
  }

  // App Hosting injects FIREBASE_CONFIG and makes the backend's own service
  // account available through Application Default Credentials. Keeping that
  // project-local identity is the staging/production security boundary; a
  // reusable service-account private key would let one environment cross it.
  // Explicit credentials remain supported for local CLI development only.
  if (hasAnyExplicitCredential) {
    adminApp = initializeApp({
      credential: cert({ projectId: projectId!, clientEmail: clientEmail!, privateKey: privateKey! }),
      projectId,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? `${projectId}.firebasestorage.app`,
    })
  } else if (projectId || process.env.FIREBASE_STORAGE_BUCKET) {
    adminApp = initializeApp({
      credential: applicationDefault(),
      ...(projectId ? { projectId } : {}),
      ...(process.env.FIREBASE_STORAGE_BUCKET
        ? { storageBucket: process.env.FIREBASE_STORAGE_BUCKET }
        : {}),
    })
  } else {
    // App Hosting supplies FIREBASE_CONFIG and ADC automatically.
    adminApp = initializeApp()
  }
  assertAdminProjectBoundary(adminApp)
  return adminApp;
}

function assertAdminProjectBoundary(app: App): void {
  assertFirebaseProjectBoundary({
    actualProjectId:
      app.options.projectId ??
      process.env.GOOGLE_CLOUD_PROJECT ??
      process.env.GCLOUD_PROJECT,
    expectedProjectId: process.env.FIREBASE_EXPECTED_PROJECT_ID,
    staging: isStaging,
    surface: 'admin',
  })
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminFirestore(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminStorage(): Storage {
  return getStorage(getAdminApp());
}
