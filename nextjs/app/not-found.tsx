import type { Metadata } from 'next';
import ClientIntlProvider from './[locale]/ClientIntlProvider';
import NotFoundAppFrame from './components/NotFoundAppFrame';
import NotFoundContent from './components/NotFoundContent';
import { translations } from '@/lib/i18n/translations';

export const metadata: Metadata = {
  title: '404 — Eat This',
  robots: { index: false, follow: false },
};

// Root-level 404 — used when routes outside the [locale] tree (like
// /welcome) hit notFound(). Provides its own html/body since the root
// layout is a pass-through.
export default function NotFound() {
  return (
    <html lang="de">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#fff' }}>
        <ClientIntlProvider locale="de" messages={translations.de}>
          <NotFoundAppFrame>
            <NotFoundContent locale="de" homeHref="/" />
          </NotFoundAppFrame>
        </ClientIntlProvider>
      </body>
    </html>
  );
}
