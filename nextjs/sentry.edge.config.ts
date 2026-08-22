// Sentry init for the Edge runtime (middleware, edge route handlers).
// Limited API surface vs. Node — no node:fs, no native deps.
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // No tracesSampleRate: removeTracing in next.config.ts strips tracing from
  // the server and edge bundles too (Next runs the webpack config for all
  // three runtimes), so this would be inert.
  environment: process.env.NODE_ENV,
  sendDefaultPii: true,
});
