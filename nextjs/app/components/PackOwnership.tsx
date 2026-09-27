'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { useOwnedEntitlements } from '@/lib/firebase/useOwnedEntitlements';

const PackOwnershipContext = createContext<ReadonlySet<string> | null>(null);

/** One subscription for every purchase control on the page, including portals. */
export function PackOwnershipProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  return (
    <OwnedPacks key={user?.uid ?? 'guest'} uid={user?.uid ?? null} loading={loading}>
      {children}
    </OwnedPacks>
  );
}

function OwnedPacks({
  uid,
  loading,
  children,
}: {
  uid: string | null;
  loading: boolean;
  children: ReactNode;
}) {
  const owned = useOwnedEntitlements(uid);
  return (
    <PackOwnershipContext.Provider value={loading ? null : owned}>
      {children}
    </PackOwnershipContext.Provider>
  );
}

export const usePackOwnership = () => useContext(PackOwnershipContext);
