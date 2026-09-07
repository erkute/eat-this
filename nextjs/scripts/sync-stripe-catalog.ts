/**
 * Bringt Stripe auf den Stand des Katalogs — Text und Verkäuflichkeit.
 *
 * **Beschreibung.** Der `description.de`-Text IST der Fließtext auf der
 * Stripe-Hosted-Checkout-Seite. Er steht doppelt — einmal im Code, einmal im
 * Dashboard — und genau das ist am 06.09.2026 auseinandergelaufen: der Code
 * verkauft seither Karten, das Dashboard versprach weiter „Spots auf deiner
 * Map".
 *
 * **Verkäuflichkeit.** Ein Pack ohne Karte ist eine leere Schachtel. Die App
 * blendet den Knopf aus und `/api/stripe/checkout` weist `empty_pack` ab —
 * aber ein alter Payment-Link geht an beidem vorbei, der spricht direkt mit
 * Stripe. Deshalb wird der Preis dort inaktiv gesetzt.
 *
 * Und zwar als ABGLEICH, nicht als Schalter: die Kartenzahl kommt live aus
 * Sanity, also schaltet derselbe Lauf ein Pack wieder scharf, sobald es seine
 * erste Karte hat. Ein Schalter von Hand hätte die umgekehrte Falle — jemand
 * müsste daran denken, und niemand denkt daran (dasselbe Muster wie bei den
 * Beschreibungen, die zwei Tage lang das Falsche versprachen).
 *
 * Der Schlüssel kommt aus der Umgebung und wird nirgends abgelegt.
 *
 * Aus `nextjs/`, Trockenlauf zuerst:
 *   STRIPE_SECRET_KEY=sk_… npx tsx scripts/sync-stripe-catalog.ts
 *   STRIPE_SECRET_KEY=sk_… npx tsx scripts/sync-stripe-catalog.ts --apply
 *
 * Beide Modi funktionieren, und der Schlüssel entscheidet, welcher:
 *   sk_live_… → das Produkt heißt wie die packId (Konvention des Katalogs)
 *   sk_test_… → die Produkte hat scripts/seed-stripe-test-prices.ts angelegt,
 *               ihre IDs sind generiert; gefunden werden sie über den
 *               `lookup_key` des Preises, der die packId trägt.
 */
import Stripe from 'stripe';
import { createClient } from '@sanity/client';
import { CATALOG, type PackDef } from '../lib/stripe-catalog';
import { packContentsQuery } from '../lib/queries';

/** Kartenzahl je Kategorie-Slug — dieselbe Query, die auch /packs zählt, damit
 *  Stripe und die App nicht über verschiedene Zahlen entscheiden können. */
async function cardsByCategory(): Promise<Record<string, number>> {
  const client = createClient({
    projectId: process.env.SANITY_PROJECT_ID ?? 'ehwjnjr2',
    dataset: process.env.SANITY_DATASET ?? 'production',
    apiVersion: '2024-01-01',
    useCdn: true,
  });
  const raw = await client.fetch<{
    categories: { slug: string; mustEats: number }[];
    allBerlin: { mustEats: number };
  }>(packContentsQuery);
  const out: Record<string, number> = { 'all-berlin': raw.allBerlin.mustEats };
  for (const c of raw.categories) out[c.slug] = c.mustEats;
  return out;
}

/** Produkt UND Preis zu einem Pack, in beiden Modi.
 *
 *  Der Preis wird ohne `active`-Filter gesucht: ein bereits deaktivierter muss
 *  gefunden werden, sonst könnte dieses Skript ihn nie wieder anschalten. */
