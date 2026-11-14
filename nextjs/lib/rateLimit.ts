// Firestore-backed rate limits for route handlers.
//
// One document per key in `_rateLimits`. The collection is deny-all in
// firestore.rules, so only the Admin SDK (this code) can touch it, and the TTL
// policy on `expiresAt` (firestore.indexes.json) removes stale keys.
//
// Two shapes of limit share the collection, each under its own key prefixes:
//   checkRateLimit / checkRateLimitFailClosed   one window of any length
//   checkWindowedRateLimit(Batch)               a minute AND a day at once
//
// A key names whom it limits, so anything personal (an IP, an email address)
// goes in hashed: see lib/rateLimitKey.ts.

import { getAdminFirestore } from './firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
export { clientIp } from './clientIp';

const COLLECTION = '_rateLimits';

// ---------------------------------------------------------------------------
// One window
// ---------------------------------------------------------------------------

interface WindowDoc {
  windowStart: number;
  count: number;
}

/** Fixed-window counter. True while the key is within `maxRequests`. */
async function consumeRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<boolean> {
  const now = Date.now();
  const db = getAdminFirestore();
  const ref = db.collection(COLLECTION).doc(key);

  return db.runTransaction(async (tx) => {
    const doc = await tx.get(ref);
    const data = doc.exists ? (doc.data() as Partial<WindowDoc>) : null;
    const prev =
      typeof data?.windowStart === 'number' && typeof data.count === 'number'
        ? (data as WindowDoc)
        : null;
    const fresh = !prev || now - prev.windowStart >= windowMs;

    const windowStart = fresh ? now : prev.windowStart;
    const count = (fresh ? 0 : prev.count) + 1;
    if (count > maxRequests) return false;

    tx.set(ref, {
      windowStart,
      count,
      expiresAt: Timestamp.fromMillis(windowStart + windowMs),
    });
    return true;
  });
}

/**
 * Fails open: when Firestore cannot answer, the request goes through. For
 * actions that must not depend on the limiter, such as signing in or buying.
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<boolean> {
  try {
    return await consumeRateLimit(key, maxRequests, windowMs);
  } catch {
    return true;
  }
}

/**
 * Fails closed: when Firestore cannot count the request, it is denied. For
 * actions that cost money or hand out protected content.
 */
export async function checkRateLimitFailClosed(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<boolean> {
  try {
    return await consumeRateLimit(key, maxRequests, windowMs);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// A minute and a day
// ---------------------------------------------------------------------------

interface RateLimitState {
  minuteStart: number;
  minuteCount: number;
  dayStart: number;
  dayCount: number;
}
export interface RateLimits {
  perMinute: number;
  perDay: number;
}
export interface RateLimitDecision {
  allowed: boolean;
  reason?: 'per_minute' | 'per_day' | 'unavailable';
  state: RateLimitState;
}

/**
 * What applies when Firestore cannot answer. There is no default on purpose:
 * every caller decides.
 *
 * `allow`: the action matters more than the limit, such as a counting beacon.
 * `deny`: the action costs money or hands out paid content.
 */
type RateLimitFailurePolicy = 'allow' | 'deny';

const MINUTE = 60_000;
const DAY = 86_400_000;

export function evaluateRateLimit(
  now: number,
  prev: RateLimitState | null,
  limits: RateLimits,
  count = 1
): RateLimitDecision {
  const minuteFresh = !prev || now - prev.minuteStart >= MINUTE;
  const dayFresh = !prev || now - prev.dayStart >= DAY;

  const minuteStart = minuteFresh ? now : prev!.minuteStart;
  const minuteCount = (minuteFresh ? 0 : prev!.minuteCount) + count;
  const dayStart = dayFresh ? now : prev!.dayStart;
  const dayCount = (dayFresh ? 0 : prev!.dayCount) + count;

  const state: RateLimitState = { minuteStart, minuteCount, dayStart, dayCount };

  if (dayCount > limits.perDay) return { allowed: false, reason: 'per_day', state };
  if (minuteCount > limits.perMinute) return { allowed: false, reason: 'per_minute', state };
  return { allowed: true, state };
}

/** `key` is a namespaced id such as `heart:<uid>` or `buddy:ip:<hash>`, never a raw IP. */
export async function checkWindowedRateLimit(
  key: string,
  limits: RateLimits,
  onError: RateLimitFailurePolicy,
  now: number = Date.now()
): Promise<RateLimitDecision> {
  return checkWindowedRateLimitBatch(key, limits, onError, 1, now);
}

/**
 * The same for `count` requests at once: one transaction, one decision for all
 * of them. For callers that pool concurrent requests for one key
 * (lib/rateLimitCoalesce.ts), which would otherwise queue up behind each other
 * on the same document.
 */
export async function checkWindowedRateLimitBatch(
  key: string,
  limits: RateLimits,
  onError: RateLimitFailurePolicy,
  count: number,
  now: number = Date.now()
): Promise<RateLimitDecision> {
  try {
    const db = getAdminFirestore();
    const ref = db.collection(COLLECTION).doc(key);
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = snap.exists ? (snap.data() as Partial<RateLimitState>) : null;
      const prev =
        typeof data?.minuteStart === 'number' && typeof data.dayStart === 'number'
          ? (data as RateLimitState)
          : null;
      const decision = evaluateRateLimit(now, prev, limits, count);
      // Expires one full day after the day bucket opened.
      tx.set(ref, {
        ...decision.state,
        expiresAt: Timestamp.fromMillis(decision.state.dayStart + DAY),
      });
      return decision;
    });
  } catch (error) {
    // The name only: the message can carry the key, and the key is a visitor hash.
    console.error(
      '[rateLimit] Firestore unavailable',
      error instanceof Error ? error.name : 'UnknownError'
    );
    const state: RateLimitState = {
      minuteStart: now,
      minuteCount: 0,
      dayStart: now,
      dayCount: 0,
    };
    return onError === 'allow'
      ? { allowed: true, state }
      : { allowed: false, reason: 'unavailable', state };
  }
}
