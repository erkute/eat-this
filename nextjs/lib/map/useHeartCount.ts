'use client'
import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

// Reads the public, denormalised heart count for a restaurant
// (restaurants/{id}.heartCount, keyed by Sanity _id). Public doc — works for
// anon visitors too. Maintained server-side by Cloud Functions; clients only
// read it. See docs/specs/2026-06-09-hearts-design.md.
export function useHeartCount(restaurantId: string | null | undefined): { count: number; loading: boolean } {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!restaurantId) { setLoading(false); return }
    let cancelled = false
    setLoading(true)
    getDoc(doc(db, 'restaurants', restaurantId))
      .then(snap => {
        if (cancelled) return
        const raw = snap.exists() ? (snap.data() as { heartCount?: unknown }).heartCount : 0
        setCount(typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0, raw) : 0)
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [restaurantId])

  return { count, loading }
}
