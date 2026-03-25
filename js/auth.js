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
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

// ─── Firebase Config ──────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyDs0361Db_lwHGW9WZfT5ivj-WIB4fyUw0",
  authDomain:        "eat-this-8a13b.firebaseapp.com",
  projectId:         "eat-this-8a13b",
  storageBucket:     "eat-this-8a13b.firebasestorage.app",
  messagingSenderId: "768781457409",
  appId:             "1:768781457409:web:607ff46bfa4599d6b08800"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);

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
  document.body.style.overflow = 'hidden';
}

function closeLoginModal() {
  if (!loginModal) return;
  loginModal.classList.remove('active');
  document.body.style.overflow = '';
  clearError();
}

window.openLoginModal  = openLoginModal;
window.closeLoginModal = closeLoginModal;

if (loginBtn)      loginBtn.addEventListener('click', openLoginModal);
if (loginClose)    loginClose.addEventListener('click', closeLoginModal);
if (loginBackdrop) loginBackdrop.addEventListener('click', closeLoginModal);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && loginModal?.classList.contains('active')) closeLoginModal();
});

// ─── Modus-Toggle: sicherer DOM-Aufbau ────────────────────────────────────────
function buildModeToggle(isRegister) {
  if (!loginModeToggle) return;
  loginModeToggle.textContent = '';

  const label = document.createTextNode(isRegister ? 'Bereits registriert? ' : 'Neu hier? ');
  const btn   = document.createElement('button');
  btn.type      = 'button';
  btn.className = 'login-mode-link';
  btn.textContent = isRegister ? 'Anmelden' : 'Konto erstellen';
  btn.addEventListener('click', () => setMode(!isRegister));

  loginModeToggle.appendChild(label);
  loginModeToggle.appendChild(btn);
}

function setMode(register) {
  isRegisterMode = register;
  clearError();
  clearSuccess();

  if (register) {
    if (loginTitle)      loginTitle.textContent      = 'Konto erstellen';
    if (loginSubtitle)   loginSubtitle.textContent   = 'Registriere dich, um die besten Gerichte in Berlin zu entdecken.';
    if (nameField)       nameField.style.display     = '';
    if (loginName)       loginName.required           = true;
    if (loginSubmitText) loginSubmitText.textContent = 'Konto erstellen';
    if (loginForgot)     loginForgot.style.display   = 'none';
  } else {
    if (loginTitle)      loginTitle.textContent      = 'Willkommen zurück';
    if (loginSubtitle)   loginSubtitle.textContent   = 'Melde dich mit deiner E-Mail-Adresse an.';
    if (nameField)       nameField.style.display     = 'none';
    if (loginName)       loginName.required           = false;
    if (loginSubmitText) loginSubmitText.textContent = 'Anmelden';
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
  const map = {
    'auth/email-already-in-use':    'Diese E-Mail ist bereits registriert.',
    'auth/invalid-email':           'Ungültige E-Mail-Adresse.',
    'auth/weak-password':           'Passwort zu schwach (mind. 6 Zeichen).',
    'auth/wrong-password':          'Falsches Passwort.',
    'auth/user-not-found':          'Kein Konto mit dieser E-Mail-Adresse.',
    'auth/invalid-credential':      'E-Mail oder Passwort falsch.',
    'auth/too-many-requests':       'Zu viele Versuche — bitte kurz warten.',
    'auth/network-request-failed':  'Netzwerkfehler — bitte erneut versuchen.',
    'auth/popup-closed-by-user':    '',
    'auth/cancelled-popup-request': '',
  };
  return map[code] ?? 'Ein Fehler ist aufgetreten. Bitte erneut versuchen.';
}

// ─── Formular: E-Mail + Passwort ──────────────────────────────────────────────
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearError();

    const email    = loginEmail?.value.trim()  ?? '';
    const password = loginPassword?.value       ?? '';
    const name     = loginName?.value.trim()   ?? '';

    if (!email || !password) return;
    if (isRegisterMode && !name) { showError('Bitte gib deinen Namen ein.'); return; }

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      if (isRegisterMode) {
        isRegistering = true;
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: name });
        isRegistering = false;
        const firstName = name.split(' ')[0];
        const initials  = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
        if (loginBtnLabel) loginBtnLabel.textContent = firstName;
        loginBtn?.classList.add('logged-in');
        if (profileAvatar) profileAvatar.textContent = initials;
        if (profileName)   profileName.textContent   = 'Hey, ' + name + '!';
        if (profileEmail)  profileEmail.textContent  = email;
        notify('Willkommen bei EAT THIS, ' + name + '!');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        const firstName = auth.currentUser?.displayName?.split(' ')[0] ?? 'du';
        notify('Hey ' + firstName + ', schön dich zu sehen!');
      }
      closeLoginModal();
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
    if (!email) { showError('Bitte gib zuerst deine E-Mail-Adresse ein.'); return; }
    try {
      await sendPasswordResetEmail(auth, email);
      clearError();
      showSuccess('Reset-Link wurde an ' + email + ' gesendet. Bitte prüfe dein Postfach.');
    } catch (err) {
      const map = {
        'auth/user-not-found':    'Kein Konto mit dieser E-Mail-Adresse.',
        'auth/invalid-email':     'Ungültige E-Mail-Adresse.',
        'auth/too-many-requests': 'Zu viele Versuche — bitte kurz warten.',
      };
      showError(map[err.code] ?? 'Fehler beim Senden. Bitte erneut versuchen.');
    }
  });
}

// ─── Google Login ─────────────────────────────────────────────────────────────
if (googleLoginBtn) {
  googleLoginBtn.addEventListener('click', async () => {
    clearError();
    try {
      await signInWithPopup(auth, googleProvider);
      const firstName = auth.currentUser?.displayName?.split(' ')[0] ?? 'du';
      notify('Hey ' + firstName + ', schön dich zu sehen!');
      closeLoginModal();
    } catch (err) {
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
    notify('Du wurdest abgemeldet.');
  });
}

// ─── Auth-Zustand beobachten ──────────────────────────────────────────────────
onAuthStateChanged(auth, (user) => {
  if (user) {
    if (isRegistering) return;

    const displayName = user.displayName || user.email.split('@')[0];
    const firstName   = displayName.split(' ')[0];
    const initials    = displayName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

    if (loginBtnLabel) loginBtnLabel.textContent = firstName;
    loginBtn?.classList.add('logged-in');

    if (authView)      authView.style.display    = 'none';
    if (profileView)   profileView.style.display = 'block';
    if (profileAvatar) profileAvatar.textContent = initials;
    if (profileName)   profileName.textContent   = 'Hey, ' + displayName + '!';
    if (profileEmail)  profileEmail.textContent  = user.email;

  } else {
    if (loginBtnLabel) loginBtnLabel.textContent = 'Anmelden';
    loginBtn?.classList.remove('logged-in');

    if (authView)    authView.style.display    = '';
    if (profileView) profileView.style.display = 'none';

    loginForm?.reset();
    setMode(true);
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
