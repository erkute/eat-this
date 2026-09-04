import type { NextConfig } from 'next';
import path from 'path';
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs';

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
  // Build output dir. Defaults to `.next` (dev + Firebase App Hosting). A
  // validation/pre-push build sets NEXT_DIST_DIR=.next-verify so it can run
  // alongside a live `next dev` without clobbering the dev server's `.next`.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Each build type-checks against its OWN dist dir's generated route types.
  // Next appends `<distDir>/types/**/*.ts` to whichever tsconfig it is handed,
  // so a single config accumulated both `.next/types` and `.next-verify/types`
  // — and then the isolated build failed on the *other* dir's stale validator
  // whenever a route had been deleted since the last default-distDir build.
  // That broke `build:isolated`, which is the pre-push gate, for reasons
  // unrelated to the code being pushed. One config per dist dir, no crosstalk.
  typescript: {
    tsconfigPath: process.env.NEXT_DIST_DIR ? 'tsconfig.verify.json' : 'tsconfig.json',
  },
  outputFileTracingRoot: path.resolve(__dirname),
  // Satori fonts for the composed email spot-card image — read via
  // fs.readFile at runtime, so the tracer can't see them on its own.
  outputFileTracingIncludes: {
    '/api/og/restaurant': ['./assets/fonts/**/*'],
    '/api/og/badge': ['./assets/fonts/**/*'],
  },

  images: {
    // Firebase App Hosting disables Next's built-in image optimizer unless
    // this is explicitly false. Keep the explicit value: without it every
    // <Image> ships its original file (including multi-megabyte Sanity PNGs)
    // and loses its responsive srcset in production.
    unoptimized: false,
    // Sanity asset URLs are immutable and first-party images are versioned
    // when replaced. A day is still conservative while avoiding repeated
    // optimizer work at the App Hosting edge.
    minimumCacheTTL: 86400,
    // Local assets receive real responsive variants. Sanity URLs are valid
    // remote sources and are cached by the same optimizer; raw <img> call
    // sites use sanityImageLoader directly.
    // Local next/image assets live below /pics and /buddy. The checkout logo
    // set is gone from here on purpose: the payment marks are inline SVG now
    // (app/components/PaymentMarks.tsx), which the optimizer never sees.
    // Omitting `search` keeps cache-bust queries such as card-back.webp?v=6
    // valid.
    localPatterns: [{ pathname: '/pics/**' }, { pathname: '/buddy/**' }],
    remotePatterns: [{ protocol: 'https', hostname: 'cdn.sanity.io' }],
  },

  async headers() {
    // Content-Security-Policy shipped in REPORT-ONLY first: it breaks nothing
    // but surfaces violations so we can validate the allowlist (OpenFreeMap
    // tiles, Firebase Auth, Stripe Checkout, GA) on staging before flipping to
    // an enforcing `Content-Security-Policy`. 'unsafe-inline' on script-src is
    // required by the synchronous CRITICAL_BOOTSTRAP and the gtag shim (no
    // nonce plumbing in the static App Router output yet). Sentry is tunnelled
    // through same-origin /monitoring, so it needs no extra connect-src host.
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://apis.google.com",
      // No third-party stylesheet any more: Adobe's kit CSS is gone and the
      // @font-face rules live in app/globals.css. Only the font FILES are
      // still fetched from Adobe, which font-src below covers.
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://cdn.sanity.io https://*.googleusercontent.com https://www.googletagmanager.com https://www.google-analytics.com",
      "font-src 'self' data: https://use.typekit.net",
      "connect-src 'self' https://cdn.sanity.io https://tiles.openfreemap.org https://*.googleapis.com https://*.firebaseio.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.firebaseapp.com https://www.google-analytics.com https://*.analytics.google.com",
      "frame-src 'self' https://*.firebaseapp.com https://checkout.stripe.com https://accounts.google.com",
      "worker-src 'self' blob:",
      "form-action 'self' https://checkout.stripe.com",
    ].join('; ');
    const immutableAssetHeaders = [
      { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
    ];

    return [
      {
        source: '/css/:path*',
        headers: immutableAssetHeaders,
      },
      {
        source: '/pics/:path*',
        headers: immutableAssetHeaders,
      },
      {
        source: '/buddy/:path*',
        headers: immutableAssetHeaders,
      },
      {
        source: '/fonts/:path*',
        headers: immutableAssetHeaders,
      },
      {
        // Der Kartenstyle (siehe scripts/build-basemap-style.mts).
        // Die Middleware fasst ihn nicht an — ihr Matcher schliesst alles mit
        // Punkt im Pfad aus —, die CDN-Antwort bleibt also cachebar.
        // Bewusst NICHT `immutable`: die Dateinamen tragen keine Version, und
        // eine Karte, die sich zweimal im Jahr aendert, braucht kein
        // Cache-Busting, das jemand von Hand pflegen muesste.
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
          // Required for Firebase signInWithPopup to poll popup.closed without console warnings.
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
    // Same-origin Firebase Auth helper (official "Option 3" reverse proxy):
    // serving /__/auth/* from our own domain makes the signInWithPopup
    // credential return same-origin (no COOP/storage-access breakage) and
    // the Google consent screen shows "Weiter zu eatthisdot.com" instead of
    // the raw firebaseapp.com project domain. /__/firebase/init.json is
    // fetched by the helper, hence the broad /__/ prefix.
    return [
      {
        source: '/__/:path*',
        destination: `https://${firebaseAuthProjectId}.firebaseapp.com/__/:path*`,
      },
    ];
  },

  async redirects() {
    return [
      // Engelbecken — Sanity-Slug hatte historisch "engelsbecken" (Typo);
      // offiziell schreibt sich das Restaurant Engelbecken (eigene Domain
      // engelbecken.de). Slug umgezogen, alte URL 308 → neue.
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
      // Bäckereien-Guide lag doppelt im Index: NEWS_GUIDES und ein Sanity-
      // newsArticle teilten sich den Slug, beide selbst-kanonisch, beide in der
      // Sitemap. Google hat sie durchweg gegeneinander ausgespielt (der Guide
      // 20-30 Plätze schlechter). Guide-Eintrag entfernt, URL 308 → Artikel.
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
      // Die drei verbliebenen Guides waren derselbe Fall eine Ebene weiter:
      // jeder doppelte die Absicht seiner Kategorieseite, beide selbst-
      // kanonisch, beide in der Sitemap — beste-cafes-berlin trug sogar
      // denselben Title wie /kategorie/coffee. Die Kategorieseite gewinnt
      // jeden Vergleich (mehr Text, mehr Spots, FAQ-Schema, Bezirks-
      // Querlinks) und ist der Ort, auf den die Navigation zeigt; auf die
      // Guides verlinkte intern nichts.
      ...GUIDE_TO_CATEGORY.flatMap(([slug, category]) => [
        { source: `/guides/${slug}`, destination: `/kategorie/${category}`, permanent: true },
        {
          source: `/en/guides/${slug}`,
          destination: `/en/kategorie/${category}`,
          permanent: true,
        },
      ]),
      // /news/markthalle9 war ein Sanity-Artikel, der gelöscht wurde — die URL
      // liefert seither 404, sammelt in der Search Console aber weiter
      // Impressionen (8 in 90 Tagen, Ø-Position 14). Die Markthalle Neun liegt
      // in Kreuzberg; der Bezirks-Guide ist die nächstliegende Antwort auf
      // dieselbe Frage. Kein eigener Spot in Sanity, auf den es zeigen könnte.
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

// Sentry build plugin: uploads sourcemaps + creates a release per build, so
// minified production stack traces resolve back to source in the dashboard.
// Source-maps upload is gated by SENTRY_AUTH_TOKEN — without it the plugin
// warns and skips the upload, the build itself does not fail.
export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  // Tunneling routes errors through our own /monitoring endpoint, dodging
  // ad-blockers that strip Sentry calls. Cheap insurance for prod traffic.
  tunnelRoute: '/monitoring',
  // Tree-shake code we never run.
  //
  // These are the `webpack.treeshake` keys, NOT `bundleSizeOptimizations`.
  // In @sentry/nextjs 10.57.0 only this shape reaches the DefinePlugin that
  // actually drops the code — see setupTreeshakingFromConfig in
  // node_modules/@sentry/nextjs/build/cjs/config/webpack.js:549. The names
  // differ too (`removeTracing`, not `excludeTracing`).
  //
  // `removeTracing` is the big one: measured 188 kB → 136 kB "First Load JS
  // shared by all", i.e. 52 kB gzip off EVERY page. What goes with it is
  // performance tracing — spans, transactions, Web Vitals, trace headers on
  // our own API calls. Error reporting is untouched: captureException,
  // stack traces, breadcrumbs, source-map resolution all still work. At
  // tracesSampleRate 0.1 and this traffic the traces were never a usable
  // sample anyway, and Lighthouse CI measures Web Vitals against production
  // on every main push.
  //
  // Note this applies to the server and edge bundles too — Next runs the
  // webpack config function three times and the DefinePlugin is added on
  // every pass. Hence tracesSampleRate is gone from all three Sentry configs.
  //
  // Session Replay is disabled, so its iframe/shadow-DOM/worker helpers are
  // dead weight; removeDebugLogging drops Sentry's internal debug logging.
  //
  // The old `bundleSizeOptimizations` block is gone: measured with and
  // without it, the bundle came out at 137 kB either way. It is forwarded to
  // @sentry/webpack-plugin and may do something in other setups, but here it
  // did nothing — and keeping a second, differently-named block around is
  // exactly what made the previous comment claim a saving that never existed.
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
