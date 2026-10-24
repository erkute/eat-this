import type { Metadata } from 'next';
import { ERROR_THEME_BOOTSTRAP } from '@/lib/theme';
import NotFoundContent from './components/NotFoundContent';

export const metadata: Metadata = {
  title: '404 — Eat This',
  robots: { index: false, follow: false },
};

// Root-level 404 — used when routes outside the [locale] tree hit
// notFound(). Provides its own html/body since the root
// layout is a pass-through.
export default function NotFound() {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: ERROR_THEME_BOOTSTRAP }} />
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: 'var(--et-ground, #fff)' }}>
        <NotFoundContent locale="de" />
      </body>
    </html>
  );
}
