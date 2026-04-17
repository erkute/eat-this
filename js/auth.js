// js/auth.js — Firebase Authentication für EAT THIS
//
// ⚠️  SETUP REQUIRED:
// 1. Erstelle ein Firebase-Projekt: https://console.firebase.google.com
// 2. Gehe zu "Authentication" → "Sign-in method" und aktiviere:
//    - Email/Password
//    - Google
//    - Apple (erfordert Apple Developer Account)
// 3. Gehe zu "Project Settings" → "Your apps" → Web-App hinzufügen
// 4. Kopiere die firebaseConfig und ersetze die Werte unten

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { initializeAppCheck, ReCaptchaV3Provider } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app-check.js';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  updateProfile,
  deleteUser
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  getFunctions,
  httpsCallable,
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-functions.js';

// ─── Firebase Config ──────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyDs0361Db_lwHGW9WZfT5ivj-WIB4fyUw0",
  authDomain:        "eat-this-8a13b.firebaseapp.com",
  projectId:         "eat-this-8a13b",
  storageBucket:     "eat-this-8a13b.firebasestorage.app",
  messagingSenderId: "768781457409",
  appId:             "1:768781457409:web:607ff46bfa4599d6b08800"
};

const app       = initializeApp(firebaseConfig);
const auth      = getAuth(app);
const functions = getFunctions(app);

// App Check nur auf der Produktionsseite aktivieren (nicht auf localhost)
if (!['localhost', '127.0.0.1'].includes(window.location.hostname)) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider('6LdG2ZwsAAAAAM6XvEOuQHmIRLAs3CdPiu-l5cwz'),
    isTokenAutoRefreshEnabled: true,
  });
}


const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });


// ─── DOM-Referenzen ───────────────────────────────────────────────────────────
const loginModal     = document.getElementById('loginModal');
const loginBtn       = document.getElementById('loginBtn');
const loginBtnLabel  = loginBtn?.querySelector('span');
const loginClose     = document.getElementById('loginClose');
const loginBackdrop  = document.getElementById('loginBackdrop');

const authView       = document.getElementById('authView');
const profileView    = document.getElementById('profileView');

const loginTitle     = document.getElementById('loginTitle');
const loginSubtitle  = document.getElementById('loginSubtitle');
const loginForm      = document.getElementById('loginForm');
const nameField      = document.getElementById('nameField');
const loginName      = document.getElementById('loginName');
const loginEmail     = document.getElementById('loginEmail');
const loginPassword  = document.getElementById('loginPassword');
const loginSubmitText = document.getElementById('loginSubmitText');
const loginModeToggle = document.getElementById('loginModeToggle');
const loginError     = document.getElementById('loginError');
const loginSuccess   = document.getElementById('loginSuccess');

const profileAvatar  = document.getElementById('profileAvatar');
const profileName    = document.getElementById('profileName');
const profileEmail   = document.getElementById('profileEmail');

const profileAvatarModal = document.getElementById('profileAvatarModal');
const profileNameModal   = document.getElementById('profileNameModal');
const profileEmailModal  = document.getElementById('profileEmailModal');
const logoutBtn      = document.getElementById('logoutBtn');

const googleLoginBtn   = document.getElementById('googleLoginBtn');
const loginForgot      = document.getElementById('loginForgot');
const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
// ─── Zustand ──────────────────────────────────────────────────────────────────
let isRegisterMode = true;
let isRegistering  = false;

// ─── Modal öffnen / schließen ─────────────────────────────────────────────────
function openLoginModal() {
  if (!loginModal) return;
  loginModal.classList.add('active');
  // No bodyOverflow.lock() — modal is position:fixed inset:0, full viewport.
  // Locking body causes the iOS position:fixed scroll jump.
  window._renderProfileFavourites?.();
}

function closeLoginModal() {
  if (!loginModal) return;
  loginModal.classList.remove('active');
  clearError();
}

window.openLoginModal  = openLoginModal;
window.closeLoginModal = closeLoginModal;

window._signOut = async () => {
  await signOut(auth);
  closeLoginModal();
  notify(window.i18n.t('modals.login.notifications.signedOut'));
  window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'start' } }));
};

window._sendPasswordReset = async (email) => {
  const sendPasswordReset = httpsCallable(functions, 'sendPasswordReset');
  await sendPasswordReset({ email });
};

window._updateDisplayName = async (name) => {
  await updateProfile(auth.currentUser, { displayName: name });
};

