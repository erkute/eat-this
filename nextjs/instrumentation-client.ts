// Next.js 15.3+ entry point for client-side Sentry init. Runs in the browser
// once before any page code. Replaces the older sentry.client.config.ts file.
import * as Sentry from '@sentry/nextjs';

import { dropResourceLoadErrors } from '@/lib/sentry/beforeSend';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Ein gescheitertes <link>/<script> kommt als DOM-Event über den
  // Rejection-Handler herein — ohne Titel, ohne Stacktrace. Solche Events
  // haben JAVASCRIPT-3N gefüllt (56 Stück seit Mai, überwiegend Bots und
  // Chunk-404s direkt nach einem Deploy). Der Filter wirft nur diese weg;
  // echte Fehler mit Stacktrace bleiben unberührt (siehe lib/sentry/beforeSend.ts).
  beforeSend: dropResourceLoadErrors,

  // No tracesSampleRate: performance tracing is tree-shaken out of the bundle
  // entirely (webpack.treeshake.removeTracing in next.config.ts). Setting it
  // here would be inert and misleading.

  // Capture browser-build context so the dashboard shows release names
  // and minified stack traces resolve back to source via uploaded sourcemaps.
  environment: process.env.NODE_ENV,

  // Replay (session video) is opt-out by default — heavy on the free tier
  // and adds substantial bundle weight. Re-enable only if a debugging
  // session genuinely needs it.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  // PII collection is ON per project decision (2026-05-09): IP and User-Agent
  // help debug "this crash only hits Safari 17 in Berlin" without round-trips.
  sendDefaultPii: true,
});

// No onRouterTransitionStart export: it only feeds navigation SPANS, and
// `Sentry.captureRouterTransitionStart` is tree-shaken away with the rest of
// tracing — exporting it would hand Next.js an `undefined` hook.
