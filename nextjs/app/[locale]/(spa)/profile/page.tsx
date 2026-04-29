import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import ProfileShell from '@/app/components/profile/ProfileShell';
import { getAllMustEats } from '@/lib/sanity.server';

export const metadata: Metadata = {
  title: 'Profil — EAT THIS',
  robots: 'noindex, nofollow',
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

// Dedicated /profile route. More specific than the catch-all in [...slug].
export default async function ProfileRoute({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const mustEats = await getAllMustEats();
  return <ProfileShell mustEats={mustEats} />;
}
