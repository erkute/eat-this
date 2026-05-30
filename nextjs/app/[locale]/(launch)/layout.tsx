import type { Metadata, Viewport } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { hasLocale } from 'next-intl'
import { routing } from '@/i18n/routing'

const SITE_URL = 'https://www.eatthisdot.com'

export const metadata: Metadata = {
  title: 'Eat This — The Map for people who care about food.',
  description:
    'Berlin Food Map · Launch 30.06.2026. Trag dich für Updates ein und sei dabei wenn die Map aufmacht.',
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: 'website',
    siteName: 'Eat This',
    title: 'Eat This — The Map for people who care about food.',
    description: 'Berlin Food Map · Launch 30.06.2026.',
    url: SITE_URL,
    images: [{ url: SITE_URL + '/pics/og-card.png', width: 1200, height: 630, alt: 'EAT THIS – We tell you what to eat' }],
    locale: 'de_DE',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@eatthisdotcom',
    title: 'Eat This — The Map for people who care about food.',
    description: 'Berlin Food Map · Launch 30.06.2026.',
    images: [SITE_URL + '/pics/og-card.png'],
  },
}

/* Safari URL-bar + status-bar tint. Matches the launch page paper
   surface (and the launch-cat.mp4 top-corner bg) so the iOS chrome
   doesn't peek as cream while the page is grey-white. */
export const viewport: Viewport = {
  themeColor: '#f5f5f5',
}

export default async function LaunchLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  setRequestLocale(locale)

  return <>{children}</>
}
