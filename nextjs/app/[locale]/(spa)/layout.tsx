import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { hasLocale } from 'next-intl'
import { routing } from '@/i18n/routing'
import { AuthProvider, LoginModalProvider } from '@/lib/auth'
import SiteNav from '@/app/components/SiteNav'
import BurgerDrawer from '@/app/components/BurgerDrawer'
import NotificationToast from '@/app/components/NotificationToast'
import SearchOverlay from '@/app/components/SearchOverlay'
import CookieConsent from '@/app/components/CookieConsent'
import BridgeAuth from './BridgeAuth'

const SITE_URL = 'https://www.eatthisdot.com'

const TITLE = 'EAT THIS – Berlin Food Guide: Restaurants & Geheimtipps'
const DESCRIPTION =
  'We tell you what to eat — die kuratierte Food Map mit den besten Restaurants, Cafés und Bars in Berlin. Dazu exklusive Must Eats auf der interaktiven Karte.'
const OG_IMAGE = SITE_URL + '/pics/og-card.png'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  openGraph: {
    type: 'website',
    siteName: 'EAT THIS',
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'EAT THIS – We tell you what to eat' }],
    locale: 'de_DE',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@eatthisdotcom',
    title: TITLE,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
}

export default async function SPALayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  return (
    <>
      {/* Full SPA stylesheet — hoisted to <head> by Next.js */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/css/style.min.css?v=143" precedence="default" />

      <link rel="preconnect" href="https://ehwjnjr2.apicdn.sanity.io" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://cdn.sanity.io" crossOrigin="anonymous" />

      <link rel="manifest" href="/manifest.json" />
      <link rel="icon" type="image/x-icon" href="/favicon.ico?v=5" />
      <link rel="icon" type="image/png" sizes="192x192" href="/pics/favicon-192.png?v=5" />
      <link rel="apple-touch-icon" sizes="192x192" href="/pics/favicon-192.png?v=5" />

      <AuthProvider>
        <LoginModalProvider>
          <BridgeAuth />
          <SiteNav />
          <BurgerDrawer />
          <NotificationToast />
          <div className="app-pages" id="appPages">
            {children}
          </div>
          <SearchOverlay />
          <CookieConsent />
        </LoginModalProvider>
      </AuthProvider>
    </>
  )
}
