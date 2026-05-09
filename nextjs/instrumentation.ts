// Next.js calls register() once at server startup per runtime. Conditionally
// load the right Sentry config — the edge bundle can't pull in node:* deps.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

// Surface server-side request errors to Sentry from the new
// onRequestError hook (Next 15+).
export { captureRequestError as onRequestError } from '@sentry/nextjs'
