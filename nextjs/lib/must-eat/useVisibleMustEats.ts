'use client';

import { selectVisibleMustEats } from './visible-cards';
import { useAuth } from '@/lib/auth';
import { useMapData } from '@/lib/map/useMapData';
import type { InitialMapData } from '@/lib/map/server-initial-map-data';

/** Nur öffentliche Karten oder die bestätigten Freigaben des aktuellen Kontos. */
export function useVisibleMustEats(initialData: InitialMapData): InitialMapData {
  const { user, loading: authLoading } = useAuth();
  const uid = user?.uid ?? null;
  const live = useMapData({ uid, authLoading, initialMapData: initialData });
  return selectVisibleMustEats(initialData, { uid, authLoading, live });
}
