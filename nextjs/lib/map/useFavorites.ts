'use client'
import { useState, useEffect, useCallback } from 'react'
import { useLocale } from 'next-intl'
import { auth, getDb } from '@/lib/firebase/config'
import { client as sanityClient } from '@/lib/sanity'

interface FavoriteEntry {
  restaurantId: string
  name: string
  slug?: string
  photo?: string
  district?: string
  note?: string
}

interface UseFavoritesResult {
  favoriteIds: Set<string>
  favorites: FavoriteEntry[]
  toggle: (r: { _id: string; name: string; slug?: string; photo?: string; district?: string }) => Promise<void>
  updateNote: (restaurantId: string, note: string) => Promise<void>
  loading: boolean
}

export function useFavorites(uid: string | null): UseFavoritesResult {
  const locale = useLocale()
  // Per-uid localStorage cache so a returning user sees their saved spots
  // instantly on first paint instead of waiting on auth-resolve + the Firestore
  // read. The live getDocs reconciles + refreshes the cache right after.
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [favorites,   setFavorites]   = useState<FavoriteEntry[]>([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    if (!uid) { setLoading(false); return }
    const key = `eatthis_favorites_${uid}`

    // 1) Instant paint from cache (if any) — no network wait.
    try {
      const raw = window.localStorage.getItem(key)
      if (raw) {
        const cached = JSON.parse(raw) as FavoriteEntry[]
        if (Array.isArray(cached)) {
          setFavorites(cached)
          setFavoriteIds(new Set(cached.map(e => e.restaurantId)))
          setLoading(false)
        }
      }
    } catch { /* ignore bad cache */ }

    // 2) Live read — show as soon as it lands; don't block on the slug back-fill.
    //    Firestore SDK is code-split (see getDb) so it stays out of first-load.
    let active = true
    void (async () => {
      const [{ collection, doc, getDocs, updateDoc }, db] = await Promise.all([
        import('firebase/firestore'),
        getDb(),
      ])
      if (!active) return
      try {
        const snap = await getDocs(collection(db, 'users', uid, 'favorites'))
        if (!active) return
        const entries: FavoriteEntry[] = snap.docs.map(d => ({
          restaurantId: d.id,
          ...(d.data() as Omit<FavoriteEntry, 'restaurantId'>),
          note: (d.data() as { note?: string }).note ?? '',
        }))
        setFavoriteIds(new Set(entries.map(e => e.restaurantId)))
        setFavorites(entries)
        setLoading(false)
        try { window.localStorage.setItem(key, JSON.stringify(entries)) } catch { /* quota */ }

        // 3) Back-fill slugs for legacy entries in the background, then patch.
        const missing = entries.filter(e => !e.slug)
        if (missing.length > 0) {
          try {
            const ids = missing.map(e => e.restaurantId)
            const found = await sanityClient.fetch<Array<{ _id: string; slug: string }>>(
              `*[_type == "restaurant" && _id in $ids]{ _id, "slug": slug.current }`,
              { ids },
            )
            if (!active) return
            const bySlug = new Map(found.filter(r => r.slug).map(r => [r._id, r.slug]))
            if (bySlug.size > 0) {
              setFavorites(prev => {
                const patched = prev.map(e => bySlug.has(e.restaurantId) ? { ...e, slug: bySlug.get(e.restaurantId) } : e)
                try { window.localStorage.setItem(key, JSON.stringify(patched)) } catch { /* quota */ }
                return patched
              })
              for (const [id, slug] of bySlug) {
                updateDoc(doc(db, 'users', uid, 'favorites', id), { slug }).catch(() => {})
              }
            }
          } catch { /* ignore — slug stays empty, link falls back to /map */ }
        }
      } catch {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [uid])

  const toggle = useCallback(async (r: { _id: string; name: string; slug?: string; photo?: string; district?: string }) => {
    if (!uid || !auth.currentUser) {
      window.location.assign('/login')
      return
    }
    // The heart write goes through /api/heart (Admin SDK), which is the single
    // writer of both the favorite doc and the public restaurants/{id}.heartCount
    // aggregate — the two move in one transaction so the count can't drift.
    // (Replaces the old client-side setDoc/deleteDoc + the removed Cloud
    // Function trigger.) Local state + cache update only after the call lands.
    const adding = !favoriteIds.has(r._id)
    const writeCache = (next: FavoriteEntry[]) => {
      try { window.localStorage.setItem(`eatthis_favorites_${uid}`, JSON.stringify(next)) } catch { /* quota */ }
    }
    try {
      const token = await auth.currentUser.getIdToken()
      const res = await fetch('/api/heart', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
        body: JSON.stringify({
          restaurantId: r._id,
          action: adding ? 'add' : 'remove',
          name: r.name, slug: r.slug ?? '', photo: r.photo ?? '', district: r.district ?? '',
        }),
      })
      if (!res.ok) throw new Error(`heart ${res.status}`)
    } catch {
      window.showNotification?.(locale === 'en' ? 'Something went wrong' : 'Etwas ist schiefgelaufen')
      return
    }
    if (adding) {
      setFavoriteIds(prev => new Set([...prev, r._id]))
      setFavorites(prev => { const next = [...prev, { restaurantId: r._id, name: r.name, slug: r.slug, photo: r.photo, district: r.district }]; writeCache(next); return next })
      window.showNotification?.(locale === 'en' ? 'Spot saved' : 'Spot gespeichert')
    } else {
      setFavoriteIds(prev => { const s = new Set(prev); s.delete(r._id); return s })
      setFavorites(prev => { const next = prev.filter(f => f.restaurantId !== r._id); writeCache(next); return next })
      window.showNotification?.(locale === 'en' ? 'Spot removed' : 'Spot entfernt')
    }
  }, [uid, favoriteIds, locale])

  const updateNote = useCallback(async (restaurantId: string, note: string) => {
    if (!uid) return
    const [{ doc, updateDoc }, db] = await Promise.all([
      import('firebase/firestore'),
      getDb(),
    ])
    const ref = doc(db, 'users', uid, 'favorites', restaurantId)
    await updateDoc(ref, { note })
    setFavorites(prev => prev.map(f => f.restaurantId === restaurantId ? { ...f, note } : f))
  }, [uid])

  return { favoriteIds, favorites, toggle, updateNote, loading }
}
