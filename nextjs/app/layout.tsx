import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  /* Match the ink masthead and modal canvas in mobile browser chrome. */
  themeColor: '#15120e',
};

export const metadata: Metadata = {
  title: {
    template: '%s | EAT THIS',
    default: 'EAT THIS – Restaurants & Geheimtipps',
  },
  description:
    'Die kuratierte Food-Map mit den besten Restaurants, Cafés und Bars in Berlin. Frag Remy, unsere KI-Suche, und finde sofort deinen Spot.',
  metadataBase: new URL('https://www.eatthisdot.com'),
  /* Installed to the home screen the page owns the whole screen, unlike a
     Safari tab where the status-bar band belongs to the browser and
     env(safe-area-inset-top) is 0 (measured on-device 2026-07-27).
     'black-translucent' is what actually extends the content under the status
     bar — 'default' keeps the bar opaque and insets the page. Pairs with the
     viewportFit: 'cover' above; without both, the inset stays 0. */
  appleWebApp: {
    capable: true,
    title: 'EAT THIS',
    statusBarStyle: 'black-translucent',
  },
  // Site-wide social-card defaults (Google, Meta/WhatsApp, Twitter/X) —
  // routes with richer cards (restaurant, news, …) override these.
  openGraph: {
    type: 'website',
    siteName: 'EAT THIS',
    images: [
      {
        url: 'https://www.eatthisdot.com/pics/og-card.png?v=4',
        width: 1200,
        height: 1200,
        alt: 'EAT THIS – We tell you what to eat',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@eatthisdotcom',
  },
};

// Root layout is a pass-through; <html>/<body> live in app/[locale]/layout.tsx
// so lang attribute can be locale-aware.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
