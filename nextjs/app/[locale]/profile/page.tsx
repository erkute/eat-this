import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import ProfileShell from '@/app/components/profile/ProfileShell';
import ProfileAuthGuard from '@/app/components/profile/ProfileAuthGuard';
import { getAllMustEats } from '@/lib/sanity.server';
import { getInitialAnonMapData } from '@/lib/map/server-initial-map-data';
// Deep import on purpose — the @/lib/map barrel pulls client hooks into this
// server component.
import { resolveUnlockedMustEatIds } from '@/lib/map/unlockedMustEats';

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
  const [mustEats, anon] = await Promise.all([getAllMustEats(), getInitialAnonMapData()]);
  // The publicly face-up set (trial-10 ∪ spot-of-day) — "publicly face-up means
  // face-up everywhere", so the collected grid shows these open even before the
  // user revealed anything on site. Must come from the ANON map data: the
  // trial-10 slice is only valid on the anon restaurant ordering.
  const publicFaceUpIds = Array.from(
    resolveUnlockedMustEatIds({
      uid: null,
      storedUnlockedIds: new Set(),
      revealedMustEatIds: new Set(anon.revealedMustEatIds),
      mustEats: anon.mustEats,
      restaurants: anon.restaurants,
    }),
  );
  return (
    <ProfileAuthGuard>
      <ProfileShell mustEats={mustEats} publicFaceUpIds={publicFaceUpIds} />
    </ProfileAuthGuard>
  );
}
