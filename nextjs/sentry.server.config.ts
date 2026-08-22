// Sentry init for the Node.js runtime (RSC, Route Handlers, Middleware on
// Node). Loaded by instrumentation.ts at server boot.
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // No tracesSampleRate: removeTracing in next.config.ts strips tracing from
  // the server and edge bundles too (Next runs the webpack config for all
  // three runtimes), so this would be inert.
  environment: process.env.NODE_ENV,
  sendDefaultPii: true,
});