async function findPack(
  stripe: Stripe,
  pack: PackDef,
  testMode: boolean
): Promise<{ product: Stripe.Product; price: Stripe.Price } | null> {
  if (!testMode) {
    try {
      const [product, price] = await Promise.all([
        stripe.products.retrieve(pack.packId),
        stripe.prices.retrieve(pack.stripePriceId),
      ]);
      return product.deleted ? null : { product, price };
    } catch {
      return null;
    }
  }
  const { data } = await stripe.prices.list({
    lookup_keys: [pack.packId],
    limit: 1,
    expand: ['data.product'],
  });
  const price = data[0];
  const product = price?.product;
  return price && product && typeof product !== 'string' && !product.deleted
    ? { product, price }
    : null;
}

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error(
      'STRIPE_SECRET_KEY ist nicht gesetzt. Den Schlüssel aus dem Stripe-Dashboard\n' +
        '(Developers → API keys) oder dem Secret Manager per env übergeben — er wird\n' +
        'nirgends gespeichert:\n\n' +
        '  STRIPE_SECRET_KEY=sk_… npx tsx scripts/sync-stripe-catalog.ts'
    );
    process.exit(1);
  }
  const testMode = key.startsWith('sk_test_');
  const apply = process.argv.includes('--apply');
  const stripe = new Stripe(key, { apiVersion: '2025-02-24.acacia', typescript: true });

  console.log(
    `${apply ? '— SCHREIBEN —' : '— TROCKENLAUF —'} Stripe-Modus: ${testMode ? 'TEST' : 'LIVE'}\n`
  );

  const cards = await cardsByCategory();

  let drift = 0;
  let missing = 0;

  for (const pack of Object.values(CATALOG)) {
    const found = await findPack(stripe, pack, testMode);
    if (!found) {
      missing++;
      console.log(`✗ ${pack.packId}: kein Produkt/Preis gefunden`);
      continue;
    }
    const { product, price } = found;

    /* Ein Pack ist verkäuflich, solange es mindestens eine Karte trägt. Für
       all-berlin zählt der ganze Stapel. Fehlt die Kategorie in der Antwort,
       gilt sie als leer — lieber einen Verkauf zu wenig als eine leere
       Schachtel. */
    const cardCount = cards[pack.slug ?? 'all-berlin'] ?? 0;
    const shouldSell = cardCount > 0;

    const changes: string[] = [];
    if (product.description !== pack.description.de) {
      changes.push('Beschreibung');
    }
    if (price.active !== shouldSell) {
      changes.push(shouldSell ? 'Preis anschalten' : 'Preis abschalten');
    }

    if (changes.length === 0) {
      console.log(
        `✓ ${pack.packId}: stimmt (${cardCount} Karten, Preis ${price.active ? 'aktiv' : 'inaktiv'})`
      );
      continue;
    }

    drift++;
    console.log(`~ ${pack.packId} (${product.id}, „${product.name}") — ${changes.join(', ')}`);
    if (product.description !== pack.description.de) {
      console.log(`    Text alt: ${product.description ?? '(leer)'}`);
      console.log(`    Text neu: ${pack.description.de}`);
    }
    if (price.active !== shouldSell) {
      console.log(
        `    Preis ${price.id}: ${price.active ? 'aktiv' : 'inaktiv'} → ${shouldSell ? 'aktiv' : 'inaktiv'} (${cardCount} Karten)`
      );
    }

    if (apply) {
      if (product.description !== pack.description.de) {
        await stripe.products.update(product.id, { description: pack.description.de });
      }
      if (price.active !== shouldSell) {
        await stripe.prices.update(price.id, { active: shouldSell });
      }
      console.log('    → geschrieben');
    }
  }

  console.log(
    `\n${drift} von ${Object.keys(CATALOG).length} Packs weichen ab` +
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
  /* Ein falsch kopierter Schlüssel ist der wahrscheinlichste Fehlschlag hier —
     als Stapelspur ist er unlesbar, als Satz sofort behoben. */
  if (err instanceof Stripe.errors.StripeAuthenticationError) {
    console.error('Stripe lehnt den Schlüssel ab. Vertippt, oder der falsche Modus?');
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});
