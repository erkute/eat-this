import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { AuthProvider, LoginModalProvider } from '@/lib/auth';
import { UserLocationProvider } from '@/lib/map/UserLocationContext';
import BridgeAuth from '@/app/[locale]/(spa)/BridgeAuth';
import BurgerDrawer from './BurgerDrawer';
import SiteFooter from './SiteFooter';
import SiteNav from './SiteNav';
import RemyDock from './buddy/RemyDock';

interface ChromeOptions {
  /** Der Seitenfuß. Das Profil hat keinen. */
  footer?: boolean;
  /** Remys Dock. Die Restaurantseite rendert ihres selbst (mit Spot-Kontext),
   *  das geteilte Deck gar keins. */
  remy?: boolean;
  /** Standort-Kontext. Das geteilte Deck fragt niemanden nach seinem Standort:
   *  der Anlass, dort zu landen, ist ein fremder Link — die erste Handlung
   *  darf kein Systemdialog sein. */
  location?: boolean;
  /** Der Scroll-Container der SPA-Gruppe (`.app-pages`, globals.css). Ab
   *  768px scrollt er statt des Fensters; der Fuß steht dann in ihm. */
  appPages?: boolean;
}

/**
 * Die Hülle jeder Seite: Anmeldung, Navigation, Burger, Fuß, Remy.
 *
 * Stand vorher in sieben Layouts, der SPA-Gruppe und der 404 je einmal
 * ausgeschrieben — bis auf ein, zwei Zeilen wortgleich. Die Unterschiede sind
 * jetzt die Schalter oben.
 */
export default function SiteChrome({
  children,
  footer = true,
  remy = true,
  location = true,
  appPages = false,
}: ChromeOptions & { children: React.ReactNode }) {
  const page = (
    <>
      <span id="main-content" tabIndex={-1} />
      {children}
      {footer && <SiteFooter />}
    </>
  );
  const body = (
    <>
      <BridgeAuth />
      <SiteNav />
      <BurgerDrawer />
      {appPages ? (
        <div className="app-pages" id="appPages">
          {page}
        </div>
      ) : (
        page
      )}
      {remy && <RemyDock />}
    </>
  );
  return (
    <AuthProvider>
      <LoginModalProvider>
        {location ? <UserLocationProvider>{body}</UserLocationProvider> : body}
      </LoginModalProvider>
    </AuthProvider>
  );
}

/** Ein ganzes Locale-Layout aus der Hülle: `export default siteLayout()`. */
export function siteLayout(options: ChromeOptions = {}) {
  return async function SiteLayout({
    children,
    params,
  }: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
  }) {
    const { locale } = await params;
    if (!hasLocale(routing.locales, locale)) notFound();
    setRequestLocale(locale);
    return <SiteChrome {...options}>{children}</SiteChrome>;
  };
}
