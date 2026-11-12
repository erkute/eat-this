import 'server-only';
import type { MapMustEat } from '@/lib/types';
import type { InitialMapData } from '@/lib/map/server-initial-map-data';
import { getCachedMustEatsForPage } from '@/lib/map/cached-sanity';
import { composeRevealedMustEats } from '@/lib/map/revealed-must-eats';
import { stripCoveredMustEats } from '@/lib/map/stripCoveredMustEats';

/** Öffentliches HTML enthält nur ausgewählte Metadaten und geschützte Bildrouten. */
export function selectPublicMustEatData(cards: MapMustEat[], ids: ReadonlySet<string>): InitialMapData {
  const publicIds = composeRevealedMustEats(cards);
  return {
    restaurants: [], categories: [], totalCount: 0,
    mustEats: stripCoveredMustEats(cards.filter(card => ids.has(card._id)), publicIds)
      .map(card => publicIds.has(card._id)
        ? { ...card, image: `/api/must-eat-image/${encodeURIComponent(card._id)}` }
        : card),
    revealedMustEatIds: [...publicIds].filter(id => ids.has(id)),
  };
}

export async function getInitialSpotMustEatData(ids: string[]): Promise<InitialMapData> {
  if (!ids.length) return { restaurants: [], mustEats: [], categories: [], totalCount: 0, revealedMustEatIds: [] };
  return selectPublicMustEatData(await getCachedMustEatsForPage(), new Set(ids));
}
