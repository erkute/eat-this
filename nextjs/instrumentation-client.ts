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

  // Kein Session-Tracking (Release Health). Es schickte pro Seitenaufruf drei
  // Umschläge über /monitoring — Start, sofort „exited" wegen der URL-Änderung
  // beim Laden, neuer Start —, rund 4.200 am Tag bei einer Handvoll echter
  // Fehler. Sentry drosselte davon täglich über hundert mit 429, und der
  // Rewrite-Proxy verlor einige mit HPE_HEADER_OVERFLOW (500 im Log).
  // Gemessen 25.09.2026; ohne die Pings gehen nur noch Fehler über den Tunnel.
  integrations: (defaults) => defaults.filter((i) => i.name !== 'BrowserSession'),

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

  // Keine IP (Betreiber, 02.10.2026). Der Cookie-Dialog verspricht für Sentry
  // höchstens eine pseudonymisierte IP; mit `true` (Projektentscheidung vom
  // 09.05.2026) speicherte Sentry die volle. Mit `false` schickt das SDK
  // `infer_ip: "never"`, Sentry leitet dann keine IP mehr ab. Browser und
  // Betriebssystem kommen weiter über den User-Agent an — das, was der
  // Dialog nennt.
  sendDefaultPii: false,
});

// No onRouterTransitionStart export: it only feeds navigation SPANS, and
// `Sentry.captureRouterTransitionStart` is tree-shaken away with the rest of
// tracing — exporting it would hand Next.js an `undefined` hook.
