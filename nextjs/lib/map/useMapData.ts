'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { auth } from '@/lib/firebase/config';
import type { MapRestaurant, MapMustEat } from '../types';
import type { CategoryDef } from '../categories';
import type { InitialMapData } from './server-initial-map-data';
import {
  readMapCache,
  seedUidBeforeAuth,
  writeMapCache,
  type CachedMapData,
} from './map-data-cache';

interface UseMapDataArgs {
  uid: string | null;
  authLoading: boolean;
  /** Optional SSR-supplied initial state. When set, the hook hydrates with
   *  this data instead of empty arrays + loading: true. Anon visitors then
   *  skip the initial fetch entirely; signed-in users still refetch on mount
   *  to pull their +20 signed tier + entitlement-based catalog union. */
  initialMapData?: InitialMapData;
}

interface MapData {
  restaurants: MapRestaurant[];
  /** The paywalled part of the catalogue — every spot this viewer cannot open,
   *  uncapped. Drawn on the map as grey dots, and run through the same filter
   *  as the free set, so a search matches them too and lists them as rows.
   *  Opening one — dot or row — shows LockedDetail: the spot named, with the
   *  packs that unlock it. Not a blurred teaser; the name is public anyway. */
  lockedRestaurants: MapRestaurant[];
  mustEats: MapMustEat[];
  categories: CategoryDef[];
  /** Total restaurant count in Sanity — independent of trial cap / entitlements.
   *  Surfaced so the sheet-count-mini reads catalog size, not filtered result. */
  totalCount: number;
  /** Ob diesem Konto der ganze Katalog offensteht — Admin oder all-berlin.
   *  Kommt vom Server, weil der Client es nicht entscheiden kann: der
   *  Admin-Zugang haengt an ADMIN_EMAILS plus verifizierter Adresse, und das
   *  Konto, das ihn nutzt, hat weder Claim noch Entitlement-Dokument. */
  fullCatalog: boolean;
  /** Must-eat IDs that are pre-revealed for anonymous visitors (face-up card).
   *  All other must-eats on visible restaurants render as coveredAnon (blurred,
   *  non-interactive). Empty for signed-in users — their entitlements drive
   *  the unlocked/locked split instead. */
  revealedMustEatIds: Set<string>;
  loading: boolean;
  /** The uid the payload currently in hand was fetched FOR — null while it is
   *  the anonymous view. It exists so a sheet can tell "this viewer is signed
   *  in" apart from "the map already knows that", which are not the same
   *  moment: auth resolves in a few hundred ms, the refetch behind it takes
   *  longer, and in between every locked spot still looks locked to code that
   *  only checks the uid. Selling a pack in that window means selling it on a
   *  spot the very next payload may open (user report, 2026-08-26). */
  dataUid: string | null;
  error: string | null;
  refetch: () => void;
  /** Swap a single must-eat in place — used after an on-site reveal, where the
   *  /api/must-eat-reveal response carries the full card data that the bulk
   *  payload ships stripped (covered cards have no dish/image). */
  mergeMustEat: (m: MapMustEat) => void;
}

