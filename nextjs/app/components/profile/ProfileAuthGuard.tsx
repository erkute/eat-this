'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/i18n/navigation';

// Client-side guard for /profile. Redirects signed-out users to home —
// covers both the deep-link case (typed /profile URL while signed-out) and
// the sign-out-from-profile case.
export default function ProfileAuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || user) return;
    router.replace('/');
  }, [user, loading, router]);

  if (loading || !user) return null;
  return <>{children}</>;
}
