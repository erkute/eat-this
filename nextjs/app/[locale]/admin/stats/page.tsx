import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import StatsDashboard from '@/app/components/admin/StatsDashboard';

export const metadata: Metadata = {
  title: 'Zahlen',
  robots: 'noindex, nofollow',
};

// Die Zahlen kommen per Fetch aus /api/admin/stats, sobald ein Admin-Token
// vorliegt — der Server kennt den Aufrufer hier nicht.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function StatsRoute({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <StatsDashboard />;
}
