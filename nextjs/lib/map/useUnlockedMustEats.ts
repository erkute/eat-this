'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { auth, getDb } from '@/lib/firebase/config';
import type { MapMustEat } from '@/lib/types';

interface UseUnlockedMustEatsResult {
  unlockedIds: Set<string>;
  /** When each card was revealed on site (epoch ms), for the ones the user
   *  revealed themselves. Drives the profile's "zuletzt aufgedeckt" strip —
   *  publicly face-up cards carry no reveal moment and are absent here. */
  unlockedAt: ReadonlyMap<string, number>;
  /** On-site reveal: persists the unlock server-side and returns the full
   *  must-eat (covered cards ship stripped — see stripCoveredMustEats), or
   *  null when not signed in / the request failed. */
  unlock: (mustEatId: string) => Promise<MapMustEat | null>;
  loading: boolean;
}

// Per-uid localStorage cache of unlocked Must-Eat IDs (+ reveal time) so the
// profile deck paints the already-unlocked cards immediately instead of
// flashing the all-locked default while Firestore loads. Firestore stays the
// source of truth and reconciles the set on first read.
const CACHE_KEY = (uid: string) => `eatthis_unlocked_v2_${uid}`;

type RevealEntry = [id: string, unlockedAt: number];

function readCache(uid: string | null): Map<string, number> {
  if (!uid || typeof window === 'undefined') return new Map();
  try {
    const raw = window.localStorage.getItem(CACHE_KEY(uid));
    if (!raw) return new Map();
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return new Map();
    return new Map(
      arr.filter(
        (e): e is RevealEntry =>
          Array.isArray(e) && typeof e[0] === 'string' && typeof e[1] === 'number'
      )
    );
  } catch {
    return new Map();
  }
}

function writeCache(uid: string, reveals: Map<string, number>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CACHE_KEY(uid), JSON.stringify([...reveals]));
  } catch {}
}

/** Firestore Timestamp | Date | epoch ms → epoch ms, 0 when unreadable. */
function toEpochMs(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  const millis = (value as { toMillis?: () => number } | null)?.toMillis;
  return typeof millis === 'function' ? (value as { toMillis: () => number }).toMillis() : 0;
}

export function useUnlockedMustEats(uid: string | null): UseUnlockedMustEatsResult {
  const [reveals, setReveals] = useState<Map<string, number>>(() => readCache(uid));
  // A warm cache means we can paint immediately; only "loading" when there's
  // nothing cached to show yet.
  const [loading, setLoading] = useState(() => !!uid && readCache(uid).size === 0);

  useEffect(() => {
    if (!uid) {
      setReveals(new Map());
      setLoading(false);
      return;
    }
    // uid may have changed since mount — reseed from this uid's cache first.
    const cached = readCache(uid);
    setReveals(cached);
    setLoading(cached.size === 0);
    let active = true;
    void (async () => {
      const [{ collection, getDocs }, db] = await Promise.all([
        import('firebase/firestore'),
        getDb(),
      ]);
      if (!active) return;
      try {
        const snap = await getDocs(collection(db, 'users', uid, 'unlockedMustEats'));
        if (!active) return;
        const next = new Map(
          snap.docs.map((d) => [d.id, toEpochMs((d.data() as { unlockedAt?: unknown }).unlockedAt)])
        );
        setReveals(next);
        writeCache(uid, next);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [uid]);

  const unlock = useCallback(
    async (mustEatId: string): Promise<MapMustEat | null> => {
      if (!uid || !auth.currentUser) return null;
      const token = await auth.currentUser.getIdToken();
      const r = await fetch('/api/must-eat-reveal', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mustEatId }),
      });
      if (!r.ok) return null;
      const { mustEat } = (await r.json()) as { mustEat: MapMustEat };
      setReveals((prev) => {
        const next = new Map(prev).set(mustEatId, Date.now());
        writeCache(uid, next);
        return next;
      });
      return mustEat;
    },
    [uid]
  );

  const unlockedIds = useMemo(() => new Set(reveals.keys()), [reveals]);

  return { unlockedIds, unlockedAt: reveals, unlock, loading };
}
