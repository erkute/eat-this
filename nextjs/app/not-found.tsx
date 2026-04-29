import type { Metadata } from 'next';
import NotFoundContent from './components/NotFoundContent';

export const metadata: Metadata = {
  title:  'Nicht gefunden — Eat This',
  robots: { index: false, follow: false },
};

// Root-level 404 — used when routes outside the [locale] tree (like
// /welcome) hit notFound(). Provides its own html/body since the root
// layout is a pass-through.
export default function NotFound() {
  return (
    <html lang="de">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#F7F2E8' }}>
        <NotFoundContent homeHref="/" />
      </body>
    </html>
  );
}
