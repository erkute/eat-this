import type { Metadata } from 'next';
import { DM_Sans } from 'next/font/google';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Anmeldung',
  robots: { index: false, follow: false },
};

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

// The two Providence faces the page actually sets. globals.css declares them
// via @font-face pointing straight at Adobe's font files; preloading here means
// the headline arrives in the brand face on first paint instead of swapping in
// afterwards. Only the font files — never Adobe's kit stylesheet, which pulls
// in their usage beacon and must not fire before consent. A test in
// __tests__/app/critical-bootstrap.test.ts guards this head.
const PROVIDENCE_REGULAR_WOFF2 =
  'https://use.typekit.net/af/4b2e2d/0000000000000000773599f0/31/l?subset_id=2&fvd=n4&v=3';
const PROVIDENCE_BOLD_WOFF2 =
  'https://use.typekit.net/af/98d132/0000000000000000773599ea/31/l?subset_id=2&fvd=n7&v=3';

// /welcome sits outside the [locale] tree and owns its own <html>. Until now it
// also owned its own, stale design contract: no brand font was loaded at all,
// and the palette was the retired cream one. Importing globals.css hands it the
// same @font-face rules and --et-* tokens the rest of the site runs on.
export default function AuthActionLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" data-scroll-behavior="smooth" className={dmSans.variable}>
      <head>
        <link rel="preconnect" href="https://use.typekit.net" crossOrigin="anonymous" />
        <link
          rel="preload"
          href={PROVIDENCE_REGULAR_WOFF2}
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href={PROVIDENCE_BOLD_WOFF2}
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#fff' }}>{children}</body>
    </html>
  );
}
