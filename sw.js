// ─── EAT THIS Service Worker ─────────────────────────────────────────────────
// Strategies:
//   stale-while-revalidate → HTML / JS / CSS  (instant + auto-updates in bg)
//   cache-first            → images           (rarely change)
//   network-first          → Sanity / Firebase (always fresh data)

// Bump this when deploying breaking changes that must invalidate all caches.
// Normally stale-while-revalidate handles updates automatically — this is
// only needed for emergency cache clears.
const CACHE_VERSION = 'eat-this-v71';
const CACHE_SHELL   = `${CACHE_VERSION}-shell`;
const CACHE_IMAGES  = `${CACHE_VERSION}-images`;

// Pre-cached on SW install — served immediately on first offline visit.
// stale-while-revalidate keeps these fresh automatically after that.
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/css/map.css',
  '/css/leaflet.css',
  '/js/analytics.js',
  '/js/sw-register.js',
  '/js/cms.js',
  '/js/i18n.js',
  '/js/app.js?v=20',
  '/js/map-init.js',
  '/js/auth.js',
  '/js/favourites.js',
  '/js/packs.js',
  '/js/profile.js',
  '/js/notifications.js',
  '/js/perf.js',
  '/js/sentry.js',
  '/favicon.ico',
  '/pics/eat.webp',
  '/pics/favicon-192.png',
  '/pics/logo.webp',
  '/pics/logo2.webp',
  '/pics/globe.webp',
];

// ─── Install: pre-cache shell ─────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_SHELL).then(cache =>
      // addAll with individual error swallowing — one missing file won't block install
      Promise.allSettled(PRECACHE_ASSETS.map(url => cache.add(url)))
    ).then(() => self.skipWaiting())
  );
});

// ─── Activate: delete stale caches ───────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k.startsWith('eat-this-') && k !== CACHE_SHELL && k !== CACHE_IMAGES)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch: route by content type ────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // Pass map tiles straight to the browser — don't cache or intercept.
  // iOS Safari has trouble with SW-intercepted cross-origin image requests.
  if (url.hostname.includes('cartocdn.com') || url.hostname.includes('openstreetmap.org')) return;

  // Google iframe bootstrap (reCAPTCHA, apis.google.com) — let the browser
  // fetch directly; these requests aren't in connect-src by design.
  if (url.hostname === 'apis.google.com') return;

  // Network-first: Sanity CMS + Firebase + Analytics (must be fresh)
  if (
    url.hostname.includes('sanity.io') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('firebaseapp') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('googletagmanager.com')
  ) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Cache-first: images (hero, about, local pics — large, rarely change).
  // Match any image file under /pics/ so hero_desktop.webp, about/*.webp, etc.
  // all get the long-lived image cache.
  if (
    url.pathname.startsWith('/pics/') &&
    /\.(webp|png|jpe?g|svg|gif|avif)$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request, CACHE_IMAGES));
    return;
  }

  // Stale-while-revalidate: shell (HTML, JS, CSS, local icons)
  // → User gets instant cached response; browser silently fetches latest in bg.
  // → Next page load gets the updated version automatically.
  event.respondWith(staleWhileRevalidate(request, CACHE_SHELL));
});

// ─── Strategies ──────────────────────────────────────────────────────────────

// Serve from cache instantly, fetch update in background for next visit.
async function staleWhileRevalidate(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Always kick off a network update (don't await — fire and forget)
  const update = fetch(request).then(res => {
    if (res.ok) cache.put(request, res.clone());
    return res;
  }).catch(() => null);

  // Return cached immediately; fall back to network if not cached yet
  if (cached) return cached;
  return (await update) || offlineFallback(request);
}

// Return cached if available; fetch + cache on miss.
async function cacheFirst(request, cacheName) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    return offlineFallback(request);
  }
}

// Try network; fall back to cache if offline.
async function networkFirst(request) {
  try {
    return await fetch(request);
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function offlineFallback(request) {
  if (request.mode === 'navigate') return caches.match('/index.html');
  return new Response('', { status: 503 });
}

