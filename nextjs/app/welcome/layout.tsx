import type { Metadata } from 'next';
import '../globals.css';
import { sans } from '@/app/fonts';
import AnalyticsPageViews from '@/app/components/AnalyticsPageViews';

export const metadata: Metadata = {
  title: 'Anmeldung',
  robots: { index: false, follow: false },
};

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
    <html lang="de" data-scroll-behavior="smooth" className={sans.variable}>
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
      <body style={{ margin: 0, padding: 0, backgroundColor: '#fff' }}>
        {/* /welcome lag ausserhalb von [locale] und wurde deshalb gar nicht
            gezaehlt — ausgerechnet die Landeseite des Magic-Links, also der
            Moment, in dem aus einem Besucher ein Konto wird. Passend dazu:
            43 login_start, 15 login_link_sent, 1 sign_up (8 Tage, Aug 2026).
            Ob der Abschluss klemmt oder nur unsichtbar war, liess sich nicht
            unterscheiden.

            Hier steht bewusst KEIN CookieConsent: der Dialog zieht seine Texte
            ueber next-intl, und diese Route hat keinen Provider (eigener
            <html>-Baum ausserhalb von [locale]) — er wuerde werfen. Noetig ist
            er hier auch nicht: ohne Zustimmung laedt loadAnalytics() kein GA,
            gezaehlt wird nur consent-frei ueber /api/count. Und eine
            blockierende Frage mitten im Login waere genau der falsche Ort.
            Wer noch nicht geantwortet hat, bekommt die Frage nach der
            Weiterleitung auf der Zielseite. */}
        <AnalyticsPageViews />
        {children}
      </body>
    </html>
  );
}
