// Legacy DOMContentLoaded shim for scripts loaded after React hydration.
//
// cms.min.js, i18n.min.js, app.min.js register DOMContentLoaded handlers.
// Once they load via next/script strategy="afterInteractive", that event
// has already fired, so late-registered handlers would never run. This
// shim patches addEventListener so those handlers fire on the next tick.
//
// Remove together with the minified scripts once the migration off the
// vanilla SPA is complete.
(function () {
  if (document.readyState === 'loading') return;
  var orig = document.addEventListener.bind(document);
  document.addEventListener = function (type, listener, options) {
    if (type === 'DOMContentLoaded') {
      Promise.resolve().then(function () {
        try { listener(); } catch (e) { console.error(e); }
      });
      return;
    }
    return orig(type, listener, options);
  };
}());
