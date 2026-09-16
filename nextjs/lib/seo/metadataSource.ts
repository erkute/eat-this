import * as Sentry from '@sentry/nextjs';

/**
 * Wraps a Sanity read that feeds `generateMetadata`.
 *
 * A metadata function is a generation function to Next: whatever it throws is
 * unhandled, and the request dies before the body ever runs. The throw we
 * actually see in production is never bad data, it is the transport — a socket
 * Sanity's CDN had already closed, or a TLS handshake that failed seconds after
 * a cold start (Sentry JAVASCRIPT-6J and siblings). For that class of failure a
 * page without `<title>` beats no page at all, so the read degrades to `null`
 * and every call site's existing "no document" branch takes over.
 *
 * Deliberately NOT applied to the page body: there a failed read means there is
 * nothing to render, and the error is what stops Next from caching a broken
 * page for the next 24 hours. The same holds here in the normal case, because
 * body and metadata run the same query — Next dedupes them, and when it fails
 * the body throws anyway. Only where the body reads something else can a
 * request survive with generic metadata, and that is the trade this makes.
 *
 * Errors still reach Sentry, as `warning` and handled, so the transport
 * failures stay countable instead of disappearing into a silent catch.
 */
export async function metadataSource<T>(load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch (error) {
    Sentry.captureException(error, {
      level: 'warning',
      tags: { metadata_source: 'sanity' },
    });
    return null;
  }
}
