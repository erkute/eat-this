import * as Sentry from '@sentry/nextjs';

import { filterBrowserErrors } from '@/lib/sentry/beforeSend';
import { SENTRY_DATA_COLLECTION } from '@/lib/sentry/dataCollection';
import { sentryEnabled, sentryEnvironment } from '@/lib/sentry/environment';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Nur auf App Hosting, nie aus lokalen Servern (lib/sentry/environment.ts).
  enabled: sentryEnabled(),

  // DOM-Ressourcenfehler und den bekannten Fehler der Urban-VPN-Erweiterung filtern.
  beforeSend: filterBrowserErrors,

  // Kein Session-Tracking (Release Health): es schickte pro Seitenaufruf
  // mehrere Umschläge über /monitoring, weit mehr als echte Fehler; Sentry
  // drosselt davon viele mit 429, und der Rewrite-Proxy verliert einige mit
  // HPE_HEADER_OVERFLOW. Ohne die Pings gehen nur Fehler über den Tunnel.
  integrations: (defaults) => defaults.filter((i) => i.name !== 'BrowserSession'),

  // No tracesSampleRate: performance tracing is tree-shaken out of the bundle
  // entirely (webpack.treeshake.removeTracing in next.config.ts). Setting it
  // here would be inert and misleading.

  // Staging, Produktion oder lokal — nicht `NODE_ENV`, das ist auf Staging
  // auch `production` (lib/sentry/environment.ts).
  environment: sentryEnvironment(),

  // Replay (session video) is opt-out by default — heavy on the free tier
  // and adds substantial bundle weight. Re-enable only if a debugging
  // session genuinely needs it.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  // Keine IP, keine Cookies, keine Bodies (lib/sentry/dataCollection.ts).
  dataCollection: SENTRY_DATA_COLLECTION,
});

export const captureException = Sentry.captureException;
export const captureMessage = Sentry.captureMessage;
