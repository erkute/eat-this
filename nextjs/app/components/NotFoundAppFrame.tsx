import { CSS_VERSION } from '@/lib/constants'
import { AuthProvider, LoginModalProvider } from '@/lib/auth'
import { UserLocationProvider } from '@/lib/map/UserLocationContext'
import BridgeAuth from '@/app/[locale]/(spa)/BridgeAuth'
import BurgerDrawer from './BurgerDrawer'
import SiteFooter from './SiteFooter'
import SiteNav from './SiteNav'

export default function NotFoundAppFrame({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href={`/css/style.min.css?v=${CSS_VERSION}`} precedence="default" />
      <AuthProvider>
        <LoginModalProvider>
          <UserLocationProvider>
            <BridgeAuth />
            <SiteNav />
            <BurgerDrawer />
            <div className="app-pages" id="appPages">
              {children}
              <SiteFooter />
            </div>
          </UserLocationProvider>
        </LoginModalProvider>
      </AuthProvider>
    </>
  )
}
