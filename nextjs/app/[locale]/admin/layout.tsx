import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { AuthProvider } from '@/lib/auth';
import { routing } from '@/i18n/routing';
import { isAdminSession } from '@/lib/admin/adminSession.server';
import { premiumSessionCookieName } from '@/lib/must-eat/premium-session';

/**
 * Interne Werkzeuge. Kein SiteNav, kein SPA-Stylesheet, keine Übersetzung —
 * die Seiten hier haben genau einen Leser, und der spricht Deutsch.
 *
 * Nur für Admins: alle anderen sehen die 404 (siehe unten).
 *
 * `AuthProvider` steht hier und nicht im Locale-Layout, weil er dort für die
 * ganze Seite gälte; /profile und die SPA-Gruppe halten ihn aus demselben
 * Grund je selbst.
 */
async function viewerIsAdmin(): Promise<boolean> {
  const session = (await cookies()).get(premiumSessionCookieName())?.value;
  return isAdminSession(session);
}

/**
 * Der Titel nur für Admins. Next streamt die Metadaten eines Segments auch
 * dann nach, wenn sein Layout `notFound()` wirft — eine statische
 * `metadata` hier oder in der Seite überschrieb den Tab-Titel der 404 kurz
 * darauf mit „Zahlen" und verriet damit genau das, was die 404 verbergen
 * soll. Ein leeres Objekt verriet es auch, nur leiser: dann stand der
 * Standardtitel der Seite im Tab statt „404".
 */
export async function generateMetadata(): Promise<Metadata> {
  // Fremde bekommen exakt die Metadaten der gewöhnlichen 404.
  if (!(await viewerIsAdmin())) {
    return { title: '404 — Eat This', robots: { index: false, follow: false } };
  }
  return { title: 'Zahlen', robots: 'noindex, nofollow' };
}

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

  // Wer kein Admin ist, bekommt die gewöhnliche 404 — nicht „kein Zugriff",
  // denn das verriete, dass hier etwas liegt. Dieselbe Regel wie in
  // /api/admin/stats.
  if (!(await viewerIsAdmin())) notFound();

  return <AuthProvider>{children}</AuthProvider>;
}
