// nextjs/lib/buddy/rateLimit.ts
import { getAdminFirestore } from '@/lib/firebase/admin'
import { Timestamp } from 'firebase-admin/firestore'

interface RateLimitState {
  minuteStart: number
  minuteCount: number
  dayStart: number
  dayCount: number
}
interface RateLimits {
  perMinute: number
  perDay: number
}
interface RateLimitDecision {
  allowed: boolean
  reason?: 'per_minute' | 'per_day'
  state: RateLimitState
}

const MINUTE = 60_000
const DAY = 86_400_000

export function evaluateRateLimit(
  now: number,
  prev: RateLimitState | null,
  limits: RateLimits,
): RateLimitDecision {
  const minuteFresh = !prev || now - prev.minuteStart >= MINUTE
  const dayFresh = !prev || now - prev.dayStart >= DAY

  const minuteStart = minuteFresh ? now : prev!.minuteStart
  const minuteCount = (minuteFresh ? 0 : prev!.minuteCount) + 1
  const dayStart = dayFresh ? now : prev!.dayStart
  const dayCount = (dayFresh ? 0 : prev!.dayCount) + 1

  const state: RateLimitState = { minuteStart, minuteCount, dayStart, dayCount }

  if (dayCount > limits.perDay) return { allowed: false, reason: 'per_day', state }
  if (minuteCount > limits.perMinute) return { allowed: false, reason: 'per_minute', state }
  return { allowed: true, state }
}

const num = (v: string | undefined, d: number) => {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : d
}

// Per-session limits: catch one user's UI spamming.
export function sessionLimitsFromEnv(): RateLimits {
  return {
    perMinute: num(process.env.BUDDY_RATE_LIMIT_PER_MIN, 10),
    perDay: num(process.env.BUDDY_RATE_LIMIT_PER_DAY, 100),
  }
}

// Per-IP limits: catch someone scripting the endpoint (sessionId is trivially
// reset client-side, so this is the real abuse guard). Higher than the session
// limits because several real users can share one IP (NAT / mobile carriers).
export function ipLimitsFromEnv(): RateLimits {
  return {
    perMinute: num(process.env.BUDDY_RATE_LIMIT_IP_PER_MIN, 30),
    perDay: num(process.env.BUDDY_RATE_LIMIT_IP_PER_DAY, 400),
  }
}

// Firestore-backed sliding-window counter, one doc per key in `buddyRateLimits`.
// Transaction keeps concurrent requests for the same key consistent. `key` is a
// namespaced id like `s:<sessionId>` or `ip:<sha256>` (never a raw IP).
export async function checkRateLimit(
  key: string,
  limits: RateLimits,
  now: number = Date.now(),
): Promise<RateLimitDecision> {
  const db = getAdminFirestore()
  const ref = db.collection('buddyRateLimits').doc(key)
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const prev = (snap.exists ? (snap.data() as RateLimitState) : null) ?? null
    const decision = evaluateRateLimit(now, prev, limits)
    // `expiresAt` is a real Firestore Timestamp so the native TTL policy
    // (firestore.indexes.json → buddyRateLimits.expiresAt) garbage-collects
    // stale per-session/per-IP/per-uid docs. Without it this collection grew
    // forever (one doc per key, never deleted). Expire one full day-window
    // after the day bucket opened.
    tx.set(ref, {
      ...decision.state,
      expiresAt: Timestamp.fromMillis(decision.state.dayStart + DAY),
    })
    return decision
  })
}
