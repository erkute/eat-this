// Resolves the Stripe Price ID for a pack in the current key mode.
//
// The catalog hardcodes LIVE price IDs. Staging and local dev run Stripe in
// test mode (sk_test_…) where those IDs don't exist — checkout died there
// with "No such price". Test-mode prices carry lookup_key = packId (seeded
// by scripts/seed-stripe-test-prices.ts) and are resolved here at runtime,
// cached per server instance.
import { getStripe } from './stripe'
import type { PackDef } from './stripe-catalog'

export function isTestMode(): boolean {
  return process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ?? false
}

const testPriceIds = new Map<string, string>()

export async function resolvePriceId(pack: Pick<PackDef, 'packId' | 'stripePriceId'>): Promise<string> {
  if (!isTestMode()) return pack.stripePriceId
  const hit = testPriceIds.get(pack.packId)
  if (hit) return hit
  const { data } = await getStripe().prices.list({ lookup_keys: [pack.packId], active: true, limit: 1 })
  const price = data[0]
  if (!price) {
    throw new Error(
      `No test-mode price with lookup_key "${pack.packId}" — run \`npx tsx scripts/seed-stripe-test-prices.ts\``,
    )
  }
  testPriceIds.set(pack.packId, price.id)
  return price.id
}