window._deleteAccount = async () => {
  await deleteUser(auth.currentUser);
};

if (loginBtn)      loginBtn.addEventListener('click', () => {
  if (loginBtn.classList.contains('logged-in')) {
    window._closeBurger?.();
    window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'profile' } }));
  } else {
    openLoginModal();
  }
});
if (loginClose)    loginClose.addEventListener('click', closeLoginModal);
if (loginBackdrop) loginBackdrop.addEventListener('click', closeLoginModal);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && loginModal?.classList.contains('active')) closeLoginModal();
});

// ─── Modus-Toggle: sicherer DOM-Aufbau ────────────────────────────────────────
function buildModeToggle(isRegister) {
  if (!loginModeToggle) return;

  let btn = loginModeToggle.querySelector('.login-mode-link');
  if (!btn) {
    btn = document.createElement('button');
    btn.type      = 'button';
    btn.className = 'login-mode-link';
    loginModeToggle.appendChild(btn);
  }

  btn.textContent = window.i18n.t(isRegister ? 'modals.login.toggleToLogin' : 'modals.login.toggleToRegister');
  btn.onclick = () => setMode(!isRegister);
}

function setMode(register) {
  isRegisterMode = register;
  clearError();
  clearSuccess();

  if (register) {
    if (loginTitle)      loginTitle.textContent      = window.i18n.t('modals.login.titleRegister');
    if (loginSubtitle)   loginSubtitle.textContent   = window.i18n.t('modals.login.subtitleRegister');
    if (nameField)       nameField.style.display     = '';
    if (loginName)       loginName.required           = true;
    if (loginSubmitText) loginSubmitText.textContent = window.i18n.t('modals.login.submitRegister');
    if (loginForgot)     loginForgot.style.display   = 'none';
  } else {
    if (loginTitle)      loginTitle.textContent      = window.i18n.t('modals.login.titleLogin');
    if (loginSubtitle)   loginSubtitle.textContent   = window.i18n.t('modals.login.subtitleLogin');
    if (nameField)       nameField.style.display     = 'none';
    if (loginName)       loginName.required           = false;
    if (loginSubmitText) loginSubmitText.textContent = window.i18n.t('modals.login.submitLogin');
    if (loginForgot)     loginForgot.style.display   = '';
  }

  buildModeToggle(register);
}

// Initialen Zustand sofort setzen (unabhängig von Firebase-Auth-State)
setMode(true);

// ─── Fehlermeldungen ──────────────────────────────────────────────────────────
function showError(msg) {
  if (!loginError) return;
  loginError.textContent = msg;
  loginError.style.display = 'block';
}

function clearError() {
  if (!loginError) return;
  loginError.style.display = 'none';
}

function showSuccess(msg) {
  if (!loginSuccess) return;
  loginSuccess.textContent = msg;
  loginSuccess.style.display = 'block';
}

function clearSuccess() {
  if (!loginSuccess) return;
  loginSuccess.style.display = 'none';
}

function errorMessage(code) {
  const e = window.i18n.t('modals.login.errors');
  const map = {
    'auth/email-already-in-use':    e.emailInUse,
    'auth/invalid-email':           e.invalidEmail,
    'auth/weak-password':           e.weakPassword,
    'auth/wrong-password':          e.wrongPassword,
    'auth/user-not-found':          e.userNotFound,
    'auth/invalid-credential':      e.invalidCredential,
    'auth/too-many-requests':       e.tooManyRequests,
    'auth/network-request-failed':  e.networkFailed,
    'auth/popup-closed-by-user':    '',
    'auth/cancelled-popup-request': '',
  };
  return map[code] ?? e.generic;
}

// ─── Formular: E-Mail + Passwort ──────────────────────────────────────────────
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const email    = loginEmail?.value.trim()  ?? '';
    const password = loginPassword?.value       ?? '';
    const name     = loginName?.value.trim()   ?? '';

    if (!email) { showError(window.i18n.t('modals.login.errors.emailRequired')); return; }
    if (!password) { showError(window.i18n.t('modals.login.errors.passwordRequired')); return; }
    if (isRegisterMode && !name) { showError(window.i18n.t('modals.login.errors.nameRequired')); return; }

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      if (isRegisterMode) {
        isRegistering = true;
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
        isRegistering = false;
        applyLoggedInUI(cred.user);
        notify(window.i18n.t('modals.login.notifications.welcome').replace('{name}', name));
        const sendVerificationEmail = httpsCallable(functions, 'sendVerificationEmail');
        sendVerificationEmail({ displayName: name }).catch(() => {});
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        const firstName = auth.currentUser?.displayName?.split(' ')[0] ?? 'du';
        notify(window.i18n.t('modals.login.notifications.signedIn').replace('{name}', firstName));
      }
      closeLoginModal();
      window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'profile' } }));
    } catch (err) {
      isRegistering = false;
      const msg = errorMessage(err.code);
      if (msg) showError(msg);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });
}

