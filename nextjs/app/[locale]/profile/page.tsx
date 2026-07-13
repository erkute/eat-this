import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import ProfileShell from '@/app/components/profile/ProfileShell';
import ProfileAuthGuard from '@/app/components/profile/ProfileAuthGuard';
import { getInitialAnonMapData } from '@/lib/map/server-initial-map-data';
// Deep import on purpose — the @/lib/map barrel pulls client hooks into this
// server component.
import { resolveUnlockedMustEatIds } from '@/lib/map/unlockedMustEats';

export const metadata: Metadata = {
  title: 'Profil — EAT THIS',
  robots: 'noindex, nofollow',
};
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PageProps {
  params: Promise<{ locale: string }>;
}

// Dedicated /profile route. More specific than the catch-all in [...slug].
export default async function ProfileRoute({ params }: PageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  // The deck itself comes from the (per-user, server-stripped) /api/map-data
  // fetch inside ProfileShell — the page only precomputes the public face-up
  // set. The old unauthenticated full-album fetch leaked every dish + image.
  const anon = await getInitialAnonMapData();
  // The publicly face-up set (10 curated cards + spot-of-day) — "publicly
  // face-up means face-up everywhere", so the collected grid shows these open
  // even before the user revealed anything on site.
  const publicFaceUpIds = Array.from(
    resolveUnlockedMustEatIds({
      uid: null,
      storedUnlockedIds: new Set(),
      revealedMustEatIds: new Set(anon.revealedMustEatIds),
    }),
  );
  return (
    <ProfileAuthGuard>
      <ProfileShell publicFaceUpIds={publicFaceUpIds} />
    </ProfileAuthGuard>
  );
}
