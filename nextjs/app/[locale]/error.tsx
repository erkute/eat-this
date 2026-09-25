'use client';

// Segment error boundary for everything below [locale]/layout.tsx. Before
// this existed, any render/data error on a page (e.g. a Sanity CDN timeout
// on a dynamic route) escalated straight to the bare global-error screen.
// The [locale] layout stays mounted, so globals.css and the html/body shell
// are still there — we only render the inner screen, mirroring not-found.
//
// Deliberately minimal dependencies: no providers, no nav, no i18n context.
// Those can be part of the failure; the boundary must not crash itself.
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import ServerErrorContent from '../components/ServerErrorContent';

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return <ServerErrorContent onRetry={reset} />;
}
