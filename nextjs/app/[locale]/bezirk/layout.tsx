import { notFound } from 'next/navigation'
import { hasLocale } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { AuthProvider, LoginModalProvider } from '@/lib/auth'
import SiteNav from '@/app/components/SiteNav'
import BurgerDrawer from '@/app/components/BurgerDrawer'
import SiteFooter from '@/app/components/SiteFooter'
import SearchOverlay from '@/app/components/SearchOverlay'
import BridgeAuth from '@/app/[locale]/(spa)/BridgeAuth'

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
      <LoginModalProvider>
        {/* Full SPA stylesheet — needed for SiteNav/burger styling on this non-(spa) route */}
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/css/style.min.css?v=33" precedence="default" />
        <BridgeAuth />
        <SiteNav />
        <BurgerDrawer />
        {children}
        <SiteFooter />
        <SearchOverlay />
      </LoginModalProvider>
    </AuthProvider>
  )
}
