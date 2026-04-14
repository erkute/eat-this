// js/packs.js — loads unlocked pack slugs from Firestore into window._userUnlockedPacks
// Calls window._renderDeck() after loading so the profile deck stays in sync.

import {
  getFirestore,
  collection,
  getDocs,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getApps } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';

const db   = getFirestore(getApps()[0]);
const auth = getAuth(getApps()[0]);

window._userUnlockedPacks = new Set();

async function loadUserPacks(uid) {
  try {
    const snap = await getDocs(collection(db, 'userPacks', uid, 'packs'));
    window._userUnlockedPacks = new Set(snap.docs.map(d => d.id));
  } catch (err) {
    console.error('[packs] loadUserPacks failed:', err); // eslint-disable-line no-console
    window._userUnlockedPacks = new Set();
  }
}

onAuthStateChanged(auth, async (user) => {
  if (user) await loadUserPacks(user.uid);
  else window._userUnlockedPacks = new Set();
  // Refresh deck if profile is already mounted
  if (typeof window._renderDeck === 'function') window._renderDeck();
});
