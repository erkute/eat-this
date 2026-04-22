// Locale base-path shim for legacy SPA JS (app.min.js, map-init.min.js, etc.).
//
// next-intl routes EN under /en/*. The legacy JS was written assuming the
// SPA lives at /, so it parses location.pathname directly and pushes routes
// without a locale prefix. We bridge by:
//   1) computing __basePath from location.pathname on first load,
//   2) exposing window._path() that returns the pathname with the locale
//      prefix stripped — so legacy code sees `/map` on both /map and /en/map,
//   3) monkey-patching history.pushState/replaceState to re-prepend the
//      prefix before the URL hits the address bar.
//
// Remove once app.min.js / map-init.min.js are ported to React.
(function () {
  var locales = ['en']; // non-default locales with URL prefix
  var path = window.location.pathname;
  var base = '';
  for (var i = 0; i < locales.length; i++) {
    var p = '/' + locales[i];
    if (path === p || path.indexOf(p + '/') === 0) { base = p; break; }
  }
  window.__basePath = base;
  window.__locale = base ? base.slice(1) : 'de';

  window._path = function () {
    var p = window.location.pathname;
    if (base && (p === base || p.indexOf(base + '/') === 0)) {
      return p.slice(base.length) || '/';
    }
    return p;
  };

  function prefix(url) {
    if (typeof url !== 'string') return url;
    if (!base) return url;
    // Already prefixed (absolute URL to another origin, or already has /en)
    if (/^[a-z]+:\/\//i.test(url)) return url;
    if (url === base || url.indexOf(base + '/') === 0) return url;
    if (url.charAt(0) !== '/') return url; // relative path, leave alone
    return base + url;
  }

  var origPush = history.pushState;
  var origReplace = history.replaceState;
  history.pushState = function (state, title, url) {
    return origPush.call(this, state, title, prefix(url));
  };
  history.replaceState = function (state, title, url) {
    return origReplace.call(this, state, title, prefix(url));
  };
}());
