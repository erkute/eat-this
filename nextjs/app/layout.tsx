import type { Metadata, Viewport } from 'next'
import './globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  /* Cream paper matches the html/body bg in globals.css so iOS Safari's
     URL bar + status bar tint blends with the page surface instead of
     showing as a default white/grey stripe. Per-route overrides can
     replace this in their own layout. */
  themeColor: '#fbf8ee',
}

export const metadata: Metadata = {
  title: {
    template: '%s | Eat This Berlin',
    default: 'EAT THIS – Berlin Food Guide: Restaurants & Geheimtipps',
  },
  description:
    'Die kuratierte Food-Map mit den besten Restaurants, Cafés und Bars in Berlin. Frag Remy, unsere KI-Suche, und finde sofort deinen Spot.',
  metadataBase: new URL('https://www.eatthisdot.com'),
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
}

// Root layout is a pass-through; <html>/<body> live in app/[locale]/layout.tsx
// so lang attribute can be locale-aware.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children
}
