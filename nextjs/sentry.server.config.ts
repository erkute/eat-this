// Sentry init for the Node.js runtime (RSC, Route Handlers, Middleware on
// Node). Loaded by instrumentation.ts at server boot.
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
  sendDefaultPii: true,
})
