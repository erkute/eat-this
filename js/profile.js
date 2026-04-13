/**
 * profile.js — Profile page logic
 * Dependencies (globals):
 *   window._currentUser     — set by auth.js onAuthStateChanged
 *   window.CMS              — cms.js (fetchMustEats, imageUrl)
 *   window._renderProfileFavourites — favourites.js
 *   window._signOut         — auth.js
 *   window._sendPasswordReset — auth.js
 *   window.navigateToPage   — app.js
 *   window.openLoginModal   — auth.js
 */

/* ── Tab switching ── */
function initProfileTabs() {
  const tabs   = document.querySelectorAll('.profile-tab[data-tab]');
  const panels = document.querySelectorAll('.profile-tab-panel[data-panel]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
      panels.forEach(p => { p.classList.remove('active'); p.hidden = true; });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      const panel = document.querySelector('.profile-tab-panel[data-panel="' + tab.dataset.tab + '"]');
      if (panel) { panel.classList.add('active'); panel.hidden = false; }
    });
  });
}

/* ── Header ── */
function populateProfileHeader(user) {
  const displayName = user.displayName || user.email.split('@')[0];
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('profileName', displayName);
  set('profileEmail', user.email);
  set('profileSettingsEmail', user.email);
  set('profileAvatarInitial', displayName.charAt(0).toUpperCase());
  const input = document.getElementById('profileDisplayNameInput');
  if (input) input.value = user.displayName || '';
}

/* ── Deck ── */
async function renderDeck() {
  const grid    = document.getElementById('profileDeckGrid');
  const countEl = document.getElementById('profileDeckCount');
  if (!grid) return;

  let items = [];
  try { items = await window.CMS.fetchMustEats(); }
  catch (e) { grid.textContent = 'Could not load deck.'; return; }

  if (countEl) countEl.textContent = items.length + ' Karten';

  const fragment = document.createDocumentFragment();
  items.forEach(item => {
    const imgUrl = item.imageUrl ? window.CMS.imageUrl(item.imageUrl, { width: 200 }) : '';
    const card = document.createElement('div');
    card.className = 'profile-deck-card';
    card.title = item.dish || '';

    const img = document.createElement(imgUrl ? 'img' : 'div');
    img.className = 'profile-deck-card-img';
    if (imgUrl) { img.src = imgUrl; img.alt = item.dish || ''; img.loading = 'lazy'; }

    const body = document.createElement('div');
    body.className = 'profile-deck-card-body';

    const name = document.createElement('div');
    name.className = 'profile-deck-card-name';
    name.textContent = item.dish || '\u2014';

    const rest = document.createElement('div');
    rest.className = 'profile-deck-card-rest';
    rest.textContent = item.restaurant || '';

    body.appendChild(name);
    body.appendChild(rest);
    card.appendChild(img);
    card.appendChild(body);
    fragment.appendChild(card);
  });
  grid.textContent = '';
  grid.appendChild(fragment);
}

/* ── Saved restaurants — delegate to favourites.js ── */
function renderSaved() {
  window._renderProfileFavourites && window._renderProfileFavourites();
}

/* ── Settings ── */
function initSettings(user) {
  // Save display name
  const saveBtn      = document.getElementById('profileSaveNameBtn');
  const nameInput    = document.getElementById('profileDisplayNameInput');
  const nameFeedback = document.getElementById('profileNameFeedback');

  if (saveBtn && nameInput) {
    saveBtn.addEventListener('click', async () => {
      const newName = nameInput.value.trim();
      if (!newName) return;
      try {
        await user.updateProfile({ displayName: newName });
        if (nameFeedback) { nameFeedback.textContent = 'Gespeichert \u2713'; nameFeedback.hidden = false; }
        const nameEl = document.getElementById('profileName');
        const initEl = document.getElementById('profileAvatarInitial');
        if (nameEl) nameEl.textContent = newName;
        if (initEl) initEl.textContent = newName.charAt(0).toUpperCase();
      } catch (e) {
        if (nameFeedback) { nameFeedback.textContent = 'Fehler beim Speichern.'; nameFeedback.hidden = false; }
      }
    });
  }

  // Password reset
  const resetBtn   = document.getElementById('profileResetPasswordBtn');
  const pwFeedback = document.getElementById('profilePasswordFeedback');
  if (resetBtn) {
    resetBtn.addEventListener('click', async () => {
      try {
        window._sendPasswordReset && await window._sendPasswordReset(user.email);
        if (pwFeedback) { pwFeedback.textContent = 'E-Mail gesendet \u2713'; pwFeedback.hidden = false; }
      } catch (e) {
        if (pwFeedback) { pwFeedback.textContent = 'Fehler. Bitte erneut versuchen.'; pwFeedback.hidden = false; }
      }
    });
  }

  // Sign out
  const signOutBtn = document.getElementById('profileSignOutBtn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', () => { window._signOut && window._signOut(); });
  }

  // Delete account
  const deleteBtn = document.getElementById('profileDeleteAccountBtn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      if (!window.confirm('Bist du sicher? Dein Account wird dauerhaft gel\u00F6scht.')) return;
      user.delete()
        .then(() => { window.navigateToPage && window.navigateToPage('start'); })
        .catch(() => { window.alert('Fehler. Bitte neu einloggen und erneut versuchen.'); });
    });
  }
}

/* ── Main entry point ── */
function initProfilePage(user) {
  const authPrompt = document.getElementById('profileAuthPrompt');
  const content    = document.getElementById('profileContent');
  const signInBtn  = document.getElementById('profileSignInBtn');

  if (!user) {
    if (authPrompt) authPrompt.style.display = 'flex';
    if (content)    content.hidden = true;
    if (signInBtn && !signInBtn._bound) {
      signInBtn._bound = true;
      signInBtn.addEventListener('click', () => window.openLoginModal && window.openLoginModal());
    }
    return;
  }

  if (authPrompt) authPrompt.style.display = 'none';
  if (content)    content.hidden = false;

  populateProfileHeader(user);
  initProfileTabs();
  renderDeck();
  renderSaved();
  initSettings(user);
}

window._initProfilePage    = initProfilePage;
window._renderProfileSaved = renderSaved;
