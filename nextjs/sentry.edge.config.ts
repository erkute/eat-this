// Sentry init for the Edge runtime (middleware, edge route handlers).
// Limited API surface vs. Node — no node:fs, no native deps.
import * as Sentry from '@sentry/nextjs';

import { sentryEnabled, sentryEnvironment } from '@/lib/sentry/environment';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Nur auf App Hosting, nie aus lokalen Servern (lib/sentry/environment.ts).
  enabled: sentryEnabled(),
  // No tracesSampleRate: removeTracing in next.config.ts strips tracing from
  // the server and edge bundles too (Next runs the webpack config for all
  // three runtimes), so this would be inert.
  environment: sentryEnvironment(),
  // Keine IP, keine Cookies (siehe instrumentation-client.ts).
  sendDefaultPii: false,
});
