'use client'

import { useEffect, useRef } from 'react'
import { auth, db } from '@/lib/firebase/config'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, onSnapshot } from 'firebase/firestore'
import { useTranslation } from '@/lib/i18n'

// Fire the confirm POST at most once per browser session.
const SESSION_KEY = 'referralConfirmFired'

export default function ReferralToastListener() {
  const { lang } = useTranslation()
  const langRef = useRef(lang)
  langRef.current = lang

  // Confirm on authed load. The HttpOnly cookie travels automatically; the
  // server no-ops cheaply when there's no pending referral.
  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (!user) return
      if (sessionStorage.getItem(SESSION_KEY)) return
      sessionStorage.setItem(SESSION_KEY, '1')
      try {
        const idToken = await user.getIdToken()
        await fetch('/api/referral/confirm', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ idToken }),
        })
      } catch {
        // Silent — retries next session.
      }
    })
  }, [])

  // Toast the INVITER when a new 'invited' bonus doc arrives. The first
  // snapshot seeds the seen-set so historical bonuses never toast.
  useEffect(() => {
    let unsubBonuses: (() => void) | null = null
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubBonuses?.()
      unsubBonuses = null
      if (!user) return
      const seen = new Set<string>()
      let seeded = false
      const ref = collection(db, 'users', user.uid, 'referralBonuses')
      unsubBonuses = onSnapshot(ref, (snap) => {
        if (!seeded) {
          snap.forEach((d) => seen.add(d.id))
          seeded = true
          return
        }
        snap.docChanges().forEach((chg) => {
          if (chg.type !== 'added' || seen.has(chg.doc.id)) return
          seen.add(chg.doc.id)
          if (chg.doc.data().source === 'invited') {
            const msg =
              langRef.current === 'en'
                ? 'Someone joined through your link — new spots unlocked!'
                : 'Jemand ist über deinen Link gestartet — neue Spots freigeschaltet!'
            window.showNotification?.(msg, 5000)
          }
        })
      })
    })
    return () => {
      unsubBonuses?.()
      unsubAuth()
    }
  }, [])

  return null
}
