// ─── EAT THIS Service Worker ─────────────────────────────────────────────────
// Strategy:
//   Cache-first  → static shell (HTML, CSS, JS, local images)
//   Network-first → Sanity CDN & Firebase (fresh content)
//   Offline page  → shown when both fail

const CACHE_VERSION = 'eat-this-v1';
const CACHE_STATIC  = `${CACHE_VERSION}-static`;
const CACHE_IMAGES  = `${CACHE_VERSION}-images`;

// Static shell — cache on install, serve from cache first
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/style.css',
  '/css/leaflet.css',
  '/js/cms.js',
  '/js/i18n.js',
  '/js/app.js',
  '/js/auth.js',
  '/favicon.ico',
  '/pics/eat.png',
  '/pics/favicon-192.png',
  '/pics/logo.webp',
  '/pics/logo2.webp',
  '/pics/globe.webp',
];

// ─── Install: pre-cache static shell ─────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ─── Activate: delete old caches ─────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key.startsWith('eat-this-') && key !== CACHE_STATIC && key !== CACHE_IMAGES)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch: route requests ────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and browser extensions
  if (request.method !== 'GET') return;
  if (!url.protocol.startsWith('http')) return;

  // Network-first: Sanity CDN + Firebase (always want fresh data)
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

  // Cache-first with network update: hero images + about images (large, rarely change)
  if (url.pathname.startsWith('/pics/Hero/') || url.pathname.startsWith('/pics/about/')) {
    event.respondWith(staleWhileRevalidate(request, CACHE_IMAGES));
    return;
  }

  // Cache-first: static shell
  event.respondWith(cacheFirst(request, CACHE_STATIC));
});

// ─── Strategies ──────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline and not cached — return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }
    return new Response('', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkFetch = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  return cached || await networkFetch || new Response('', { status: 503 });
}
