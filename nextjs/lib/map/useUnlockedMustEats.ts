'use client'
import { useState, useEffect, useCallback } from 'react'
import { collection, doc, getDocs, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

interface UseUnlockedMustEatsResult {
  unlockedIds: Set<string>
  unlock: (mustEatId: string, restaurantId: string, dish: string) => Promise<void>
  loading: boolean
}

export function useUnlockedMustEats(uid: string | null): UseUnlockedMustEatsResult {
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set())
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    if (!uid) { setLoading(false); return }
    getDocs(collection(db, 'users', uid, 'unlockedMustEats'))
      .then(snap => setUnlockedIds(new Set(snap.docs.map(d => d.id))))
      .finally(() => setLoading(false))
  }, [uid])

  const unlock = useCallback(async (mustEatId: string, restaurantId: string, dish: string) => {
    if (!uid) return
    await setDoc(doc(db, 'users', uid, 'unlockedMustEats', mustEatId), {
      restaurantId,
      dish,
      unlockedAt: serverTimestamp(),
    })
    setUnlockedIds(prev => new Set([...prev, mustEatId]))
  }, [uid])

  return { unlockedIds, unlock, loading }
}
