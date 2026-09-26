// Next.js calls register() once at server startup per runtime. Conditionally
// load the right Sentry config — the edge bundle can't pull in node:* deps.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
    // Nur im laufenden Produktionsserver — nicht in `next dev`, nicht in den
    // Workern von `next build`.
    if (
      process.env.NODE_ENV === 'production' &&
      process.env.NEXT_PHASE !== 'phase-production-build'
    ) {
      const { scheduleSelfWarmup } = await import('./lib/warmup/selfWarmup');
      scheduleSelfWarmup();
    }
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Surface server-side request errors to Sentry from the new
// onRequestError hook (Next 15+).
export { captureRequestError as onRequestError } from '@sentry/nextjs';
