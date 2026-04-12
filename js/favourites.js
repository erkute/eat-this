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
  } catch (err) {
    console.error('[favourites] loadFavourites failed:', err);
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
  } catch (err) {
    console.error('[favourites] toggleFav failed:', err);
    // Revert on error
    setFavBtnState(btn, !next);
    if (typeof window.showNotification === 'function') {
      window.showNotification('Fehler beim Speichern – bitte erneut versuchen');
    }
  }
};

function renderProfileFavourites() {
  const grid    = document.getElementById('profileFavsGrid');
  const countEl = document.getElementById('profileFavsCount');
  if (!grid) return;

  const favIds   = [...window._favSpots];
  const allSpots = window._allSpots || [];

  if (countEl) {
    countEl.textContent   = favIds.length > 0 ? favIds.length : '';
    countEl.style.display = favIds.length > 0 ? '' : 'none';
  }

  grid.replaceChildren();

  if (favIds.length === 0) {
    const empty = document.createElement('p');
    empty.className   = 'profile-favs-empty';
    empty.textContent = 'Noch keine Orte gespeichert \u2661';
    grid.appendChild(empty);
    return;
  }

  favIds.forEach((spotId) => {
    const spot = allSpots.find(
      (s) => (s._id || s.name.replace(/\s+/g, '-').toLowerCase()) === spotId
    );

    const card = document.createElement('button');
    card.type      = 'button';
    card.className = 'profile-fav-card';

    const imgWrap = document.createElement('div');
    imgWrap.className = 'profile-fav-img';

    if (spot?.photo) {
      const img = document.createElement('img');
      img.src     = spot.photo;
      img.alt     = spot.name;
      img.loading = 'lazy';
      imgWrap.appendChild(img);
    } else {
      imgWrap.classList.add('profile-fav-img--placeholder');
      imgWrap.textContent = '\u2665';
    }

    const info = document.createElement('div');
    info.className = 'profile-fav-info';

    const nameEl = document.createElement('span');
    nameEl.className   = 'profile-fav-name';
    nameEl.textContent = spot?.name || spotId;
    info.appendChild(nameEl);

    if (spot?.district) {
      const distEl = document.createElement('span');
      distEl.className   = 'profile-fav-district';
      distEl.textContent = spot.district;
      info.appendChild(distEl);
    }

    card.appendChild(imgWrap);
    card.appendChild(info);

    card.addEventListener('click', () => {
      if (spot && typeof window._showSpotDetail === 'function') {
        window.closeLoginModal?.();
        window._navigateToPage?.('map');
        window._showSpotDetail(spot);
      }
    });

    grid.appendChild(card);
  });
}

window._renderProfileFavourites = renderProfileFavourites;

// Load favourites whenever auth state changes
onAuthStateChanged(auth, (user) => {
  if (user) {
    loadFavourites(user.uid).then(renderProfileFavourites);
  } else {
    window._favSpots = new Set();
    renderProfileFavourites();
  }
});
