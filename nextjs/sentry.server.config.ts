// Sentry init for the Node.js runtime (RSC, Route Handlers, Middleware on
// Node). Loaded by instrumentation.ts at server boot.
import * as Sentry from '@sentry/nextjs';

import {
  SENTRY_TUNNEL_PATH,
  sentryDataCollection,
  sentryEnabled,
  sentryEnvironment,
} from '@/lib/sentry/environment';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Nur auf App Hosting, nie aus lokalen Servern (lib/sentry/environment.ts).
  enabled: sentryEnabled(),
  // No tracesSampleRate: removeTracing in next.config.ts strips tracing from
  // the server and edge bundles too (Next runs the webpack config for all
  // three runtimes), so this would be inert.
  environment: sentryEnvironment(),
  dataCollection: sentryDataCollection,
  // Nimmt die Meldungen des Browsers an (lib/sentry/client-sdk.ts) und reicht
  // sie an Sentry weiter.
  integrations: [Sentry.serveTunnelIntegration({ path: SENTRY_TUNNEL_PATH })],
});
