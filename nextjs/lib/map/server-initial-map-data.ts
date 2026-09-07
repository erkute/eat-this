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
import {
  selectHomeInitialMapData,
  selectMustEatsCatalog,
  type InitialMustEatsData,
} from './initial-surface-data';
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

  // Jeder Spot — die Spots sind frei. Vom KARTENSTAPEL dagegen sieht ein
  // Besucher ohne Konto nur das Schaufenster plus den Spot des Tages, und der
  // ist flüchtig: pro Anfrage aus `today` gerechnet, morgen steht ein anderer
  // da. Dieselbe Staffelung wie in composeAccountSurface — die SSR-Nutzlast
  // und der spätere Fetch müssen dasselbe meinen, sonst springt die Karte beim
  // Hydrieren.
  const revealedMustEatIds = new Set([
    ...composeRevealedMustEats(allMustEats),
    ...spotOfDayMustEatIds(spotId, allMustEats),
  ]);

  return {
    restaurants: all,
    mustEats: allMustEats.filter((m) => revealedMustEatIds.has(m._id)),
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
 * Payload für den öffentlichen /must-eats-Katalog — der GANZE Stapel.
 *
 * Bewusst ungestaffelt, als einzige Fläche. Die Map und das Album zeigen, was
 * jemandem gehört; diese Seite zeigt, was es GIBT — eine Wand aus
 * Kartenrücken, aus der ein paar Motive herausstechen. Gestaffelt wäre sie
 * für einen Fremden fünf Karten und sonst nichts, und damit hätte die Seite,
 * die für den Stapel wirbt, den Stapel nicht mehr.
 *
 * Verraten wird dabei nichts: eine verdeckte Karte trägt hier weder Gericht
 * noch Bild (stripCoveredMustEats) noch ihren Spot (trimCoveredSpot). Was
 * bleibt, ist ihre Nummer — und die steht ohnehin auf jeder Karte.
 *
 * `getInitialAnonMapData()` entscheidet, welche Karten offen liegen, und
 * hydriert nur die; der Rest kommt als bloße Metadaten aus dem Katalog dazu.
 */
export async function getMustEatsCatalogData(): Promise<InitialMustEatsData> {
  const [anon, { mustEats: catalog }] = await Promise.all([
    getInitialAnonMapData(),
    getCachedMapData(),
  ]);
  return composeMustEatsCatalog(anon, catalog);
}

function composeMustEatsCatalog(anon: InitialMapData, catalog: MapMustEat[]): InitialMustEatsData {
  const faceUp = new Set(anon.revealedMustEatIds);
  const hydrated = new Map(anon.mustEats.map((m) => [m._id, m]));
  const complete = catalog.map((m) => hydrated.get(m._id) ?? m);
  const ordered = selectMustEatsCatalog({ ...anon, mustEats: complete });

  return {
    ...ordered,
    // The strip is what makes "covered cards carry no paid fields" a property
    // of this function rather than of a query somewhere else.
    mustEats: stripCoveredMustEats(ordered.mustEats, faceUp),
  };
}

/**
 * Nutzlast für die Startseite: die Spots der anonymen Map, dazu für den
 * Must-Eats-Teaser das Schaufenster UND ein paar Rücken aus dem ganzen Stapel.
 *
 * Die anonyme Map-Nutzlast trägt seit dem 06.09.2026 nur noch die offenen
 * Karten — was ein Konto nicht sieht, taucht am Spot nicht auf. Für die
 * Startseite ist das die falsche Menge: der Teaser lebt vom Kontrast zwischen
 * Rücken und Motiv, und ohne Rücken zeigte er sechs gerahmte Fotos und kein
 * Spiel (Betreiber, 07.09.2026: „kannst du ruhig wieder die verdeckten
 * dazupacken"). Also kommen die Rücken aus demselben Katalog wie auf
 * /must-eats, in derselben Fassung: ohne Gericht, ohne Bild, ohne Spot.
 * Wer ohne Konto auf einen tippt, landet bei der Anmeldung (HubMustEatsTeaser).
 */
export async function getHomeInitialMapData(): Promise<InitialMapData> {
  const [anon, { mustEats: catalog }] = await Promise.all([
    getInitialAnonMapData(),
    getCachedMapData(),
  ]);
  const { mustEats } = composeMustEatsCatalog(anon, catalog);
  return selectHomeInitialMapData({ ...anon, mustEats });
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
