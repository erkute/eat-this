// js/notifications.js — Push Notifications via Firebase Cloud Messaging (FCM)
// Shows "New must-eat in Berlin" push when admins publish new content via Sanity.

import { getApps } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getMessaging, getToken, onMessage } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore, doc, setDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

// VAPID key from Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
const VAPID_KEY = 'JwC2NsKvKXRH7dYKS-5P5PVEY2jUdIDfomEfU_HmeBk'; 
const app       = getApps()[0];
const auth      = getAuth(app);
const db        = getFirestore(app);
let   messaging = null;

// FCM requires a service worker — reuse existing sw.js
try {
  messaging = getMessaging(app);
} catch {
  // Messaging not supported in this browser (e.g. Safari < 16)
}

// ─── Request permission & register token ─────────────────────────────────────
async function subscribeToPush(uid) {
  if (!messaging || !VAPID_KEY) return;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  try {
    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (token) {
      // Store token in Firestore so Cloud Functions can send to this device
      await setDoc(doc(db, 'pushTokens', uid), {
        token,
        updatedAt: Date.now(),
        userAgent: navigator.userAgent,
      });
    }
  } catch {
    // Silently ignore — push is non-critical
  }
}

async function unsubscribeFromPush(uid) {
  if (!messaging) return;
  try {
    await deleteDoc(doc(db, 'pushTokens', uid));
  } catch { /* ignore */ }
}

// Subscribe when user logs in, unsubscribe on logout
onAuthStateChanged(auth, (user) => {
  if (user) {
    subscribeToPush(user.uid);
  } else {
    // Don't unsubscribe on logout — token stays valid for anonymous pushes
  }
});

// ─── Handle foreground messages ───────────────────────────────────────────────
// When app is open, FCM delivers via onMessage instead of SW push event
if (messaging) {
  onMessage(messaging, (payload) => {
    const title = payload.notification?.title ?? 'EAT THIS';
    const body  = payload.notification?.body  ?? '';
    if (typeof window.showNotification === 'function') {
      window.showNotification(`${title}: ${body}`);
    }
  });
}

export { subscribeToPush, unsubscribeFromPush };
