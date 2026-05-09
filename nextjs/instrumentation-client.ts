// Next.js 15.3+ entry point for client-side Sentry init. Runs in the browser
// once before any page code. Replaces the older sentry.client.config.ts file.
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 10 % of transactions get a performance trace. Free tier has a quota,
  // so keep this conservative until we know real traffic shape.
  tracesSampleRate: 0.1,

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
})

// Required for next/navigation route-change instrumentation in app router.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
