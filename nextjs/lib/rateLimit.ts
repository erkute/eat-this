// Firestore-backed sliding-window rate limiter for Next.js route handlers.
// Keys live in _rateLimits/{key}; the collection is deny-all in
// firestore.rules, so only the Admin SDK (this code) can touch it.

import { getAdminFirestore } from './firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'
export { clientIp } from './clientIp'

interface WindowDoc {
  windowStart: number
  count: number
}

/**
 * Returns true if the request is allowed, false if the key has hit its limit
 * within the window.
 *
 * Fixed-window counter (one O(1) doc per key): `{ windowStart, count }`. This
 * replaces the previous sliding-window `requests: number[]` array, which grew
 * unbounded for a hammered key and could reach Firestore's 1 MB doc limit
 * inside a single window.
 *
 * `expiresAt` is a real Firestore `Timestamp` so the native TTL policy
 * (firestore.indexes.json → `_rateLimits.expiresAt`) actually garbage-collects
 * stale keys. (The old `updatedAt` field was a plain number, which TTL ignores.)
 */
async function consumeRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<boolean> {
  const now = Date.now()
  const db  = getAdminFirestore()
  const ref = db.collection('_rateLimits').doc(key)

  return db.runTransaction(async (tx) => {
    const doc   = await tx.get(ref)
    const prev  = doc.exists ? (doc.data() as WindowDoc) : null
    const fresh = !prev || now - prev.windowStart >= windowMs

    const windowStart = fresh ? now : prev!.windowStart
    const count       = (fresh ? 0 : prev!.count) + 1
    if (count > maxRequests) return false

    tx.set(ref, {
      windowStart,
      count,
      expiresAt: Timestamp.fromMillis(windowStart + windowMs),
    })
    return true
  })
}

/**
 * Authentication-friendly policy: a transient Firestore failure must not lock
 * users out of login or magic-link flows, so those existing callers fail open.
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<boolean> {
  try {
    return await consumeRateLimit(key, maxRequests, windowMs)
  } catch {
    return true
  }
}

/**
 * Cost/security-sensitive variant. If Firestore cannot verify and increment
 * the counter, deny the operation rather than removing the abuse guard.
 */
export async function checkRateLimitFailClosed(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<boolean> {
  try {
    return await consumeRateLimit(key, maxRequests, windowMs)
  } catch {
    return false
  }
}
