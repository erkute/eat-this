'use client'
import { useState, useEffect, useCallback } from 'react'
import { collection, doc, getDocs, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

interface UseUnlockedMustEatsResult {
  unlockedIds: Set<string>
  unlock: (mustEatId: string, restaurantId: string, dish: string) => Promise<void>
  loading: boolean
}

// Per-uid localStorage cache of unlocked Must-Eat IDs so the profile deck paints
// the already-unlocked cards immediately instead of flashing the all-locked
// default while Firestore loads. Firestore stays the source of truth and
// reconciles the set on first read.
const CACHE_KEY = (uid: string) => `eatthis_unlocked_${uid}`

function readCache(uid: string | null): Set<string> {
  if (!uid || typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(CACHE_KEY(uid))
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return Array.isArray(arr)
      ? new Set(arr.filter((x): x is string => typeof x === 'string'))
      : new Set()
  } catch { return new Set() }
}

function writeCache(uid: string, ids: Set<string>) {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(CACHE_KEY(uid), JSON.stringify([...ids])) } catch {}
}

export function useUnlockedMustEats(uid: string | null): UseUnlockedMustEatsResult {
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(() => readCache(uid))
  // A warm cache means we can paint immediately; only "loading" when there's
  // nothing cached to show yet.
  const [loading, setLoading] = useState(() => !!uid && readCache(uid).size === 0)

  useEffect(() => {
    if (!uid) { setUnlockedIds(new Set()); setLoading(false); return }
    // uid may have changed since mount — reseed from this uid's cache first.
    const cached = readCache(uid)
    setUnlockedIds(cached)
    setLoading(cached.size === 0)
    getDocs(collection(db, 'users', uid, 'unlockedMustEats'))
      .then(snap => {
        const next = new Set(snap.docs.map(d => d.id))
        setUnlockedIds(next)
        writeCache(uid, next)
      })
      .finally(() => setLoading(false))
  }, [uid])

  const unlock = useCallback(async (mustEatId: string, restaurantId: string, dish: string) => {
    if (!uid) return
    await setDoc(doc(db, 'users', uid, 'unlockedMustEats', mustEatId), {
      restaurantId,
      dish,
      unlockedAt: serverTimestamp(),
    })
    setUnlockedIds(prev => {
      const next = new Set([...prev, mustEatId])
      writeCache(uid, next)
      return next
    })
  }, [uid])

  return { unlockedIds, unlock, loading }
}
