// Server-only: build the public map data at request time so the SPA renders
// WITH spots already in the HTML, avoiding the "0 spots" flash.
//
// Used by app/[locale]/(spa)/[...slug]/page.tsx for /map.
// Anon visitors are served entirely from here — they never fetch /api/map-data
// — so anything the anon map needs has to be in this payload. Signed-in users
// still refetch on mount for their own face-up cards.

import { getCachedMapData } from './cached-sanity';
import { composeRevealedMustEats } from './revealed-must-eats';
import { spotOfDayMustEatIds } from './spotOfDayReveal';
import { stripCoveredMustEats } from './stripCoveredMustEats';
import { selectMustEatsCatalog, type InitialMustEatsData } from './initial-surface-data';
import { getSpotOfDayId } from '@/lib/home/spotOfDay.server';
import { unstable_cache } from 'next/cache';
import { hydrateAuthorizedMustEats, readPrivateMustEatContent } from '@/lib/must-eat/private-store';
import type { MapRestaurant, MapMustEat } from '@/lib/types';
import type { CategoryDef } from '@/lib/categories';

export interface InitialMapData {
  restaurants: MapRestaurant[];
  mustEats: MapMustEat[];
  categories: CategoryDef[];
  totalCount: number;
  // Serialisable: array form so the RSC → client boundary doesn't break.
  // Client converts to Set on hydration.
  revealedMustEatIds: string[];
}

async function composeInitialAnonMapMetadata(): Promise<InitialMapData> {
  const today = new Date().toISOString().slice(0, 10);
  const [{ restaurants: all, mustEats: allMustEats, categories }, spotId] = await Promise.all([
    getCachedMapData(),
    getSpotOfDayId(today),
  ]);

  // Jeder Spot, jede Karte — nur eben die meisten Karten verdeckt. Offen liegt
  // das kuratierte Schaufenster plus der Spot des Tages, und der ist flüchtig:
  // pro Anfrage aus `today` gerechnet, morgen steht ein anderer da.
  const revealedMustEatIds = new Set([
    ...composeRevealedMustEats(allMustEats),
    ...spotOfDayMustEatIds(spotId, allMustEats),
  ]);

  return {
    restaurants: all,
    mustEats: allMustEats,
    categories,
    totalCount: all.length,
    revealedMustEatIds: Array.from(revealedMustEatIds),
  };
}

/**
 * The face-up set below is the curated shop window plus the spot-of-day gift —
 * the same cards for every visitor, and the same cards whose premium fields ship
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
 * `getInitialAnonMapData()` decides which cards are face-up (curated shop
 * window + spot-of-day gift) and hydrates only those; `selectMustEatsCatalog`
 * puts the deck in card-number order. The authorization decision stays here,
 * the ordering stays pure.
 */
export async function getMustEatsCatalogData(): Promise<InitialMustEatsData> {
  const anon = await getInitialAnonMapData();
  const ordered = selectMustEatsCatalog(anon);

  return {
    ...ordered,
    // The strip is what makes "covered cards carry no paid fields" a property
    // of this function rather than of a query somewhere else.
    mustEats: stripCoveredMustEats(ordered.mustEats, new Set(anon.revealedMustEatIds)),
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