// ─── Passwort vergessen ───────────────────────────────────────────────────────
if (forgotPasswordBtn) {
  forgotPasswordBtn.addEventListener('click', async () => {
    clearError();
    const email = loginEmail?.value.trim() ?? '';
    if (!email) { showError(window.i18n.t('modals.login.errors.emailRequiredFirst')); return; }

    const submitBtn = forgotPasswordBtn;
    submitBtn.disabled = true;

    try {
      const sendPasswordReset = httpsCallable(functions, 'sendPasswordReset');
      await sendPasswordReset({ email });
      clearError();
      showSuccess(window.i18n.t('modals.login.forgotSuccess'));
    } catch (err) {
      if (err?.code === 'functions/resource-exhausted') {
        showError(window.i18n.t('modals.login.errors.tooManyRequestsLong'));
      } else {
        showError(window.i18n.t('modals.login.errors.sendFailed'));
      }
    } finally {
      submitBtn.disabled = false;
    }
  });
}

// ─── Google Login ─────────────────────────────────────────────────────────────
if (googleLoginBtn) {
  googleLoginBtn.addEventListener('click', async () => {
    clearError();
    try {
      await signInWithPopup(auth, googleProvider);
      const firstName = auth.currentUser?.displayName?.split(' ')[0] ?? '';
      notify(window.i18n.t('modals.login.notifications.signedIn').replace('{name}', firstName));
      closeLoginModal();
      window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'profile' } }));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[auth] Google login error:', err.code, err);
      const msg = errorMessage(err.code);
      if (msg) showError(msg);
    }
  });
}

// ─── Abmelden ─────────────────────────────────────────────────────────────────
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    closeLoginModal();
    notify(window.i18n.t('modals.login.notifications.signedOut'));
    window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'start' } }));
  });
}

// ─── Auth-Zustand beobachten ──────────────────────────────────────────────────
function applyLoggedInUI(user) {
  const displayName = user.displayName || (user.email || '').split('@')[0] || 'User';
  const firstName   = displayName.split(' ')[0] || displayName;
  const initials    = displayName.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';

  if (loginBtnLabel) loginBtnLabel.textContent = firstName;
  loginBtn?.classList.add('logged-in');

  // Hide "Create account" hero CTA when already signed in
  const heroCta = document.querySelector('.hero-register-btn');
  if (heroCta) heroCta.style.display = 'none';

  if (authView)      authView.style.display    = 'none';
  if (profileView)   profileView.style.display = 'block';
  if (profileAvatar) profileAvatar.textContent = initials;
  if (profileName)   profileName.textContent   = 'Hey, ' + displayName + '!';
  if (profileEmail)  profileEmail.textContent  = user.email;
  if (profileAvatarModal) profileAvatarModal.textContent = initials;
  if (profileNameModal)   profileNameModal.textContent   = 'Hey, ' + displayName + '!';
  if (profileEmailModal)  profileEmailModal.textContent  = user.email;
}

onAuthStateChanged(auth, (user) => {
  window._currentUser = user || null;
  if (user) {
    if (isRegistering) return;
    applyLoggedInUI(user);
  } else {
    if (loginBtnLabel) loginBtnLabel.textContent = window.i18n.t('footer.signIn');
    loginBtn?.classList.remove('logged-in');

    // Restore "Create account" hero CTA when signed out
    const heroCta = document.querySelector('.hero-register-btn');
    if (heroCta) heroCta.style.display = '';

    if (authView)    authView.style.display    = '';
    if (profileView) profileView.style.display = 'none';

    loginForm?.reset();
    setMode(true);
  }
  if (window._initProfilePage) {
    window._initProfilePage(user || null);
  }
});

// ─── Notification-Helfer ──────────────────────────────────────────────────────
function notify(message) {
  if (typeof window.showNotification === 'function') {
    window.showNotification(message);
    return;
  }
  let el = document.querySelector('.notification');
  if (!el) {
    el = document.createElement('div');
    el.className = 'notification';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}
