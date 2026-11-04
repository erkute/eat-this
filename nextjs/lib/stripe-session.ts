import type Stripe from 'stripe';
import { getStripe } from './stripe';
import { getPack, type PackDef } from './stripe-catalog';

export type CheckoutMode = 'auth' | 'guest';
type CheckoutLocale = 'de' | 'en';

interface VerifiedCheckoutSession {
  session: Stripe.Checkout.Session;
  pack: PackDef;
  mode: CheckoutMode;
  locale: CheckoutLocale;
  uid: string | null;
}

export class CheckoutSessionIntegrityError extends Error {
  constructor(public readonly reason: string) {
    super(`Invalid checkout session: ${reason}`);
    this.name = 'CheckoutSessionIntegrityError';
  }
}

function fail(reason: string): never {
  throw new CheckoutSessionIntegrityError(reason);
}

/**
 * Validate every value that controls fulfillment against the server catalog.
 * The expanded line item must match the immutable Price/amount snapshot that
 * our checkout route stores on the session.
 */
export function verifyCheckoutSession(session: Stripe.Checkout.Session): VerifiedCheckoutSession {
  const metadata = session.metadata ?? {};
  const packId = metadata.packId;
  if (!packId) fail('missing_packId');

  const pack = getPack(packId);
  if (!pack) fail('unknown_packId');
  if (session.mode !== 'payment') fail('wrong_mode');
  if (session.currency?.toLowerCase() !== 'eur') fail('wrong_currency');
  if (metadata.type !== pack.type) fail('wrong_pack_type');
  if ((metadata.slug ?? '') !== (pack.slug ?? '')) fail('wrong_pack_slug');

  const mode = metadata.mode;
  if (mode !== 'auth' && mode !== 'guest') fail('wrong_checkout_mode');
  const uid = metadata.uid?.trim() || null;
  if (mode === 'auth' && !uid) fail('auth_uid_missing');
  if (mode === 'guest' && uid) fail('guest_uid_present');

  const lineItems = session.line_items;
  if (!lineItems || lineItems.has_more || lineItems.data.length !== 1) {
    fail('wrong_line_items');
  }
  const lineItem = lineItems.data[0];
  // The immutable checkout-time catalog snapshot keeps an async payment valid
  // after a legitimate Price/amount rotation.
  const expectedPriceId = metadata.checkoutPriceId;
  const expectedAmount = Number(metadata.checkoutAmountCents);
  if (!expectedPriceId || !Number.isSafeInteger(expectedAmount) || expectedAmount <= 0) {
    fail('missing_checkout_snapshot');
  }

  if (session.amount_total !== expectedAmount) fail('wrong_amount');
  if (lineItem.quantity !== 1) fail('wrong_quantity');
  if (lineItem.price?.id !== expectedPriceId) fail('wrong_price');
  if (lineItem.amount_total !== expectedAmount) fail('wrong_line_amount');

  return {
    session,
    pack,
    mode,
    locale: metadata.locale === 'en' ? 'en' : 'de',
    uid,
  };
}

export async function retrieveVerifiedCheckoutSession(
  sessionId: string
): Promise<VerifiedCheckoutSession> {
  const session = await getStripe().checkout.sessions.retrieve(sessionId, {
    expand: ['line_items.data.price'],
  });
  return verifyCheckoutSession(session);
}

export function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  if (typeof session.payment_intent === 'string') return session.payment_intent;
  return session.payment_intent?.id ?? null;
}
