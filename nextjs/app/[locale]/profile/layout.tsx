import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { routing } from '@/i18n/routing';
import { AuthProvider } from '@/lib/auth';
import SiteNav from '@/app/components/SiteNav';
import BurgerDrawer from '@/app/components/BurgerDrawer';
import BridgeAuth from '@/app/[locale]/(spa)/BridgeAuth';
import SearchOverlay from '@/app/components/SearchOverlay';

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
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/css/style.min.css?v=26" precedence="default" />

      <AuthProvider>
        <SiteNav />
        <BridgeAuth />
        <BurgerDrawer />
        {children}
        <SearchOverlay />
      </AuthProvider>
    </>
  );
}
