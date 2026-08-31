// Server-only: build the anon-tier map data at request time so the SPA
// renders WITH spots already in the HTML, avoiding the "0 spots" flash.
//
// Used by app/[locale]/(spa)/[...slug]/page.tsx for /map.
// Anon visitors are served entirely from here — they never fetch /api/map-data
// — so anything the anon map needs has to be in this payload. Signed-in users
// still refetch on mount for their signed tier + entitlement-based unions.

import { getCachedMapData } from './cached-sanity';
import { composeAnonRestaurants, composeRevealedMustEats } from './tier-composition';
import { applySpotOfDayReveal } from './spotOfDayReveal';
import { getFreeSurfaceData, applyFreeSurface } from './free-surface';
import { stripCoveredMustEats } from './stripCoveredMustEats';
import { selectMustEatsCatalog, type InitialMustEatsData } from './initial-surface-data';
import { stripLockedRestaurants } from './stripLockedRestaurant';
import { getSpotOfDayId } from '@/lib/home/spotOfDay.server';
import { unstable_cache } from 'next/cache';
import { hydrateAuthorizedMustEats, readPrivateMustEatContent } from '@/lib/must-eat/private-store';
import type { MapRestaurant, MapMustEat } from '@/lib/types';
import type { CategoryDef } from '@/lib/categories';

export interface InitialMapData {
  restaurants: MapRestaurant[];
  lockedRestaurants: MapRestaurant[];
  mustEats: MapMustEat[];
  categories: CategoryDef[];
  totalCount: number;
  // Serialisable: array form so the RSC → client boundary doesn't break.
  // Client converts to Set on hydration.
  revealedMustEatIds: string[];
  /** Locked spots an account alone would open. Drives which of the two offers
   *  a locked sheet shows — sign-in for these, a pack for the rest. Ships in
   *  the anonymous payload because these spots' names are public anyway (the
   *  locked list already renders them). */
}

async function composeInitialAnonMapMetadata(): Promise<InitialMapData> {
  const today = new Date().toISOString().slice(0, 10);
  const [{ restaurants: all, mustEats: allMustEats, categories }, freeSurface, spotId] =
    await Promise.all([getCachedMapData(), getFreeSurfaceData(), getSpotOfDayId(today)]);

  const mustEatCountByRestaurant = new Map<string, number>();
  for (const m of allMustEats) {
    const rid = m.restaurant._id;
    mustEatCountByRestaurant.set(rid, (mustEatCountByRestaurant.get(rid) ?? 0) + 1);
  }

  const anonSet = composeAnonRestaurants(all, mustEatCountByRestaurant);
  const anonIds = new Set(anonSet.map((r) => r._id));
  // Face-up-Set bleibt auf dem kuratierten Anon-Tier — Free-Surface-Spots
  // liefern nur Card-Backs (siehe Spec).
  const revealedSet = composeRevealedMustEats(allMustEats, anonIds);

  const visibleRestaurants = applyFreeSurface(anonSet, all, freeSurface.restaurantIds);
  const visibleIdSet = new Set(visibleRestaurants.map((r) => r._id));
  const visibleMustEats = allMustEats.filter((m) => visibleIdSet.has(m.restaurant._id));
  const lockedRestaurants = all.filter((r) => !visibleIdSet.has(r._id));

  // Spot des Tages — a free, daily-rotating gift for everyone. Surface today's
  // spot + reveal its must-eat (ephemeral: recomputed per request from the
  // date, so tomorrow's replaces it and the previous one falls back to locked).
  const gifted = applySpotOfDayReveal(spotId, all, allMustEats, {
    restaurants: visibleRestaurants,
    lockedRestaurants,
    mustEats: visibleMustEats,
    revealedMustEatIds: revealedSet,
  });

  return {
    restaurants: gifted.restaurants,
    lockedRestaurants: stripLockedRestaurants(gifted.lockedRestaurants),
    mustEats: gifted.mustEats,
    categories,
    totalCount: all.length,
    revealedMustEatIds: Array.from(gifted.revealedMustEatIds),
  };
}

/**
 * The face-up set below is the anon tier plus the spot-of-day gift — the same
 * cards for every visitor, and the same cards whose premium fields already ship
 * in the anonymous HTML. So this read has no per-viewer component and caching
 * it publishes nothing that isn't published already. The per-viewer path
 * (/api/map-data, entitlements + on-site unlocks + purchases) keeps the
 * uncached default reader.
 *
 * Uncached it was 192-583ms per request, measured against a production build —
 * roughly 95% of the server time on the four surfaces that call this, with
 * Sanity already served from the Data Cache in single-digit milliseconds.
 *
 * `privateMustEats` has no runtime writer: scripts/migrate-must-eats-private.ts
 * is the only thing that touches it, and a Firestore write fires no webhook.
 * The `mustEat` tag covers edits to the public metadata in Sanity; after a
 * backfill run the TTL is what bounds the staleness.
 */
const readPublicMustEatContent = unstable_cache(
  readPrivateMustEatContent,
  ['public-must-eat-content'],
  { tags: ['mustEat'], revalidate: 300 }
);

export async function getPublicMustEatIds(): Promise<Set<string>> {
  const data = await composeInitialAnonMapMetadata();
  return new Set(data.revealedMustEatIds);
}

/**
 * Payload for the public /must-eats catalog — the complete deck.
 *
 * `getInitialAnonMapData()` decides which cards are face-up (curated anon set
 * + spot-of-day gift) and hydrates only those; the raw Sanity list supplies the
 * rest, which the map drops because their spot sits outside the free tier. The
 * merge lives in `selectMustEatsCatalog` so the authorization decision stays
 * where it is — here — and only the ordering is pure.
 */
export async function getMustEatsCatalogData(): Promise<InitialMustEatsData> {
  const [anon, { mustEats: catalog }] = await Promise.all([
    getInitialAnonMapData(),
    getCachedMapData(),
  ]);
  const merged = selectMustEatsCatalog(anon, catalog);

  return {
    ...merged,
    // The cards joining from `catalog` never passed the anon strip. They carry
    // no paid fields today (mapMustEatsQuery does not select them), but the
    // guard is what makes that a property of this function rather than of a
    // query somewhere else.
    mustEats: stripCoveredMustEats(merged.mustEats, new Set(anon.revealedMustEatIds)),
  };
}

export async function getInitialAnonMapData(): Promise<InitialMapData> {
  const metadata = await composeInitialAnonMapMetadata();
  const faceUpIds = new Set(metadata.revealedMustEatIds);
  const hydrated = await hydrateAuthorizedMustEats(
    metadata.mustEats,
    faceUpIds,
    readPublicMustEatContent
  );

  return {
    ...metadata,
    // Anonymous HTML receives only the curated set plus the spot-of-day gift.
    // Covered cards are metadata-only and premium fields come exclusively
    // from the private store after this server-side authorization decision.
    mustEats: stripCoveredMustEats(hydrated, faceUpIds),
  };
}
