import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { CSS_VERSION } from '@/lib/constants';
import { AuthProvider } from '@/lib/auth';

export const metadata: Metadata = {
  title:  'Anmelden',
  robots: 'noindex, nofollow',
};

export default async function LoginLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params:   Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return (
    <>
      {/* Reuses .wm-* styles from the global stylesheet — same approach as profile layout. */}
      <link rel="stylesheet" href={`/css/style.min.css?v=${CSS_VERSION}`} precedence="default" />
      <AuthProvider>{children}</AuthProvider>
    </>
  );
}
