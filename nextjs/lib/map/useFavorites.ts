'use client'
import { useState, useEffect, useCallback } from 'react'
import { collection, doc, getDocs, setDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import { client as sanityClient } from '@/lib/sanity'

export interface FavoriteEntry {
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
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [favorites,   setFavorites]   = useState<FavoriteEntry[]>([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    if (!uid) { setLoading(false); return }
    getDocs(collection(db, 'users', uid, 'favorites'))
      .then(async snap => {
        const entries: FavoriteEntry[] = snap.docs.map(d => ({
          restaurantId: d.id,
          ...(d.data() as Omit<FavoriteEntry, 'restaurantId'>),
          note: (d.data() as { note?: string }).note ?? '',
        }))

        // Back-fill slugs for entries saved before slug support was added.
        const missing = entries.filter(e => !e.slug)
        if (missing.length > 0) {
          try {
            const ids = missing.map(e => e.restaurantId)
            const found = await sanityClient.fetch<Array<{ _id: string; slug: string }>>(
              `*[_type == "restaurant" && _id in $ids]{ _id, "slug": slug.current }`,
              { ids },
            )
            for (const r of found) {
              if (!r.slug) continue
              const entry = entries.find(e => e.restaurantId === r._id)
              if (entry) entry.slug = r.slug
              updateDoc(doc(db, 'users', uid, 'favorites', r._id), { slug: r.slug }).catch(() => {})
            }
          } catch { /* ignore — slug stays empty, link falls back to /map */ }
        }

        setFavoriteIds(new Set(snap.docs.map(d => d.id)))
        setFavorites(entries)
      })
      .finally(() => setLoading(false))
  }, [uid])

  const toggle = useCallback(async (r: { _id: string; name: string; slug?: string; photo?: string; district?: string }) => {
    if (!uid) {
      window.location.assign('/login')
      return
    }
    const ref = doc(db, 'users', uid, 'favorites', r._id)
    if (favoriteIds.has(r._id)) {
      await deleteDoc(ref)
      setFavoriteIds(prev => { const s = new Set(prev); s.delete(r._id); return s })
      setFavorites(prev => prev.filter(f => f.restaurantId !== r._id))
    } else {
      const entry = { name: r.name, slug: r.slug ?? '', photo: r.photo ?? '', district: r.district ?? '', savedAt: serverTimestamp() }
      await setDoc(ref, entry)
      setFavoriteIds(prev => new Set([...prev, r._id]))
      setFavorites(prev => [...prev, { restaurantId: r._id, name: r.name, slug: r.slug, photo: r.photo, district: r.district }])
    }
  }, [uid, favoriteIds])

  const updateNote = useCallback(async (restaurantId: string, note: string) => {
    if (!uid) return
    const ref = doc(db, 'users', uid, 'favorites', restaurantId)
    await updateDoc(ref, { note })
    setFavorites(prev => prev.map(f => f.restaurantId === restaurantId ? { ...f, note } : f))
  }, [uid])

  return { favoriteIds, favorites, toggle, updateNote, loading }
}
