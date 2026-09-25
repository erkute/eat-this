'use client';
import { useEffect, useState, useSyncExternalStore } from 'react';
import type { RestaurantArticleCard } from '@/lib/types';

// The detail-only fields the map sheet lazy-loads (the map list payload no
// longer carries these — see mapRestaurantsQuery / /api/restaurant-detail).
export interface RestaurantGalleryImage {
  _key: string;
  thumb: string;
  full: string;
  alt?: string;
  credit?: string;
  creditUrl?: string;
}

interface RestaurantMapDetail {
  address?: string;
  phone?: string;
  mapsUrl?: string;
  website?: string;
  menuUrl?: string;
  instagramHandle?: string;
  reservationUrl?: string;
  tip?: string;
  tipEn?: string;
  description?: string;
  descriptionEn?: string;
  shortDescription?: string;
  shortDescriptionEn?: string;
  photo?: string;
  photoCredit?: string;
  photoCreditUrl?: string;
  gallery?: RestaurantGalleryImage[];
  /** Die Artikel, in denen der Spot vorkommt — derselbe Block wie auf der
   *  Restaurant-Seite (articlesAboutRestaurant). */
  articles?: RestaurantArticleCard[];
}

// Module-level cache so re-opening or paging back to a spot is instant and
// doesn't refetch. Keyed by slug; survives sheet open/close within a session.
const cache = new Map<string, RestaurantMapDetail>();
const inflight = new Map<string, Promise<RestaurantMapDetail | null>>();
const listeners = new Map<string, Set<() => void>>();

async function load(slug: string): Promise<RestaurantMapDetail | null> {
  const cached = cache.get(slug);
  if (cached) return cached;
  let p = inflight.get(slug);
  if (!p) {
    p = fetch(`/api/restaurant-detail/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? (r.json() as Promise<RestaurantMapDetail>) : null))
      .then((d) => {
        if (d) {
          cache.set(slug, d);
          listeners.get(slug)?.forEach((notify) => notify());
        }
        return d;
      })
      .catch(() => null)
      .finally(() => inflight.delete(slug));
    inflight.set(slug, p);
  }
  return p;
}

/** Prefetch a spot's detail fields (e.g. on list hover / sheet-open) so the
 *  sheet has them ready before the open animation finishes. */
export function prefetchRestaurantDetail(slug: string): void {
  if (slug && !cache.has(slug)) void load(slug);
}

/** Reads the detail fields for a slug WITHOUT fetching them — the list card
 *  wants the gallery once `prefetchRestaurantDetail` has it, but must not
 *  send one request per rendered row on mount. Re-renders when the prefetch
 *  lands. The server snapshot is null, so hydration never sees a cache hit. */
export function useCachedRestaurantDetail(slug: string | undefined): RestaurantMapDetail | null {
  return useSyncExternalStore(
    (notify) => {
      if (!slug) return () => {};
      const set = listeners.get(slug) ?? new Set<() => void>();
      listeners.set(slug, set);
      set.add(notify);
      return () => {
        set.delete(notify);
        if (!set.size) listeners.delete(slug);
      };
    },
    () => (slug ? (cache.get(slug) ?? null) : null),
    () => null
  );
}

/** Lazy-loads the detail-only fields for a slug. Returns the cached object
 *  synchronously on repeat opens; `detail` is null until the first fetch
 *  resolves. `loading` distinguishes "fetch in flight" (render a skeleton)
 *  from "loaded but empty / failed" (render nothing). */
export function useRestaurantDetail(slug: string | undefined): {
  detail: RestaurantMapDetail | null;
  loading: boolean;
} {
  const [detail, setDetail] = useState<RestaurantMapDetail | null>(() =>
    slug ? (cache.get(slug) ?? null) : null
  );
  const [loading, setLoading] = useState(() => !!slug && !cache.has(slug));

  useEffect(() => {
    if (!slug) {
      setDetail(null);
      setLoading(false);
      return;
    }
    const cached = cache.get(slug);
    if (cached) {
      setDetail(cached);
      setLoading(false);
      return;
    }
    setDetail(null);
    setLoading(true);
    let active = true;
    void load(slug).then((d) => {
      if (active) {
        setDetail(d);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [slug]);

  return { detail, loading };
}
