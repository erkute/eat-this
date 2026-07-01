import type { Metadata } from 'next';
import 'maplibre-gl/dist/maplibre-gl.css';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { routing } from '@/i18n/routing';
import { CSS_VERSION } from '@/lib/constants';
import { AuthProvider, LoginModalProvider } from '@/lib/auth';
import { UserLocationProvider } from '@/lib/map/UserLocationContext';
import SiteNav from '@/app/components/SiteNav';
import BurgerDrawer from '@/app/components/BurgerDrawer';
import SearchOverlay from '@/app/components/SearchOverlayLazy';
import CookieConsent from '@/app/components/CookieConsent';
import BuddyWidget from '@/app/components/buddy/BuddyWidgetLazy';
import FloatingRemy from '@/app/components/buddy/FloatingRemy';
import MapBrowserChrome from '@/app/components/MapBrowserChrome';
import BridgeAuth from './BridgeAuth';

const SITE_URL = 'https://www.eatthisdot.com';

const TITLE = 'EAT THIS – Restaurants & Geheimtipps';
const DESCRIPTION =
  'Die kuratierte Food-Map mit Berlins besten Restaurants, Cafés und Bars — plus exklusive Must Eats. Frag Remy, unsere KI-Suche, und finde sofort deinen Spot.';
const OG_IMAGE = SITE_URL + '/pics/og-card.png?v=4';

export const metadata: Metadata = {
  // `absolute` bypasses the root '%s | Eat This Berlin' template — the brand
  // title already carries "Berlin"; the suffix would just duplicate it. The
  // template re-establishes the suffix for child segments (news, about, …)
  // because `absolute` would otherwise null it out for the whole subtree.
  title: { absolute: TITLE, template: '%s | Eat This Berlin' },
  description: DESCRIPTION,
  robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  openGraph: {
    type: 'website',
    siteName: 'EAT THIS',
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    images: [
      { url: OG_IMAGE, width: 1200, height: 1200, alt: 'EAT THIS – We tell you what to eat' },
    ],
    locale: 'de_DE',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@eatthisdotcom',
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export default async function SPALayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <>
      {/* Full SPA stylesheet — hoisted to <head> by Next.js */}
      <link rel="stylesheet" href={`/css/style.min.css?v=${CSS_VERSION}`} precedence="default" />

      {/* Sanity image CDN only — map/search data flows through same-origin
          /api/map-data, so the browser (almost) never talks to apicdn. */}
      <link rel="preconnect" href="https://cdn.sanity.io" crossOrigin="anonymous" />
      <link rel="manifest" href="/manifest.json" />
      <link rel="icon" type="image/x-icon" href="/favicon.ico?v=7" />
      <link rel="icon" type="image/png" sizes="192x192" href="/pics/favicon-192.png?v=7" />
      <link rel="apple-touch-icon" sizes="192x192" href="/pics/favicon-192.png?v=7" />

      <AuthProvider>
        <LoginModalProvider>
          <UserLocationProvider>
            <BridgeAuth />
            <MapBrowserChrome />
            <SiteNav />
            <BurgerDrawer />
            <div className="app-pages" id="appPages">
              {children}
            </div>
            <SearchOverlay />
            <CookieConsent />
            <BuddyWidget />
            <FloatingRemy />
          </UserLocationProvider>
        </LoginModalProvider>
      </AuthProvider>
    </>
  );
}
