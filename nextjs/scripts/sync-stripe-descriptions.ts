/**
 * Zieht die Pack-Beschreibungen aus `lib/stripe-catalog.ts` ins Stripe-Produkt.
 *
 * Der `description.de`-Text IST der Fließtext auf der Stripe-Hosted-Checkout-
 * Seite. Er steht doppelt — einmal hier im Code, einmal im Dashboard — und
 * genau das ist am 06.09.2026 auseinandergelaufen: der Code verkauft seither
 * Karten, das Dashboard versprach weiter „Spots auf deiner Map". Wer den Text
 * im Code ändert, muss ihn dort nachziehen; dieses Skript ist der Weg dorthin.
 *
 * Der Schlüssel kommt aus der Umgebung und wird nirgends abgelegt.
 *
 * Aus `nextjs/`, Trockenlauf zuerst:
 *   STRIPE_SECRET_KEY=sk_… npx tsx scripts/sync-stripe-descriptions.ts
 *   STRIPE_SECRET_KEY=sk_… npx tsx scripts/sync-stripe-descriptions.ts --apply
 *
 * Beide Modi funktionieren, und der Schlüssel entscheidet, welcher:
 *   sk_live_… → das Produkt heißt wie die packId (Konvention des Katalogs)
 *   sk_test_… → die Produkte hat scripts/seed-stripe-test-prices.ts angelegt,
 *               ihre IDs sind generiert; gefunden werden sie über den
 *               `lookup_key` des Preises, der die packId trägt.
 */
import Stripe from 'stripe';
import { CATALOG, type PackDef } from '../lib/stripe-catalog';

/** Das Stripe-Produkt zu einem Pack, in beiden Modi. */
async function findProduct(
  stripe: Stripe,
  pack: PackDef,
  testMode: boolean
): Promise<Stripe.Product | null> {
  if (!testMode) {
    try {
      return await stripe.products.retrieve(pack.packId);
    } catch {
      return null;
    }
  }
  const { data } = await stripe.prices.list({
    lookup_keys: [pack.packId],
    active: true,
    limit: 1,
    expand: ['data.product'],
  });
  const product = data[0]?.product;
  return product && typeof product !== 'string' && !product.deleted ? product : null;
}

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error(
      'STRIPE_SECRET_KEY ist nicht gesetzt. Den Schlüssel aus dem Stripe-Dashboard\n' +
        '(Developers → API keys) oder dem Secret Manager per env übergeben — er wird\n' +
        'nirgends gespeichert:\n\n' +
        '  STRIPE_SECRET_KEY=sk_… npx tsx scripts/sync-stripe-descriptions.ts'
    );
    process.exit(1);
  }
  const testMode = key.startsWith('sk_test_');
  const apply = process.argv.includes('--apply');
  const stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia', typescript: true });

  console.log(
    `${apply ? '— SCHREIBEN —' : '— TROCKENLAUF —'} Stripe-Modus: ${testMode ? 'TEST' : 'LIVE'}\n`
  );

  let drift = 0;
  let missing = 0;

  for (const pack of Object.values(CATALOG)) {
    const product = await findProduct(stripe, pack, testMode);
    if (!product) {
      missing++;
      console.log(`✗ ${pack.packId}: kein Produkt gefunden`);
      continue;
    }

    const wanted = pack.description.de;
    if (product.description === wanted) {
      console.log(`✓ ${pack.packId}: stimmt überein`);
      continue;
    }

    drift++;
    console.log(`~ ${pack.packId} (${product.id}, „${product.name}")`);
    console.log(`    alt: ${product.description ?? '(leer)'}`);
    console.log(`    neu: ${wanted}`);
    if (apply) {
      await stripe.products.update(product.id, { description: wanted });
      console.log('    → geschrieben');
    }
  }

  console.log(
    `\n${drift} von ${Object.keys(CATALOG).length} Produkten weichen ab` +
      (missing ? `, ${missing} nicht gefunden` : '')
  );
  if (drift > 0 && !apply) {
    console.log('Zum Schreiben: dasselbe Kommando mit --apply');
  }
  if (missing > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
