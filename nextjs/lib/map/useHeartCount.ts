'use client'
import { useEffect, useState } from 'react'
import { getDb } from '@/lib/firebase/config'

// Reads the public, denormalised heart count for a restaurant
// (restaurants/{id}.heartCount, keyed by Sanity _id). Public doc — works for
// anon visitors too. Maintained server-side by the /api/heart transaction;
// clients only read it. See docs/specs/2026-06-09-hearts-design.md.
//
// Firestore SDK is code-split behind getDb() + a dynamic import (like the other
// map hooks) so it stays out of the SEO restaurant page's first-load bundle.
export function useHeartCount(restaurantId: string | null | undefined): { count: number; loading: boolean } {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!restaurantId) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const [{ doc, getDoc }, db] = await Promise.all([
          import('firebase/firestore'),
          getDb(),
        ])
        const snap = await getDoc(doc(db, 'restaurants', restaurantId))
        if (cancelled) return
        const raw = snap.exists() ? (snap.data() as { heartCount?: unknown }).heartCount : 0
        setCount(typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0, raw) : 0)
        setLoading(false)
      } catch {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [restaurantId])

  return { count, loading }
}
