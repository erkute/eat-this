import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import ClientIntlProvider from './[locale]/ClientIntlProvider';
import NotFoundAppFrame from './components/NotFoundAppFrame';
import NotFoundContent from './components/NotFoundContent';
import { translations } from '@/lib/i18n/translations';

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-sans',
});
const PROVIDENCE_REGULAR_WOFF2 =
  'https://use.typekit.net/af/4b2e2d/0000000000000000773599f0/31/l?subset_id=2&fvd=n4&v=3';
const PROVIDENCE_BOLD_WOFF2 =
  'https://use.typekit.net/af/98d132/0000000000000000773599ea/31/l?subset_id=2&fvd=n7&v=3';

export const metadata: Metadata = {
  title: '404 — Eat This',
  robots: { index: false, follow: false },
};

// Root-level 404 — used when routes outside the [locale] tree (like
// /welcome) hit notFound(). Provides its own html/body since the root
// layout is a pass-through.
export default function NotFound() {
  return (
    <html lang="de" className={dmSans.variable}>
      <head>
        <link rel="preconnect" href="https://use.typekit.net" crossOrigin="anonymous" />
        <link rel="preload" href={PROVIDENCE_REGULAR_WOFF2} as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href={PROVIDENCE_BOLD_WOFF2} as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://use.typekit.net/kgb1lmh.css" />
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#fff' }}>
        <ClientIntlProvider locale="de" messages={translations.de}>
          <NotFoundAppFrame>
            <NotFoundContent locale="de" />
          </NotFoundAppFrame>
        </ClientIntlProvider>
      </body>
    </html>
  );
}
