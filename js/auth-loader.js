// js/auth-loader.js — Deferred Firebase auth + feature module loader
//
// Loads auth.js after window.load so Firebase SDK (firebase-app, firebase-auth,
// firebase-firestore, firebase-functions, firebase-app-check) doesn't block
// first paint. Chains dependents (favourites, packs, profile) after auth
// because they rely on Firebase app being initialised first (getApps()[0]).
//
// Special cases that need auth sooner:
//   • Magic-link returns (URL has oobCode=) — load auth immediately.
//   • Google OAuth redirect returns — Firebase stores a pending redirect in
//     sessionStorage; detected and loaded immediately.

(function () {
  function loadAuth() {
    return import('/js/auth.min.js').then(function () {
      import('/js/favourites.min.js');
      import('/js/packs.min.js');
      import('/js/profile.min.js');
    });
  }

  // Detect magic-link or OAuth-redirect returns that need auth ASAP.
  var needsEarly = window.location.search.includes('oobCode=');
  if (!needsEarly) {
    try {
      // Firebase stores pending redirect state in sessionStorage.
      needsEarly = Object.keys(sessionStorage).some(function (k) {
        return k.indexOf('firebase') !== -1;
      });
    } catch (_) { /* sessionStorage blocked */ }
  }

  if (needsEarly) {
    loadAuth();
    return;
  }

  // Normal path: defer until after page load + idle.
  var schedule = window.requestIdleCallback
    ? function (cb) { window.requestIdleCallback(cb, { timeout: 3000 }); }
    : function (cb) { setTimeout(cb, 1); };

  if (document.readyState === 'complete') {
    schedule(loadAuth);
  } else {
    window.addEventListener('load', function () { schedule(loadAuth); }, { once: true });
  }
}());
