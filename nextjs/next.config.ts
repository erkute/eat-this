import type { NextConfig } from 'next';
import { randomUUID } from 'crypto';
import path from 'path';
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs/config';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');
const firebaseAuthProjectId =
  process.env.NEXT_PUBLIC_FIREBASE_EXPECTED_PROJECT_ID || 'eat-this-8a13b';

if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(firebaseAuthProjectId)) {
  throw new Error('Invalid NEXT_PUBLIC_FIREBASE_EXPECTED_PROJECT_ID');
}

const GUIDE_TO_CATEGORY = [
  ['beste-pizza-berlin', 'pizza'],
  ['beste-fast-food-berlin', 'fast-food'],
  ['beste-cafes-berlin', 'coffee'],
] as const;

const nextConfig: NextConfig = {
  output: 'standalone',
  // Trägt den Build-Zeitpunkt, weil die Dateien im App-Hosting-Image auf
  // 1980-01-01 stehen; cache-handler.cjs liest ihn hier heraus.
  generateBuildId: async () => `et-${Date.now()}-${randomUUID().slice(0, 8)}`,
  // `inlineCss` aus: Es schreibt das ganze CSS in jede Seite, ohne
  // Browser-Cache. `cssChunking` aus: Sonst lädt jede Seite auch fremde Module.
  // Ein Modul kann dadurch in mehreren Dateien stehen; zwischen Modulen also
  // nie mit gleicher Spezifität überschreiben.
  experimental: { cssChunking: false },
  /**
   * Metadaten in den `<head>`: App Hosting schickt bei jeder Anfrage den
   * blanken User-Agent `Google`, den Nexts Bot-Liste nicht trifft. Sonst landen
   * title und canonical im Body, und Google ignoriert ein canonical dort.
   * `Google` deckt Nexts Google-Einträge mit ab, der Rest ist Nexts Liste.
   */
  htmlLimitedBots:
    /Google|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti/i,
  // `.next-verify` for the isolated pre-push build, so it can run beside `next
  // dev`.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Beide Pakete liefern `static {}`-Blöcke aus, die Safari vor 16.4 nicht
  // kennt; unübersetzt bricht das Skript auf iOS 15–16.3 ab.
  transpilePackages: ['intl-messageformat', 'maplibre-gl'],
  // One tsconfig per dist dir: Next appends `<distDir>/types` to whichever
  // config it gets, and a shared one breaks the isolated build on the other
  // dir's stale route types.
  typescript: {
    tsconfigPath: process.env.NEXT_DIST_DIR ? 'tsconfig.verify.json' : 'tsconfig.json',
  },
  outputFileTracingRoot: path.resolve(__dirname),
  // Teilt Tag-Invalidierungen zwischen den Instanzen (siehe cache-handler.cjs).
  cacheHandler: path.resolve(__dirname, 'cache-handler.cjs'),
  // Next bündelt den Cache-Handler auch in die Edge-Middleware, wo sich
  // Firestore nicht übersetzen lässt. Dort bleibt es leer; der Node-Server lädt
  // den Handler ungebündelt und mit Firestore.
  webpack(config, { nextRuntime }) {
    if (nextRuntime === 'edge') {
      config.resolve.alias = { ...config.resolve.alias, '@google-cloud/firestore': false };
    }
    return config;
  },
  // Only the two public OG fonts belong in the server bundle; local brand fonts
  // stay on this machine.
  outputFileTracingExcludes: {
    '*': ['./assets/fonts/NeueHaasGroteskTextPro*'],
  },
  outputFileTracingIncludes: {
    '/api/og/restaurant': ['./assets/fonts/SairaCondensed-ExtraBold.ttf', './assets/fonts/Schoolbell-Regular.ttf'],
  },

  images: {
    // App Hosting disables the image optimizer unless this is explicitly false.
    unoptimized: false,
    // Eigene Bilder werden unter gleichem Namen ersetzt (siehe
    // `replaceableAssetHeaders`); der Optimierer nimmt diesen Wert als
    // Untergrenze.
    minimumCacheTTL: 86400,
    qualities: [75, 80, 90],
    // Sanity-Bilder gehen direkt an die Sanity-CDN (SiteImage setzt
    // `sanityImageLoader`); über den Optimierer kosteten sie auf Cloud Run
    // Speicher bis zur 1-GiB-Grenze. Kein globaler `loaderFile`, der schaltet
    // `/_next/image` ganz ab. Ohne `search`, damit Cache-Bust-Queries wie
    // `?v=6` gültig bleiben.
    localPatterns: [{ pathname: '/pics/**' }, { pathname: '/buddy/**' }],
  },

  async headers() {
    // Report-Only: blocks nothing, reports violations to /api/csp-report.
    // 'unsafe-inline' on script-src is required by the synchronous
    // CRITICAL_BOOTSTRAP (no nonces in the static output). Sentry is tunnelled
    // through same-origin /monitoring.
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''} https://apis.google.com`,
      // Only the Adobe font files are fetched from outside (font-src).
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://cdn.sanity.io https://*.googleusercontent.com",
      "font-src 'self' data: https://use.typekit.net",
      "connect-src 'self' https://cdn.sanity.io https://tiles.openfreemap.org https://*.googleapis.com https://*.firebaseio.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.firebaseapp.com",
      "frame-src 'self' https://*.firebaseapp.com https://checkout.stripe.com https://accounts.google.com",
      "worker-src 'self' blob:",
      "form-action 'self' https://checkout.stripe.com",
      'report-uri /api/csp-report',
    ].join('; ');
    // Bilder, die unter gleichem Namen ersetzt werden: kein `immutable`, sonst
    // zeigte jeder Browser nach einem Austausch weiter die alten Bytes. Eine
    // Stunde Frische kostet nur bedingte Anfragen mit 304.
    const replaceableAssetHeaders = [
      { key: 'Cache-Control', value: 'public, max-age=3600, stale-while-revalidate=86400' },
    ];

    return [
      {
        source: '/pics/:path*',
        headers: replaceableAssetHeaders,
      },
      {
        source: '/buddy/:path*',
        headers: replaceableAssetHeaders,
      },
      {
        // Der Kartenstyle (scripts/build-basemap-style.mts): kein `immutable`,
        // weil die Dateinamen keine Version tragen.
        source: '/basemap/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, stale-while-revalidate=86400',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          // Firebase signInWithPopup polls popup.closed.
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
          { key: 'Content-Security-Policy-Report-Only', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
        ],
      },
    ];
  },

  async rewrites() {
    // Same-origin Firebase Auth helper (Firebase's "Option 3" reverse proxy):
    // the popup credential returns same-origin, and Google's consent screen
    // names our domain. The helper also fetches /__/firebase/init.json.
    return [
      {
        source: '/__/:path*',
        destination: `https://${firebaseAuthProjectId}.firebaseapp.com/__/:path*`,
      },
    ];
  },

  async redirects() {
    return [
      {
        source: '/restaurant/engelsbecken',
        destination: '/restaurant/engelbecken',
        permanent: true,
      },
      {
        source: '/en/restaurant/engelsbecken',
        destination: '/en/restaurant/engelbecken',
        permanent: true,
      },
      {
        source: '/guides/beste-baeckereien-berlin',
        destination: '/news/beste-baeckereien-berlin',
        permanent: true,
      },
      {
        source: '/en/guides/beste-baeckereien-berlin',
        destination: '/en/news/beste-baeckereien-berlin',
        permanent: true,
      },
      // Die Guides doppelten ihre Kategorieseiten; die Kategorieseite ist das
      // Ziel.
      ...GUIDE_TO_CATEGORY.flatMap(([slug, category]) => [
        { source: `/guides/${slug}`, destination: `/kategorie/${category}`, permanent: true },
        {
          source: `/en/guides/${slug}`,
          destination: `/en/kategorie/${category}`,
          permanent: true,
        },
      ]),
      {
        source: '/news/markthalle9',
        destination: '/news/restaurants-kreuzberg',
        permanent: true,
      },
      {
        source: '/en/news/markthalle9',
        destination: '/en/news/restaurants-kreuzberg',
        permanent: true,
      },
    ];
  },
};

// Source maps upload only with SENTRY_AUTH_TOKEN; without it the build still
// succeeds.
export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  // Through our own /monitoring endpoint, past ad blockers.
  tunnelRoute: '/monitoring',
  // Der Hook misst Seitenwechsel, und das Messen fliegt mit `removeTracing`
  // ohnehin aus dem Bundle.
  suppressOnRouterTransitionStartWarning: true,
  // These are the `webpack.treeshake` keys, not `bundleSizeOptimizations`; only
  // this shape reaches the DefinePlugin that drops the code. `removeTracing`
  // takes ~52 kB gzip off every page (error reporting is untouched) and applies
  // to server and edge bundles too, so no config sets tracesSampleRate.
  webpack: {
    treeshake: {
      removeTracing: true,
      removeDebugLogging: true,
      excludeReplayIframe: true,
      excludeReplayShadowDOM: true,
      excludeReplayCompressionWorker: true,
    },
  },
});
