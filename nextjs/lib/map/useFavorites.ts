'use client'
import { useState, useEffect, useCallback } from 'react'
import { collection, doc, getDocs, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'

export interface FavoriteEntry {
  restaurantId: string
  name: string
  photo?: string
  district?: string
}

interface UseFavoritesResult {
  favoriteIds: Set<string>
  favorites: FavoriteEntry[]
  toggle: (r: { _id: string; name: string; photo?: string; district?: string }) => Promise<void>
  loading: boolean
}

export function useFavorites(uid: string | null): UseFavoritesResult {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [favorites,   setFavorites]   = useState<FavoriteEntry[]>([])
  const [loading,     setLoading]     = useState(true)

  useEffect(() => {
    if (!uid) { setLoading(false); return }
    getDocs(collection(db, 'users', uid, 'favorites'))
      .then(snap => {
        const entries = snap.docs.map(d => ({ restaurantId: d.id, ...(d.data() as Omit<FavoriteEntry, 'restaurantId'>) }))
        setFavoriteIds(new Set(snap.docs.map(d => d.id)))
        setFavorites(entries)
      })
      .finally(() => setLoading(false))
  }, [uid])

  const toggle = useCallback(async (r: { _id: string; name: string; photo?: string; district?: string }) => {
    if (!uid) {
      ;(window as unknown as { openWelcomeModal?: () => void }).openWelcomeModal?.()
      return
    }
    const ref = doc(db, 'users', uid, 'favorites', r._id)
    if (favoriteIds.has(r._id)) {
      await deleteDoc(ref)
      setFavoriteIds(prev => { const s = new Set(prev); s.delete(r._id); return s })
      setFavorites(prev => prev.filter(f => f.restaurantId !== r._id))
    } else {
      const entry = { name: r.name, photo: r.photo ?? '', district: r.district ?? '', savedAt: serverTimestamp() }
      await setDoc(ref, entry)
      setFavoriteIds(prev => new Set([...prev, r._id]))
      setFavorites(prev => [...prev, { restaurantId: r._id, name: r.name, photo: r.photo, district: r.district }])
    }
  }, [uid, favoriteIds])

  return { favoriteIds, favorites, toggle, loading }
}
