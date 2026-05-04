'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth';

// Client-side guard for /profile. Hard-navigates signed-out users to home —
// covers both the deep-link case (typed /profile URL while signed-out) and
// the sign-out-from-profile case. window.location.assign reloads the page so
// the legacy SPA scripts reinitialise on '/' via DOMContentLoaded (soft-nav
// would skip that and leave a black homepage).
export default function ProfileAuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || user) return;
    window.location.assign('/');
  }, [user, loading]);

  if (loading || !user) return null;
  return <>{children}</>;
}
