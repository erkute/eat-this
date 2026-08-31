import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { AuthProvider } from '@/lib/auth';
import { routing } from '@/i18n/routing';

/**
 * Interne Werkzeuge. Kein SiteNav, kein SPA-Stylesheet, keine Übersetzung —
 * die Seiten hier haben genau einen Leser, und der spricht Deutsch.
 *
 * `AuthProvider` steht hier und nicht im Locale-Layout, weil er dort für die
 * ganze Seite gälte; /profile und die SPA-Gruppe halten ihn aus demselben
 * Grund je selbst.
 */
export const metadata: Metadata = {
  title: 'Intern',
  robots: 'noindex, nofollow',
};

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  return <AuthProvider>{children}</AuthProvider>;
}
