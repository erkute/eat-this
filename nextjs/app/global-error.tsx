'use client';

// Catches errors that escape the React tree (including root layout errors)
// and forwards them to Sentry. Required for Sentry to see crashes that
// happen above [locale]/layout.tsx — without this, those silently bypass
// any per-route error boundary.
//
// Ersetzt das Root-Layout samt <html>/<body>, also ist hier nichts von dort
// garantiert: globals.css (Tokens, Providence-@font-face) wird darum selbst
// importiert, und der Ink-Grund steht zusätzlich inline am <body> — steht
// das Stylesheet nicht, bleibt die Seite trotzdem dunkel statt weiß.
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import ServerErrorContent from './components/ServerErrorContent';
import { sans } from './fonts';
import './globals.css';

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
    <html lang="de" className={sans.variable}>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#15120e' }}>
        <ServerErrorContent onRetry={reset} />
      </body>
    </html>
  );
}
