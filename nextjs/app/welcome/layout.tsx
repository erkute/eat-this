import type { Metadata } from 'next';
import { Schoolbell } from 'next/font/google';

export const metadata: Metadata = {
  title:   'Anmeldung — Eat This',
  robots:  { index: false, follow: false },
};

// /welcome has its own root layout (separate <html> tree), so it doesn't get
// the Schoolbell display font from app/[locale]/layout. Load it here too —
// next/font dedupes, so this shares the cached face. Exposed as --font-chewy
// (the legacy variable name the sitewide display aliases still point at).
const schoolbell = Schoolbell({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-chewy',
  display: 'swap',
});

export default function AuthActionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" data-scroll-behavior="smooth" className={schoolbell.variable}>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#fbf8ee' }}>
        {children}
      </body>
    </html>
  );
}
