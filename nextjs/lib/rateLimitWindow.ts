// nextjs/lib/rateLimitWindow.ts
//
// Der Zwei-Fenster-Begrenzer: eine Minute UND ein Tag, ein Dokument je
// Schluessel in `buddyRateLimits`.
//
// Er lag bis 08.09.2026 als `checkRateLimit` unter `lib/buddy/` — obwohl
// /api/count, /api/consent, /api/heart und /api/must-eat-reveal ihn genauso
// benutzen. Zwei gleichnamige Funktionen mit verschiedener Semantik
// (`lib/rateLimit.ts` zaehlt EIN Fenster und entscheidet die Fehlerpolitik
// selbst) sind eine Falle: ein Import-Vertipper tauscht lautlos Verhalten aus.
// Deshalb der eigene Name und der eigene Ort. Der Gegenpart heisst
// `checkRateLimit` / `checkRateLimitFailClosed` in `lib/rateLimit.ts`.
import { getAdminFirestore } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

interface RateLimitState {
  minuteStart: number;
  minuteCount: number;
  dayStart: number;
  dayCount: number;
}
interface RateLimits {
  perMinute: number;
  perDay: number;
}
interface RateLimitDecision {
  allowed: boolean;
  reason?: 'per_minute' | 'per_day' | 'unavailable';
  state: RateLimitState;
}

/**
 * Was gilt, wenn Firestore die Frage nicht beantworten kann.
 *
 * `allow`: die Aktion ist wichtiger als der Riegel — ein Beacon oder ein
 * Einwilligungsnachweis darf nicht an einer Firestore-Stoerung scheitern.
 * `deny`: die Aktion kostet Geld oder gibt bezahlte Inhalte heraus — ohne
 * zaehlbaren Riegel lieber gar nicht.
 *
 * Es gibt bewusst keinen Standardwert: bis 08.09.2026 hatte dieser Begrenzer
 * gar keine Fehlerpolitik, eine Firestore-Stoerung flog ungefangen durch und
 * machte aus einem 204 einen 500 in Sentry.
 */
export type RateLimitFailurePolicy = 'allow' | 'deny';

const MINUTE = 60_000;
const DAY = 86_400_000;

export function evaluateRateLimit(
  now: number,
  prev: RateLimitState | null,
  limits: RateLimits
): RateLimitDecision {
  const minuteFresh = !prev || now - prev.minuteStart >= MINUTE;
  const dayFresh = !prev || now - prev.dayStart >= DAY;

  const minuteStart = minuteFresh ? now : prev!.minuteStart;
  const minuteCount = (minuteFresh ? 0 : prev!.minuteCount) + 1;
  const dayStart = dayFresh ? now : prev!.dayStart;
  const dayCount = (dayFresh ? 0 : prev!.dayCount) + 1;

  const state: RateLimitState = { minuteStart, minuteCount, dayStart, dayCount };

  if (dayCount > limits.perDay) return { allowed: false, reason: 'per_day', state };
  if (minuteCount > limits.perMinute) return { allowed: false, reason: 'per_minute', state };
  return { allowed: true, state };
}

const num = (v: string | undefined, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : d;
};

// Per-session limits: catch one user's UI spamming.
export function sessionLimitsFromEnv(): RateLimits {
  return {
    perMinute: num(process.env.BUDDY_RATE_LIMIT_PER_MIN, 10),
    perDay: num(process.env.BUDDY_RATE_LIMIT_PER_DAY, 100),
  };
}

// Per-IP limits: catch someone scripting the endpoint (sessionId is trivially
// reset client-side, so this is the real abuse guard). Higher than the session
// limits because several real users can share one IP (NAT / mobile carriers).
export function ipLimitsFromEnv(): RateLimits {
  return {
    perMinute: num(process.env.BUDDY_RATE_LIMIT_IP_PER_MIN, 30),
    perDay: num(process.env.BUDDY_RATE_LIMIT_IP_PER_DAY, 400),
  };
}

// Firestore-backed sliding-window counter, one doc per key in `buddyRateLimits`.
// Transaction keeps concurrent requests for the same key consistent. `key` is a
// namespaced id like `s:<sessionId>` or `ip:<sha256>` (never a raw IP).
export async function checkWindowedRateLimit(
  key: string,
  limits: RateLimits,
  onError: RateLimitFailurePolicy,
  now: number = Date.now()
): Promise<RateLimitDecision> {
  try {
    const db = getAdminFirestore();
    const ref = db.collection('buddyRateLimits').doc(key);
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const prev = (snap.exists ? (snap.data() as RateLimitState) : null) ?? null;
      const decision = evaluateRateLimit(now, prev, limits);
      // `expiresAt` is a real Firestore Timestamp so the native TTL policy
      // (firestore.indexes.json → buddyRateLimits.expiresAt) garbage-collects
      // stale per-session/per-IP/per-uid docs. Without it this collection grew
      // forever (one doc per key, never deleted). Expire one full day-window
      // after the day bucket opened.
      tx.set(ref, {
        ...decision.state,
        expiresAt: Timestamp.fromMillis(decision.state.dayStart + DAY),
      });
      return decision;
    });
  } catch (error) {
    // Der Name reicht: die Nachricht kann den Schluessel tragen, und der ist
    // ein Besucher-Hash.
    console.error(
      '[rateLimitWindow] Firestore unavailable',
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
