import type { Metadata } from 'next'
import Script from 'next/script'
import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { hasLocale } from 'next-intl'
import { routing } from '@/i18n/routing'
import { AuthProvider } from '@/lib/auth'
import SiteNav from '@/app/components/SiteNav'
import BridgeI18n from './BridgeI18n'
import BridgeAuth from './BridgeAuth'

const SITE_URL = 'https://www.eatthisdot.com'

export const metadata: Metadata = {
  title: 'EAT THIS — Probably the best food guide you know - We tell you what to eat',
  description:
    "Just Order This: Your curated Berlin food guide. Collect all Eat Cards, discover exclusive Must-Eats on the interactive map & hunt down the best dishes in the city. Taste it all!",
  robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  alternates: {
    canonical: SITE_URL + '/',
    languages: {
      de: SITE_URL + '/',
      en: SITE_URL + '/en',
      'x-default': SITE_URL + '/',
    },
  },
  openGraph: {
    type: 'website',
    siteName: 'EAT THIS',
    title: 'EAT THIS — Probably the best food guide you know - We tell you what to eat',
    description:
      "Just Order This: Your curated Berlin food guide. Collect all Eat Cards, discover exclusive Must-Eats on the interactive map & hunt down the best dishes in the city. Taste it all!",
    url: SITE_URL,
    images: [{ url: SITE_URL + '/pics/og-image.jpg', width: 1200, height: 630, alt: 'EAT THIS — Berlin Food Guide' }],
    locale: 'de_DE',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@eatthisdotcom',
    title: 'EAT THIS — Probably the best food guide you know - We tell you what to eat',
    description:
      "Just Order This: Your curated Berlin food guide. Collect all Eat Cards & discover Must-Eats on the interactive map. Taste it all!",
    images: [SITE_URL + '/pics/og-image.jpg'],
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
      <link rel="stylesheet" href="/css/style.min.css?v=24" precedence="default" />

      <link rel="preconnect" href="https://ehwjnjr2.apicdn.sanity.io" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://cdn.sanity.io" crossOrigin="anonymous" />

      <link rel="manifest" href="/manifest.json" />
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      <link rel="icon" type="image/png" sizes="192x192" href="/pics/favicon-192.png" />
      <link rel="apple-touch-icon" sizes="192x192" href="/pics/favicon-192.png" />

      <AuthProvider>
        <BridgeI18n />
        <BridgeAuth />
        <SiteNav />
        {children}
      </AuthProvider>

      {/* Legacy SPA scripts — load AFTER React hydrates. Will be removed in Phase B. */}
      <Script src="/js/legacy-domready-shim.js" strategy="afterInteractive" />
      <Script src="/js/legacy-locale-shim.js" strategy="beforeInteractive" />
      <Script src="/js/cms.min.js" strategy="afterInteractive" />
      {/* i18n.min.js dropped in Phase C — BridgeI18n provides window.i18n. */}
      <Script src="/js/app.min.js?v=21" strategy="afterInteractive" />
      <Script src="/js/auth-loader.min.js" strategy="afterInteractive" />
    </>
  )
}
