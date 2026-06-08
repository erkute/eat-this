// nextjs/lib/buddy/rateLimit.ts
import { getAdminFirestore } from '@/lib/firebase/admin'

export interface RateLimitState {
  minuteStart: number
  minuteCount: number
  dayStart: number
  dayCount: number
}
export interface RateLimits {
  perMinute: number
  perDay: number
}
export interface RateLimitDecision {
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

function limitsFromEnv(): RateLimits {
  return {
    perMinute: Number(process.env.BUDDY_RATE_LIMIT_PER_MIN ?? 10),
    perDay: Number(process.env.BUDDY_RATE_LIMIT_PER_DAY ?? 100),
  }
}

// Firestore-backed wrapper. One doc per session in collection `buddyRateLimits`.
// Uses a transaction so concurrent requests for the same session stay consistent.
export async function checkRateLimit(
  sessionId: string,
  now: number = Date.now(),
): Promise<RateLimitDecision> {
  const db = getAdminFirestore()
  const ref = db.collection('buddyRateLimits').doc(sessionId)
  const limits = limitsFromEnv()
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const prev = (snap.exists ? (snap.data() as RateLimitState) : null) ?? null
    const decision = evaluateRateLimit(now, prev, limits)
    tx.set(ref, decision.state)
    return decision
  })
}
