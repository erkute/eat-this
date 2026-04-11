// js/favourites.js — Firestore-backed favourites per user
// Requires js/auth.js to have initialized Firebase first.

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getApps } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';

// Reuse the already-initialized Firebase app
const app  = getApps()[0];
const db   = getFirestore(app);
const auth = getAuth(app);

// In-memory set of saved spot IDs for the current session
window._favSpots = new Set();

function setFavBtnState(btn, faved) {
  btn.textContent = faved ? '\u2665' : '\u2661'; // ♥ / ♡
  btn.classList.toggle('map-spot-fav-btn--active', faved);
}

async function loadFavourites(uid) {
  try {
    const snap = await getDocs(collection(db, 'favorites', uid, 'spots'));
    window._favSpots = new Set(snap.docs.map(d => d.id));
    // Refresh any visible fav buttons
    document.querySelectorAll('[data-fav-id]').forEach(btn => {
      setFavBtnState(btn, window._favSpots.has(btn.dataset.favId));
    });
  } catch {
    // Silently ignore — user loses fav state for this session only
  }
}

window._toggleFav = async function toggleFav(spotId, spotName, btn) {
  const user = auth.currentUser;
  if (!user) {
    if (typeof window.openLoginModal === 'function') window.openLoginModal();
    return;
  }

  const ref  = doc(db, 'favorites', user.uid, 'spots', spotId);
  const next = !window._favSpots.has(spotId);

  // Optimistic UI update
  setFavBtnState(btn, next);

  try {
    if (next) {
      await setDoc(ref, { name: spotName, savedAt: Date.now() });
      window._favSpots.add(spotId);
    } else {
      await deleteDoc(ref);
      window._favSpots.delete(spotId);
    }
    if (typeof window.showNotification === 'function') {
      window.showNotification(next ? `${spotName} gespeichert` : `${spotName} entfernt`);
    }
  } catch {
    // Revert on error
    setFavBtnState(btn, !next);
  }
};

// Load favourites whenever auth state changes
onAuthStateChanged(auth, (user) => {
  if (user) {
    loadFavourites(user.uid);
  } else {
    window._favSpots = new Set();
  }
});
