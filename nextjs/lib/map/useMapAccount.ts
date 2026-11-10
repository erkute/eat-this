'use client';

import { useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { useMapData } from './useMapData';
import { useFavorites } from './useFavorites';
import { useUnlockedMustEats } from './useUnlockedMustEats';
import { useUserTier } from './useUserTier';
import { resolveUnlockedMustEatIds } from './unlockedMustEats';
import type { InitialMapData } from './server-initial-map-data';

/** Account-scoped catalogue, favorites and reveals share one viewer lifetime. */
export function useMapAccount(initialMapData?: InitialMapData) {
  const { user, loading: authLoading } = useAuth();
  const uid = user?.uid ?? null;
  const viewer = useRef({ uid, authLoading });
  if (viewer.current.uid !== uid || viewer.current.authLoading !== authLoading) {
    viewer.current = { uid, authLoading };
  }

  const data = useMapData({ uid, authLoading, initialMapData });
  const { unlockedIds: storedUnlockedIds, unlock } = useUnlockedMustEats(authLoading ? null : uid);
  const { favoriteIds, toggle: toggleFavorite } = useFavorites(uid);
  const userTier = useUserTier(uid, {
    fullCatalog: data.fullCatalog,
    dataUid: data.dataUid,
    authLoading,
  });
  const publicFaceUpIds = useMemo(
    () => initialMapData
      ? resolveUnlockedMustEatIds({
          uid: null,
          storedUnlockedIds: new Set<string>(),
          revealedMustEatIds: new Set(initialMapData.revealedMustEatIds),
        })
      : undefined,
    [initialMapData]
  );
  const unlockedIds = useMemo(
    () => resolveUnlockedMustEatIds({
      uid,
      storedUnlockedIds: !authLoading && data.dataUid === uid ? storedUnlockedIds : new Set<string>(),
      revealedMustEatIds: data.revealedMustEatIds,
      publicFaceUpIds,
    }),
    [uid, authLoading, data.dataUid, storedUnlockedIds, data.revealedMustEatIds, publicFaceUpIds]
  );

  const { mergeMustEat } = data;
  const reveal = useCallback(async (id: string) => {
    if (!uid || authLoading) return null;
    const requestViewer = viewer.current;
    const full = await unlock(id);
    if (!full || viewer.current !== requestViewer) return null;
    mergeMustEat(full);
    return full;
  }, [uid, authLoading, unlock, mergeMustEat]);

  return {
    uid,
    guest: !authLoading && !user,
    cardViewerKey: uid ? `${uid}:${authLoading ? 'pending' : 'ready'}` : 'guest',
    restaurants: data.restaurants,
    mustEats: data.mustEats,
    categories: data.categories,
    revealedMustEatIds: data.revealedMustEatIds,
    loading: data.loading,
    error: data.error,
    refetch: data.refetch,
    unlockedIds,
    favoriteIds,
    toggleFavorite,
    userTier,
    reveal,
  };
}
