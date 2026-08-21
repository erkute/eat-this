import { CSS_VERSION, TYPEKIT_STYLESHEET } from '@/lib/constants';
import { AuthProvider, LoginModalProvider } from '@/lib/auth';
import { UserLocationProvider } from '@/lib/map/UserLocationContext';
import BridgeAuth from '@/app/[locale]/(spa)/BridgeAuth';
import BurgerDrawer from './BurgerDrawer';
import SiteFooter from './SiteFooter';
import SiteNav from './SiteNav';

export default function NotFoundAppFrame({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href={`/css/style.min.css?v=${CSS_VERSION}`} precedence="default" />
      {/* The layout's bootstrap script never runs on a streamed notFound()
          render, so the Adobe kit would stay off and the shared chrome (nav,
          footer) would fall back to Impact. Link it here instead. */}
      <link rel="stylesheet" href={TYPEKIT_STYLESHEET} precedence="default" />
      <AuthProvider>
        <LoginModalProvider>
          <UserLocationProvider>
            <BridgeAuth />
            <SiteNav />
            <BurgerDrawer />
            <div className="app-pages" id="appPages">
              <span id="main-content" tabIndex={-1} />
              {children}
              <SiteFooter />
            </div>
          </UserLocationProvider>
        </LoginModalProvider>
      </AuthProvider>
    </>
  );
}
