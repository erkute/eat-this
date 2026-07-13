import { notFound } from 'next/navigation'
import { hasLocale } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { CSS_VERSION } from '@/lib/constants'
import { AuthProvider, LoginModalProvider } from '@/lib/auth'
import { UserLocationProvider } from '@/lib/map/UserLocationContext'
import SiteNav from '@/app/components/SiteNav'
import BurgerDrawer from '@/app/components/BurgerDrawer'
import SiteFooter from '@/app/components/SiteFooter'
import BridgeAuth from '@/app/[locale]/(spa)/BridgeAuth'

export default async function PacksLayout({
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
        <UserLocationProvider>
          <link rel="stylesheet" href={`/css/style.min.css?v=${CSS_VERSION}`} precedence="default" />
          <BridgeAuth />
          <SiteNav />
          <BurgerDrawer />
          <span id="main-content" tabIndex={-1} />
          {children}
          <SiteFooter />
        </UserLocationProvider>
      </LoginModalProvider>
    </AuthProvider>
  )
}
