// Server-only Stripe client. Do not import from a client component —
// requiring this module on the client pulls Node-only crypto APIs.
import Stripe from 'stripe';

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  cached = new Stripe(key, {
    apiVersion: '2026-10-28.endive',
    typescript: true,
  });
  return cached;
}
