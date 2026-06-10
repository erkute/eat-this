// Firestore-backed sliding-window rate limiter for Next.js route handlers.
// Keys live in _rateLimits/{key}; the collection is deny-all in
// firestore.rules, so only the Admin SDK (this code) can touch it.

import { getAdminFirestore } from './firebase/admin'
export { clientIp } from './clientIp'

/**
 * Returns true if the request is allowed, false if the key has hit its limit
 * within the window. Best-effort: on any Firestore error it fails OPEN
 * (returns true) so a transient datastore blip never locks out logins.
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<boolean> {
  const now    = Date.now()
  const cutoff = now - windowMs
  const ref    = getAdminFirestore().collection('_rateLimits').doc(key)

  try {
    return await getAdminFirestore().runTransaction(async (tx) => {
      const doc    = await tx.get(ref)
      const recent = (doc.exists ? (doc.data()?.requests ?? []) : []).filter(
        (t: number) => t > cutoff,
      )
      if (recent.length >= maxRequests) return false
      recent.push(now)
      tx.set(ref, { requests: recent, updatedAt: now }, { merge: false })
      return true
    })
  } catch {
    return true
  }
}
