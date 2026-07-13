import { randomUUID } from 'node:crypto'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getAdminFirestore } from './firebase/admin'

const CHECKOUT_LIFETIME_SECONDS = 60 * 60
// Stripe rejects a new Checkout Session whose expires_at is less than
// 30 minutes away. Leave one minute of clock-skew/headroom on retries.
const MIN_CREATE_WINDOW_SECONDS = 31 * 60

interface AttemptData {
  attemptId?: string
  expiresAt?: FirebaseFirestore.Timestamp
  sessionUrl?: string
}

export type CheckoutAttempt =
  | { kind: 'create'; attemptId: string; expiresAtSeconds: number }
  | { kind: 'reuse'; url: string }

function attemptRef(uid: string, packId: string) {
  return getAdminFirestore()
    .collection('users').doc(uid)
    .collection('stripeCheckoutAttempts').doc(packId)
}

/**
 * One deterministic document per signed-in buyer and pack serializes parallel
 * checkout requests. A request that finds an in-flight attempt reuses its
 * idempotency key; once Stripe has answered, later requests reuse its URL.
 */
export async function reserveCheckoutAttempt(uid: string, packId: string): Promise<CheckoutAttempt> {
  const ref = attemptRef(uid, packId)
  const nowSeconds = Math.floor(Date.now() / 1000)

  return getAdminFirestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const data = snap.exists ? snap.data() as AttemptData : null
    const expiresAtSeconds = data?.expiresAt?.seconds ?? 0

    if (data?.attemptId && expiresAtSeconds > nowSeconds) {
      if (data.sessionUrl) return { kind: 'reuse', url: data.sessionUrl }
      if (expiresAtSeconds > nowSeconds + MIN_CREATE_WINDOW_SECONDS) {
        return { kind: 'create', attemptId: data.attemptId, expiresAtSeconds }
      }
      // A previous Stripe create failed and left too little time to reuse its
      // expires_at value. Fall through and rotate the attempt/idempotency key
      // instead of returning a request that Stripe must reject.
    }

    const attemptId = randomUUID()
    const nextExpiry = nowSeconds + CHECKOUT_LIFETIME_SECONDS
    tx.set(ref, {
      attemptId,
      status: 'creating',
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(nextExpiry * 1000),
    })
    return { kind: 'create', attemptId, expiresAtSeconds: nextExpiry }
  })
}

export async function saveCheckoutAttempt(
  uid: string,
  packId: string,
  attemptId: string,
  sessionId: string,
  sessionUrl: string,
): Promise<void> {
  const ref = attemptRef(uid, packId)
  await getAdminFirestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists || (snap.data() as AttemptData).attemptId !== attemptId) return
    tx.update(ref, { status: 'open', sessionId, sessionUrl })
  })
}
