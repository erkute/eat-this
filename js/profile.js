/**
 * profile.js — Profile page logic
 * Dependencies (globals):
 *   window._currentUser          — set by auth.js onAuthStateChanged
 *   window.CMS                   — cms.js (fetchMustEats, imageUrl)
 *   window._renderProfileFavourites — favourites.js
 *   window._signOut              — auth.js
 *   window._sendPasswordReset    — auth.js
 *   window._updateDisplayName    — auth.js
 *   window._deleteAccount        — auth.js
 *   window._navigateToPage       — app.js
 *   window.openLoginModal        — auth.js
 */

/* ── One-time init guard: tabs and settings listeners are registered only once ── */
let _profileInited = false;

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
  const displayName = user.displayName || (user.email || '').split('@')[0];
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('profileName', displayName);
  set('profileEmail', user.email || '');
  set('profileSettingsEmail', user.email || '');
  set('profileAvatarInitial', displayName.charAt(0).toUpperCase());
  const input = document.getElementById('profileDisplayNameInput');
  if (input) input.value = user.displayName || '';
}

/* ── Deck ── */
async function renderDeck() {
  const packList    = document.getElementById('profilePackList');
  const boosterSect = document.getElementById('profileBoosterSection');
  const boosterGrid = document.getElementById('profileBoosterGrid');
  if (!packList) return;

  packList.textContent = '';

  let allPacks = [];
  try { allPacks = await window.CMS.fetchCardPacks() || []; }
  catch (e) { return; }

  const unlockedSlugs = window._userUnlockedPacks || new Set();
  const lang          = window.i18n ? window.i18n.currentLang() : 'en';
  const unlockedPacks = allPacks.filter(p => unlockedSlugs.has(p.slug));
  const premiumPacks  = allPacks.filter(p => p.packType === 'premium' && !unlockedSlugs.has(p.slug));

  unlockedPacks.forEach(pack => {
    const title   = (lang === 'de' && pack.titleDe) ? pack.titleDe : pack.title;
    const section = document.createElement('div');
    section.className = 'profile-pack-section';

    const header  = document.createElement('div');
    header.className = 'profile-pack-header';
    const titleEl = document.createElement('h3');
    titleEl.className   = 'profile-pack-title';
    titleEl.textContent = title;
    header.appendChild(titleEl);
    section.appendChild(header);

    const row = document.createElement('div');
    row.className = 'profile-pack-row';

    (pack.cards || []).forEach(card => {
      const cardEl = document.createElement('div');
      cardEl.className        = 'profile-pack-card must-card eat-card';
      cardEl.dataset.img        = card.imageUrl || '';
      cardEl.dataset.dish       = card.dish || '';
      cardEl.dataset.restaurant = card.restaurant || '';
      cardEl.dataset.district   = card.district || '';
      cardEl.dataset.price      = card.cardPrice || '';

      const img     = document.createElement('img');
      img.src       = card.imageUrl || '';
      img.alt       = card.dish || '';
      img.loading   = 'lazy';
      img.className = 'must-card-img';
      cardEl.appendChild(img);
      row.appendChild(cardEl);
    });

    section.appendChild(row);
    packList.appendChild(section);
  });

  if (boosterSect && boosterGrid) {
    if (premiumPacks.length > 0) {
      boosterSect.hidden   = false;
      boosterGrid.textContent = '';

      premiumPacks.forEach(pack => {
        const title  = (lang === 'de' && pack.titleDe) ? pack.titleDe : pack.title;
        const packEl = document.createElement('div');
        packEl.className = 'profile-booster-pack';

        const cover = document.createElement('div');
        cover.className = 'profile-booster-pack-cover';
        if (pack.coverImageUrl) {
          const img   = document.createElement('img');
          img.src     = pack.coverImageUrl;
          img.alt     = title;
          img.loading = 'lazy';
          cover.appendChild(img);
        }

        const nameEl       = document.createElement('div');
        nameEl.className   = 'profile-booster-pack-name';
        nameEl.textContent = title;

        const btn       = document.createElement('button');
        btn.type        = 'button';
        btn.className   = 'profile-booster-pack-btn';
        btn.textContent = window.i18n ? window.i18n.t('profile.deck.unlockBtn') : 'Unlock';
        btn.disabled    = true; // Phase 2: Stripe not wired yet

        packEl.appendChild(cover);
        packEl.appendChild(nameEl);

        if (pack.price) {
          const priceEl       = document.createElement('div');
          priceEl.className   = 'profile-booster-pack-price';
          priceEl.textContent = '\u20AC' + Number(pack.price).toFixed(2);
          packEl.appendChild(priceEl);
        }

        packEl.appendChild(btn);
        boosterGrid.appendChild(packEl);
      });
    } else {
      boosterSect.hidden = true;
    }
  }

  if (typeof window._bindMustCards === 'function') window._bindMustCards();
}

// Expose globally so packs.js can call after Firestore loads
window._renderDeck = renderDeck;

/* ── Saved restaurants — delegate to favourites.js ── */
function renderSaved() {
  window._renderProfileFavourites && window._renderProfileFavourites();
}

/* ── Settings (registered once via _profileInited guard) ── */
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
        await window._updateDisplayName(newName);
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
      if (!window._deleteAccount) return;
      window._deleteAccount()
        .then(() => { window._navigateToPage && window._navigateToPage('start'); })
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

  // Listeners registered once only — guard against repeated onAuthStateChanged calls
  if (!_profileInited) {
    _profileInited = true;
    initProfileTabs();
    initSettings(user);
  }
  renderDeck();

  renderSaved();
}

window._initProfilePage    = initProfilePage;
window._renderProfileSaved = renderSaved;
