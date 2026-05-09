// Sentry init for the Edge runtime (middleware, edge route handlers).
// Limited API surface vs. Node — no node:fs, no native deps.
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
  sendDefaultPii: true,
})
