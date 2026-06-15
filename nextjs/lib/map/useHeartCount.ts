'use client'
import { useEffect, useState } from 'react'
import { getDb } from '@/lib/firebase/config'

// Live public heart count for a restaurant (restaurants/{id}.heartCount, keyed
// by Sanity _id). Public doc — works for anon visitors too. Subscribes with
// onSnapshot so the count updates in real time everywhere it's shown (map
// detail sheet + SEO page) the moment the /api/heart transaction lands — no
// reopen/reload needed. Maintained server-side; clients only read.
// See docs/specs/2026-06-09-hearts-design.md.
//
// Firestore SDK is code-split behind getDb() + a dynamic import (like the other
// map hooks) so it stays out of the SEO restaurant page's first-load bundle.
export function useHeartCount(restaurantId: string | null | undefined): { count: number; loading: boolean } {
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!restaurantId) { setLoading(false); return }
    let cancelled = false
    let unsubscribe: (() => void) | null = null
    setLoading(true)
    void (async () => {
      const [{ doc, onSnapshot }, db] = await Promise.all([
        import('firebase/firestore'),
        getDb(),
      ])
      if (cancelled) return
      unsubscribe = onSnapshot(
        doc(db, 'restaurants', restaurantId),
        (snap) => {
          const raw = snap.exists() ? (snap.data() as { heartCount?: unknown }).heartCount : 0
          setCount(typeof raw === 'number' && Number.isFinite(raw) ? Math.max(0, raw) : 0)
          setLoading(false)
        },
        () => { setLoading(false) }, // read denied / offline → keep last count, stop loading
      )
    })()
    return () => { cancelled = true; unsubscribe?.() }
  }, [restaurantId])

  return { count, loading }
}