// useLayoutEffect on the client (runs before the browser paints, so the
// cache-seed below shows no anon flash), useEffect on the server (avoids the
// "useLayoutEffect does nothing on the server" warning during SSR).
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export function useMapData({ uid, authLoading, initialMapData }: UseMapDataArgs): MapData {
  // First paint MUST match the SSR output (the anon `initialMapData`). The
  // server cannot read the per-uid localStorage cache, so seeding it during
  // render would diverge from the server HTML and trip a hydration mismatch
  // (e.g. the booster divider lands at a different list index). We initialise
  // from the SSR view, then swap in the signed-in cache in a layout effect
  // right after hydration — before paint — so the anon→signed tier seed still
  // happens without a visible flash AND without a mismatch. The live
  // /api/map-data fetch reconciles afterwards.
  const [restaurants, setRestaurants] = useState<MapRestaurant[]>(
    initialMapData?.restaurants ?? []
  );
  const [lockedRestaurants, setLockedRestaurants] = useState<MapRestaurant[]>(
    initialMapData?.lockedRestaurants ?? []
  );
  const [mustEats, setMustEats] = useState<MapMustEat[]>(initialMapData?.mustEats ?? []);
  const [categories, setCategories] = useState<CategoryDef[]>(initialMapData?.categories ?? []);
  const [totalCount, setTotalCount] = useState(initialMapData?.totalCount ?? 0);
  // Nie aus dem SSR-Anon-View: der kennt kein Konto.
  const [fullCatalog, setFullCatalog] = useState(false);
  const [revealedMustEatIds, setRevealedMustEatIds] = useState<Set<string>>(
    () => new Set<string>(initialMapData?.revealedMustEatIds ?? [])
  );
  // With SSR data we're not loading on first paint. Otherwise show loading
  // until the fetch lands.
  const [loading, setLoading] = useState(!initialMapData);
  /* Starts null: SSR ships the anonymous view, and the localStorage seed below
     is the only thing that can hand us a signed-in payload before a fetch. */
  const [dataUid, setDataUid] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Bump when refetch() is invoked to re-fire the fetch effect.
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((n) => n + 1), []);
  const mergeMustEat = useCallback((m: MapMustEat) => {
    setMustEats((prev) => prev.map((x) => (x._id === m._id ? m : x)));
  }, []);

  // Track latest effect to avoid setting state from a stale fetch when uid
  // changes mid-request (e.g. sign-out during a fetch).
  const latestReqRef = useRef(0);

  // Post-hydration cache seed (client-only). Reading localStorage during render
  // would mismatch the server; doing it here keeps first render == SSR while
  // still showing a returning signed-in user their cached tier before paint.
  const seededCacheRef = useRef(false);
  useIsomorphicLayoutEffect(() => {
    if (seededCacheRef.current) return;
    seededCacheRef.current = true;
    const cached = readMapCache(uid ?? seedUidBeforeAuth());
    if (!cached) return;
    setRestaurants(cached.restaurants);
    setLockedRestaurants(cached.lockedRestaurants);
    setMustEats(cached.mustEats);
    setCategories(cached.categories);
    setTotalCount(cached.totalCount);
    setFullCatalog(cached.fullCatalog === true);
    setRevealedMustEatIds(new Set<string>(cached.revealedMustEatIds ?? []));
    // The cache only ever holds a signed-in payload, written under the uid it
    // was fetched for — so it counts as current for exactly that uid.
    setDataUid(uid ?? seedUidBeforeAuth());
    setLoading(false);
    // Mount-only: the seed is a one-shot first-paint optimisation.
  }, []);

  // Anon-with-SSR mount-skip: if we hydrated with the SSR anon view AND the user
  // is anonymous, the data we already have IS the correct anon view — skip the
  // redundant initial fetch. Signed-in users resolve to a non-null uid, so the
  // `uid === null` guard in the effect keeps them from skipping (they refetch).
  const skipInitialAnonFetchRef = useRef(!!initialMapData);

  useEffect(() => {
    // Pause while auth is still resolving — we don't want to issue an
    // anonymous fetch that the auth-loaded fetch will immediately replace.
    if (authLoading) return;

    if (skipInitialAnonFetchRef.current && uid === null && tick === 0) {
      skipInitialAnonFetchRef.current = false;
      setLoading(false);
      return;
    }
    skipInitialAnonFetchRef.current = false;

    const reqId = ++latestReqRef.current;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const headers: HeadersInit = {};
        if (uid && auth.currentUser) {
          const token = await auth.currentUser.getIdToken();
          headers['Authorization'] = `Bearer ${token}`;
        }
        const r = await fetch('/api/map-data', { headers });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const json = await r.json();
        if (latestReqRef.current !== reqId) return; // stale — newer fetch in flight
        const next: CachedMapData = {
          restaurants: json.restaurants ?? [],
          lockedRestaurants: json.lockedRestaurants ?? [],
          mustEats: json.mustEats ?? [],
          categories: json.categories ?? [],
          totalCount: json.totalCount ?? 0,
          revealedMustEatIds: (json.revealedMustEatIds ?? []) as string[],
          fullCatalog: json.fullCatalog === true,
        };
        setRestaurants(next.restaurants);
        setLockedRestaurants(next.lockedRestaurants);
        setMustEats(next.mustEats);
        setCategories(next.categories);
        setTotalCount(next.totalCount);
        setFullCatalog(next.fullCatalog === true);
        setRevealedMustEatIds(new Set<string>(next.revealedMustEatIds));
        setDataUid(uid);
        // Cache the signed-in payload so the next visit / reload paints this tier instantly.
        if (uid) writeMapCache(uid, next);
      } catch (e) {
        if (latestReqRef.current !== reqId) return;
        setError((e as Error).message);
      } finally {
        if (latestReqRef.current === reqId) setLoading(false);
      }
    })();
  }, [uid, authLoading, tick]);

  return {
    restaurants,
    lockedRestaurants,
    mustEats,
    categories,
    totalCount,
    fullCatalog,
    revealedMustEatIds,
    loading,
    dataUid,
    error,
    refetch,
    mergeMustEat,
  };
}
