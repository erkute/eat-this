import { setRequestLocale } from 'next-intl/server';
import StatsDashboard from '@/app/components/admin/StatsDashboard';

// Wer hier ankommt, ist laut Layout Admin. Die Zahlen selbst kommen per Fetch
// aus /api/admin/stats, das den Aufrufer noch einmal über sein ID-Token prüft.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function StatsRoute({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <StatsDashboard />;
}
