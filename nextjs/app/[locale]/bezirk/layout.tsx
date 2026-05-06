import { notFound } from 'next/navigation'
import { hasLocale } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { AuthProvider } from '@/lib/auth'
import SiteNav from '@/app/components/SiteNav'

export default async function BezirkLayout({
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
    <AuthProvider>
      {/* Full SPA stylesheet — needed for SiteNav/burger styling on this non-(spa) route */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/css/style.min.css?v=30" precedence="default" />
      <SiteNav />
      {children}
    </AuthProvider>
  )
}
