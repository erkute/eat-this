'use client';

// Catches errors that escape the React tree (including root layout errors)
// and forwards them to Sentry. Required for Sentry to see crashes that
// happen above [locale]/layout.tsx — without this, those silently bypass
// any per-route error boundary.
//
// Ersetzt das Root-Layout samt <html>/<body>, also ist hier nichts von dort
// garantiert: globals.css (Tokens, @font-face) wird darum selbst
// importiert, und der Seitengrund steht zusätzlich inline am <body>.
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import ServerErrorContent from './components/ServerErrorContent';
import './globals.css';
import { ERROR_THEME_BOOTSTRAP } from '@/lib/theme';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: ERROR_THEME_BOOTSTRAP }} />
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: 'var(--et-ground, #fff)' }}>
        <ServerErrorContent onRetry={reset} />
      </body>
    </html>
  );
}
