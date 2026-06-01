import type { Metadata } from 'next';
import { Chewy } from 'next/font/google';

export const metadata: Metadata = {
  title:   'Anmeldung — Eat This',
  robots:  { index: false, follow: false },
};

// /welcome has its own root layout (separate <html> tree), so it doesn't get
// the Chewy display font from app/[locale]/layout. Load it here too — next/font
// dedupes, so this shares the cached face. Exposed as --font-chewy for the
// Chewy-restyled auth-action.module.css.
const chewy = Chewy({
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
    <html lang="de" data-scroll-behavior="smooth" className={chewy.variable}>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#fbf8ee' }}>
        {children}
      </body>
    </html>
  );
}
