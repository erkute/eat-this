import type { Metadata } from 'next'
import { I18nProvider } from '@/lib/i18n'
import BridgeI18n from './BridgeI18n'

export const metadata: Metadata = {
  title: 'EAT THIS — Probably the best food guide you know - We tell you what to eat',
  description:
    "Just Order This: Your curated Berlin food guide. Collect all Eat Cards, discover exclusive Must-Eats on the interactive map & hunt down the best dishes in the city. Taste it all!",
  robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  alternates: {
    canonical: 'https://www.eatthisdot.com/',
    languages: {
      de: 'https://www.eatthisdot.com/',
      en: 'https://www.eatthisdot.com/?lang=en',
      'x-default': 'https://www.eatthisdot.com/',
    },
  },
  openGraph: {
    type: 'website',
    siteName: 'EAT THIS',
    title: 'EAT THIS — Probably the best food guide you know - We tell you what to eat',
    description:
      "Just Order This: Your curated Berlin food guide. Collect all Eat Cards, discover exclusive Must-Eats on the interactive map & hunt down the best dishes in the city. Taste it all!",
    url: 'https://www.eatthisdot.com',
    images: [{ url: 'https://www.eatthisdot.com/pics/og-image.jpg', width: 1200, height: 630, alt: 'EAT THIS — Berlin Food Guide' }],
    locale: 'de_DE',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@eatthisdotcom',
    title: 'EAT THIS — Probably the best food guide you know - We tell you what to eat',
    description:
      "Just Order This: Your curated Berlin food guide. Collect all Eat Cards & discover Must-Eats on the interactive map. Taste it all!",
    images: ['https://www.eatthisdot.com/pics/og-image.jpg'],
  },
}

export default function SPALayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Full SPA stylesheet — hoisted to <head> by Next.js */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/css/style.min.css?v=24" precedence="default" />

      {/* Preconnect for Sanity CDN */}
      <link rel="preconnect" href="https://ehwjnjr2.apicdn.sanity.io" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://cdn.sanity.io" crossOrigin="anonymous" />

      {/* Manifest + favicon */}
      <link rel="manifest" href="/manifest.json" />
      <link rel="icon" type="image/x-icon" href="/favicon.ico" />
      <link rel="icon" type="image/png" sizes="192x192" href="/pics/favicon-192.png" />
      <link rel="apple-touch-icon" sizes="192x192" href="/pics/favicon-192.png" />

      {/* SPA body content — wrapped in i18n context */}
      <I18nProvider>
        <BridgeI18n />
        {children}
      </I18nProvider>

    </>
  )
}
