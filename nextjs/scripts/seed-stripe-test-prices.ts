/**
 * Seed test-mode Stripe products/prices for every catalog pack.
 *
 * Staging and local dev run Stripe with a test key; the live price IDs in
 * lib/stripe-catalog.ts don't exist there, so checkout failed with
 * "No such price". This creates one product + price per pack with
 * lookup_key = packId, which lib/stripe-price.ts resolves at runtime.
 * Idempotent — packs whose lookup_key already exists are skipped.
 *
 * Run from `nextjs/` with the TEST key (refuses live keys):
 *   STRIPE_SECRET_KEY=sk_test_... npx tsx scripts/seed-stripe-test-prices.ts
 */
import Stripe from 'stripe'
import { CATALOG } from '../lib/stripe-catalog'

async function main() {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    console.error('STRIPE_SECRET_KEY is not set — pass the sk_test_… key via env.')
    process.exit(1)
  }
  if (!key.startsWith('sk_test_')) {
    console.error('Refusing to run: STRIPE_SECRET_KEY is not a test-mode key (sk_test_…).')
    process.exit(1)
  }

  const stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia', typescript: true })

  for (const pack of Object.values(CATALOG)) {
    const existing = await stripe.prices.list({ lookup_keys: [pack.packId], active: true, limit: 1 })
    if (existing.data[0]) {
      console.log(`✓ ${pack.packId} → ${existing.data[0].id} (already seeded)`)
      continue
    }
    const product = await stripe.products.create({
      name: pack.displayName,
      description: pack.description,
      metadata: { packId: pack.packId },
    })
    const price = await stripe.prices.create({
      product: product.id,
      currency: 'eur',
      unit_amount: pack.amountCents,
      lookup_key: pack.packId,
      metadata: { packId: pack.packId },
    })
    console.log(`+ ${pack.packId} → ${price.id} (created, €${(pack.amountCents / 100).toFixed(2)})`)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
