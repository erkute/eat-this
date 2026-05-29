import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import ProfileShell from '@/app/components/profile/ProfileShell';
import ProfileAuthGuard from '@/app/components/profile/ProfileAuthGuard';
import { getAllMustEats, getRestaurantCount } from '@/lib/sanity.server';
import { getCuratedRevealedMustEatIds } from '@/lib/map/revealed.server';

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
  const [mustEats, restaurantCount, curatedRevealedIds] = await Promise.all([
    getAllMustEats(),
    getRestaurantCount(),
    getCuratedRevealedMustEatIds(),
  ]);
  return (
    <ProfileAuthGuard>
      <ProfileShell
        mustEats={mustEats}
        restaurantCount={restaurantCount}
        curatedRevealedIds={curatedRevealedIds}
      />
    </ProfileAuthGuard>
  );
}
