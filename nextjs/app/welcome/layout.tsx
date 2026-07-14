import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';

export const metadata: Metadata = {
  title:   'Anmeldung',
  robots:  { index: false, follow: false },
};

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export default function AuthActionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" data-scroll-behavior="smooth" className={dmSans.variable}>
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/kgb1lmh.css" />
        <style>{`:root { --font-chewy: 'moonblossom-1', 'moonblossom-2', 'moonblossom', 'Providence Sans Pro Regular', sans-serif; }`}</style>
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#fbf8ee' }}>
        {children}
      </body>
    </html>
  );
}
