import type { Metadata } from 'next'
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
    locale: 'de_DE',
  },
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
