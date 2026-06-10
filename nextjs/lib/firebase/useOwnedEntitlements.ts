'use client'
import { useEffect, useState } from 'react'
import { getDb } from './config'

// Per-uid localStorage cache of owned packIds. Lets the map/profile resolve the
// user's tier (starter vs all-berlin) on first paint instead of flashing the
// default while the Firestore snapshot loads. Same trick as the avatar cache.
const CACHE_KEY = (uid: string) => `eatthis_entitlements_${uid}`

function readCache(uid: string | null): Set<string> | null {
  if (!uid || typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CACHE_KEY(uid))
    if (!raw) return null
    const arr = JSON.parse(raw)
    return Array.isArray(arr)
      ? new Set(arr.filter((x): x is string => typeof x === 'string'))
      : null
  } catch { return null }
}

function writeCache(uid: string, owned: Set<string>) {
  if (typeof window === 'undefined') return
  try { window.localStorage.setItem(CACHE_KEY(uid), JSON.stringify([...owned])) } catch {}
}

// Live set of packIds the user owns. null while loading (no cache yet),
// empty Set while signed-out.
export function useOwnedEntitlements(uid: string | null): Set<string> | null {
  const [owned, setOwned] = useState<Set<string> | null>(
    () => (uid ? readCache(uid) : new Set()),
  )

  useEffect(() => {
    if (!uid) { setOwned(new Set()); return }
    // uid may have changed since mount — reseed from this uid's cache first.
    setOwned(readCache(uid))
    let unsub = () => {}
    let active = true
    void (async () => {
      const [{ collection, onSnapshot }, db] = await Promise.all([
        import('firebase/firestore'),
        getDb(),
      ])
      if (!active) return
      const ref = collection(db, 'users', uid, 'entitlements')
      unsub = onSnapshot(ref, (snap) => {
        const next = new Set<string>()
        for (const d of snap.docs) next.add(d.id)
        setOwned(next)
        writeCache(uid, next)
      })
    })()
    return () => { active = false; unsub() }
  }, [uid])

  return owned
}
