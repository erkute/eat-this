// Takes a pack back when its payment is returned: a full refund or a lost
// dispute. The counterpart of lib/stripe-fulfill.ts.

import { getAdminAuth, getAdminFirestore } from './firebase/admin';
import { getStripe } from './stripe';
import { getPack } from './stripe-catalog';

export type RevocationResult = 'revoked' | 'nothing_to_revoke';

async function uidForGuestEmail(email: string | null | undefined): Promise<string | null> {
  if (!email) return null;
  try {
    return (await getAdminAuth().getUserByEmail(email)).uid;
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'auth/user-not-found') return null;
    throw err;
  }
}

/**
 * Removes the entitlement that this payment created. Idempotent: a repeated
 * delivery finds nothing left to remove.
 *
 * Only the Checkout session stored on the entitlement may take it back. The
 * webhook refunds a duplicate purchase on its own, and that refund must leave
 * the entitlement of the first, kept purchase alone.
 */
export async function revokeEntitlementForPayment(
  paymentIntent: string
): Promise<RevocationResult> {
  const sessions = await getStripe().checkout.sessions.list({
    payment_intent: paymentIntent,
    limit: 1,
  });
  const session = sessions.data[0];
  const pack = session ? getPack(session.metadata?.packId ?? '') : null;
  if (!session || !pack) return 'nothing_to_revoke';

  const uid =
    session.metadata?.uid?.trim() || (await uidForGuestEmail(session.customer_details?.email));
  if (!uid) return 'nothing_to_revoke';

  const db = getAdminFirestore();
  const ref = db.collection('users').doc(uid).collection('entitlements').doc(pack.packId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists || snap.data()?.stripeSessionId !== session.id) return 'nothing_to_revoke';
    tx.delete(ref);
    return 'revoked';
  });
}
