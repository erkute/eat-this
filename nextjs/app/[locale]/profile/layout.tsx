import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { routing } from '@/i18n/routing';
import { CSS_VERSION } from '@/lib/constants';
import { AuthProvider, LoginModalProvider } from '@/lib/auth';
import { UserLocationProvider } from '@/lib/map/UserLocationContext';
import SiteNav from '@/app/components/SiteNav';
import BurgerDrawer from '@/app/components/BurgerDrawer';
import BridgeAuth from '@/app/[locale]/(spa)/BridgeAuth';
import SearchOverlay from '@/app/components/SearchOverlayLazy';

export const metadata: Metadata = {
  title: 'Profil — EAT THIS',
  robots: 'noindex, nofollow',
};

export default async function ProfileLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <>
      {/* Full SPA stylesheet — same as (spa) layout, since profile components
          rely on global classes (e.g. site-nav). */}
      <link rel="stylesheet" href={`/css/style.min.css?v=${CSS_VERSION}`} precedence="default" />

      <AuthProvider>
        <LoginModalProvider>
          <UserLocationProvider>
            <SiteNav />
            <BridgeAuth />
            <BurgerDrawer />
            {children}
            <SearchOverlay />
          </UserLocationProvider>
        </LoginModalProvider>
      </AuthProvider>
    </>
  );
}
