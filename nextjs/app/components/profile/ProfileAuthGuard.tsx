'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { routing } from '@/i18n/routing';

// Client-side guard for /profile. Redirects signed-out users to /login.
// Returns null while auth is loading to prevent profile chrome flashing
// before the redirect.
export default function ProfileAuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const locale = useLocale();

  useEffect(() => {
    if (loading || user) return;
    const href = locale === routing.defaultLocale ? '/login' : `/${locale}/login`;
    router.replace(href);
  }, [user, loading, router, locale]);

  if (loading || !user) return null;
  return <>{children}</>;
}
