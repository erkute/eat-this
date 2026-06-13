import type { NextConfig } from "next";
import path from "path";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.resolve(__dirname),
  // Satori fonts for the composed email spot-card image — read via
  // fs.readFile at runtime, so the tracer can't see them on its own.
  outputFileTracingIncludes: {
    "/api/email/spot-card": ["./assets/fonts/**/*"],
    "/api/og/restaurant": ["./assets/fonts/**/*"],
  },

  images: {
    // Sanity already serves WebP via ?auto=format. The custom loader hits
    // cdn.sanity.io directly with width-modulated query params, so the
    // default /_next/image proxy is skipped. Wired globally via loaderFile
    // because per-<Image> `loader` props can't cross the Server → Client
    // component boundary in App Router.
    loader: "custom",
    loaderFile: "./lib/sanityImageLoader.ts",
    remotePatterns: [
      { protocol: "https", hostname: "cdn.sanity.io" },
    ],
  },

  async headers() {
    // Content-Security-Policy shipped in REPORT-ONLY first: it breaks nothing
    // but surfaces violations so we can validate the allowlist (CARTO map
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
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://cdn.sanity.io https://*.cartocdn.com https://*.googleusercontent.com https://www.googletagmanager.com https://www.google-analytics.com",
      "font-src 'self' data:",
      "connect-src 'self' https://cdn.sanity.io https://*.cartocdn.com https://*.googleapis.com https://*.firebaseio.com https://firestore.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://*.firebaseapp.com https://www.google-analytics.com https://*.analytics.google.com",
      "frame-src 'self' https://*.firebaseapp.com https://checkout.stripe.com https://accounts.google.com",
      "worker-src 'self' blob:",
      "form-action 'self' https://checkout.stripe.com",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          // Required for Firebase signInWithPopup to poll popup.closed without console warnings.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "Content-Security-Policy-Report-Only", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
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
        source: "/__/:path*",
        destination: "https://eat-this-8a13b.firebaseapp.com/__/:path*",
      },
    ];
  },

  async redirects() {
    return [
      // Engelbecken — Sanity-Slug hatte historisch "engelsbecken" (Typo);
      // offiziell schreibt sich das Restaurant Engelbecken (eigene Domain
      // engelbecken.de). Slug umgezogen, alte URL 308 → neue.
      { source: "/restaurant/engelsbecken", destination: "/restaurant/engelbecken", permanent: true },
      { source: "/en/restaurant/engelsbecken", destination: "/en/restaurant/engelbecken", permanent: true },
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
  // Tree-shake code we never run. Session Replay is disabled, so its
  // iframe/shadow-DOM/worker helpers are dead weight in the client bundle;
  // excludeDebugStatements drops Sentry's internal debug logging. Trims the
  // ~126 KB gzip Sentry chunk without touching runtime error reporting.
  bundleSizeOptimizations: {
    excludeReplayIframe: true,
    excludeReplayShadowDom: true,
    excludeReplayWorker: true,
    excludeDebugStatements: true,
  },
});
