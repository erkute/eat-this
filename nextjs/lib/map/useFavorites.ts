'use client'
import { useState, useEffect, useCallback } from 'react'
import { useLocale } from 'next-intl'
import { auth, getDb } from '@/lib/firebase/config'
import { useLoginModal } from '@/lib/auth'

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

interface FavoritesState {
  ownerUid: string | null
  favoriteIds: Set<string>
  favorites: FavoriteEntry[]
  loading: boolean
}

function emptyState(ownerUid: string | null, loading: boolean): FavoritesState {
  return { ownerUid, favoriteIds: new Set(), favorites: [], loading }
}

export function useFavorites(uid: string | null): UseFavoritesResult {
  const locale = useLocale()
  const { open: openLoginModal } = useLoginModal()
  // Per-uid localStorage cache so a returning user sees their saved spots
  // instantly on first paint instead of waiting on auth-resolve + the Firestore
  // read. The live getDocs reconciles + refreshes the cache right after.
  const [state, setState] = useState<FavoritesState>(() => emptyState(uid, !!uid))

  useEffect(() => {
    if (!uid) {
      setState(emptyState(null, false))
      return
    }
    const key = `eatthis_favorites_${uid}`

    // 1) Atomically replace the previous owner's state with this uid's cache
    // (or a clean loading state). `ownerUid` also prevents the render between
    // a prop change and this effect from exposing the previous account.
    let cached: FavoriteEntry[] | null = null
    try {
      const raw = window.localStorage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw) as FavoriteEntry[]
        if (Array.isArray(parsed)) cached = parsed
      }
    } catch { /* ignore bad cache */ }
    setState(cached
      ? {
          ownerUid: uid,
          favoriteIds: new Set(cached.map((entry) => entry.restaurantId)),
          favorites: cached,
          loading: false,
        }
      : emptyState(uid, true))

    // 2) Live read — show as soon as it lands.
    //    Firestore SDK is code-split (see getDb) so it stays out of first-load.
    let active = true
    void (async () => {
      try {
        const [{ collection, getDocs }, db] = await Promise.all([
          import('firebase/firestore'),
          getDb(),
        ])
        if (!active) return
        const snap = await getDocs(collection(db, 'users', uid, 'favorites'))
        if (!active) return
        const entries: FavoriteEntry[] = snap.docs.map(d => ({
          restaurantId: d.id,
          ...(d.data() as Omit<FavoriteEntry, 'restaurantId'>),
          note: (d.data() as { note?: string }).note ?? '',
        }))
        setState({
          ownerUid: uid,
          favoriteIds: new Set(entries.map((entry) => entry.restaurantId)),
          favorites: entries,
          loading: false,
        })
        try { window.localStorage.setItem(key, JSON.stringify(entries)) } catch { /* quota */ }
      } catch {
        if (active) {
          setState((current) => current.ownerUid === uid
            ? { ...current, loading: false }
            : current)
        }
      }
    })()
    return () => { active = false }
  }, [uid])

  const visibleState = state.ownerUid === uid
    ? state
    : emptyState(uid, !!uid)
  const { favoriteIds, favorites, loading } = visibleState

  const toggle = useCallback(async (r: { _id: string; name: string; slug?: string; photo?: string; district?: string }) => {
    if (!uid || !auth.currentUser) {
      openLoginModal('signin')
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
        }),
      })
      if (!res.ok) throw new Error(`heart ${res.status}`)
    } catch {
      window.showNotification?.(locale === 'en' ? 'Something went wrong' : 'Etwas ist schiefgelaufen')
      return
    }
    if (adding) {
      setState((current) => {
        if (current.ownerUid !== uid) return current
        const next = [...current.favorites, {
          restaurantId: r._id,
          name: r.name,
          slug: r.slug,
          photo: r.photo,
          district: r.district,
        }]
        writeCache(next)
        return {
          ...current,
          favoriteIds: new Set([...current.favoriteIds, r._id]),
          favorites: next,
        }
      })
      window.showNotification?.(locale === 'en' ? 'Spot saved' : 'Spot gespeichert')
    } else {
      setState((current) => {
        if (current.ownerUid !== uid) return current
        const nextIds = new Set(current.favoriteIds)
        nextIds.delete(r._id)
        const next = current.favorites.filter((favorite) => favorite.restaurantId !== r._id)
        writeCache(next)
        return { ...current, favoriteIds: nextIds, favorites: next }
      })
      window.showNotification?.(locale === 'en' ? 'Spot removed' : 'Spot entfernt')
    }
  }, [uid, favoriteIds, locale, openLoginModal])

  const updateNote = useCallback(async (restaurantId: string, note: string) => {
    if (!uid) return
    const [{ doc, updateDoc }, db] = await Promise.all([
      import('firebase/firestore'),
      getDb(),
    ])
    const ref = doc(db, 'users', uid, 'favorites', restaurantId)
    await updateDoc(ref, { note })
    setState((current) => {
      if (current.ownerUid !== uid) return current
      const next = current.favorites.map((favorite) =>
        favorite.restaurantId === restaurantId ? { ...favorite, note } : favorite)
      try { window.localStorage.setItem(`eatthis_favorites_${uid}`, JSON.stringify(next)) } catch { /* quota */ }
      return { ...current, favorites: next }
    })
  }, [uid])

  return { favoriteIds, favorites, toggle, updateNote, loading }
}
