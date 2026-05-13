'use client'
import { useEffect, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from './config'

// Live set of packIds the user owns. null while loading,
// empty Set while signed-out.
export function useOwnedEntitlements(uid: string | null): Set<string> | null {
  const [owned, setOwned] = useState<Set<string> | null>(uid ? null : new Set())

  useEffect(() => {
    if (!uid) { setOwned(new Set()); return }
    const ref = collection(db, 'users', uid, 'entitlements')
    const unsub = onSnapshot(ref, (snap) => {
      const next = new Set<string>()
      for (const d of snap.docs) next.add(d.id)
      setOwned(next)
    })
    return () => unsub()
  }, [uid])

  return owned
}
