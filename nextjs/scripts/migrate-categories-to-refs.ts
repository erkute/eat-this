/**
 * Migrates the legacy `restaurant.categories: string[]` field to a reference
 * array pointing at `category` documents, and backfills DE/EN labels on the
 * existing 8 category docs.
 *
 * Two phases (run in order or independently):
 *   --phase=categories  → backfill name (DE), nameEn, description, descriptionEn on the 8 category docs.
 *   --phase=restaurants → for every restaurant (published + draft), replace any string in `categories[]`
 *                         with a `{_type: 'reference', _ref: <id>}` to the matching category doc.
 *   (no flag)           → run both, in order.
 *
 * Idempotent: re-running on already-migrated docs is a no-op.
 *
 * Run from `nextjs/`:
 *   npx tsx scripts/migrate-categories-to-refs.ts --dry-run
 *   npx tsx scripts/migrate-categories-to-refs.ts                    # apply
 *   npx tsx scripts/migrate-categories-to-refs.ts --phase=restaurants
 *
 * Required env (in nextjs/.env.local):
 *   SANITY_API_WRITE_TOKEN  (Editor role)
 */
import { config as loadEnv } from 'dotenv'
import { createClient } from '@sanity/client'

loadEnv({ path: '.env.local' })

const SANITY_PROJECT_ID = 'ehwjnjr2'
const SANITY_DATASET = 'production'
const SANITY_API_VERSION = '2024-01-01'

interface CliOptions {
  dryRun: boolean
  phase: 'all' | 'categories' | 'restaurants'
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  const opts: CliOptions = { dryRun: false, phase: 'all' }
  for (const arg of args) {
    if (arg === '--dry-run') opts.dryRun = true
    else if (arg === '--phase=categories') opts.phase = 'categories'
    else if (arg === '--phase=restaurants') opts.phase = 'restaurants'
    else if (arg === '--phase=all') opts.phase = 'all'
    else throw new Error(`Unknown arg: ${arg}`)
  }
  return opts
}

const token = process.env.SANITY_API_WRITE_TOKEN
if (!token) {
  console.error('Missing SANITY_API_WRITE_TOKEN in nextjs/.env.local')
  process.exit(1)
}

const sanity = createClient({
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  apiVersion: SANITY_API_VERSION,
  token,
  useCdn: false,
})

// ──────────────────────────────────────────────────────────────────────────
// Phase A — backfill category docs
// ──────────────────────────────────────────────────────────────────────────

// Source-of-truth label/blurb pairs. The current `name` value in each doc is
// the canonical English identifier; this maps it to the desired DE+EN labels
// and a starter blurb that the editor can refine in Studio later.
type CatBackfill = {
  name: string         // DE display label
  nameEn: string
  description: string  // DE blurb
  descriptionEn: string
}

const CATEGORY_BACKFILL: Record<string, CatBackfill> = {
  Dinner: {
    name: 'Dinner',
    nameEn: 'Dinner',
    description: 'Berlins beste Restaurants zum Abendessen — von Bistro bis Tasting Menu.',
    descriptionEn: "Berlin's best dinner spots — from neighbourhood bistros to tasting menus.",
  },
  Lunch: {
    name: 'Lunch',
    nameEn: 'Lunch',
    description: 'Mittagspause in Berlin — schnelle Klassiker und kuratierte Lunch-Spots.',
    descriptionEn: 'Lunch in Berlin — fast classics and curated lunch spots.',
  },
  Breakfast: {
    name: 'Frühstück',
    nameEn: 'Breakfast',
    description: 'Frühstück und Brunch in Berlin — von der Bäckerei bis zum Eggs Benedict.',
    descriptionEn: 'Breakfast and brunch in Berlin — from the corner bakery to eggs benedict.',
  },
  Coffee: {
    name: 'Kaffee',
    nameEn: 'Coffee',
    description: 'Specialty Coffee, Röstereien und Cafés — wo Berlin ernsthaft Kaffee trinkt.',
    descriptionEn: 'Specialty coffee, roasteries, and cafés — where Berlin drinks coffee seriously.',
  },
  Sweets: {
    name: 'Süßes',
    nameEn: 'Sweets',
    description: 'Patisserie, Eis, Donuts und Schokolade — Berlins süße Adressen.',
    descriptionEn: "Pastry, ice cream, donuts and chocolate — Berlin's sweet addresses.",
  },
  Pizza: {
    name: 'Pizza',
    nameEn: 'Pizza',
    description: 'Pizza in Berlin — Napoletana, römische Schnitte, Sourdough und alles dazwischen.',
    descriptionEn: 'Pizza in Berlin — Napoletana, Roman al taglio, sourdough and everything in between.',
  },
  Drinks: {
    name: 'Getränke',
    nameEn: 'Drinks',
    description: 'Cocktailbars, Weinbars und Spätis mit Plan — wo Berlin abends einen guten Drink findet.',
    descriptionEn: 'Cocktail bars, wine bars and curated bottle shops — where Berlin grabs a serious drink.',
  },
  'Fine Dining': {
    name: 'Fine Dining',
    nameEn: 'Fine Dining',
    description: 'Berlins Fine-Dining-Spots — Tasting Menus, Sterneküchen und gehobene Häuser.',
    descriptionEn: "Berlin's fine-dining destinations — tasting menus, starred kitchens, and special-occasion spots.",
  },
}

interface CategoryDoc {
  _id: string
  name: string
  nameEn: string | null
  description: string | null
  descriptionEn: string | null
}

async function backfillCategories(dryRun: boolean): Promise<Map<string, string>> {
  console.log('\n── Phase A: backfill category docs ─────────────────────────')
  const docs = await sanity.fetch<CategoryDoc[]>(
    `*[_type=="category"]{_id, name, nameEn, description, descriptionEn}`,
  )
  // Build lookup by EN identifier (the original `name`) AND by DE name (post-
  // migration) so phase B can resolve both old strings ("Coffee") and any
  // accidental DE-string entries.
  const refByKey = new Map<string, string>()

  for (const doc of docs) {
    // Match by either current `name` (pre-migration: EN identifier) or by the
    // already-renamed DE name (post-migration / partial run).
    const key = Object.keys(CATEGORY_BACKFILL).find(
      k => k === doc.name || CATEGORY_BACKFILL[k].name === doc.name,
    )
    if (!key) {
      console.warn(`  ⚠ no backfill mapping for category "${doc.name}" (${doc._id}) — skipping`)
      continue
    }
    const target = CATEGORY_BACKFILL[key]
    refByKey.set(key, doc._id)
    refByKey.set(target.name, doc._id)
    refByKey.set(target.nameEn, doc._id)

    const patch: Record<string, string> = {}
    if (doc.name !== target.name) patch.name = target.name
    if (!doc.nameEn) patch.nameEn = target.nameEn
    if (!doc.description) patch.description = target.description
    if (!doc.descriptionEn) patch.descriptionEn = target.descriptionEn

    if (Object.keys(patch).length === 0) {
      console.log(`  ✓ ${key} (${doc._id}) — already migrated`)
      continue
    }

    console.log(`  → ${key} (${doc._id}) — set: ${Object.keys(patch).join(', ')}`)
    if (!dryRun) {
      await sanity.patch(doc._id).set(patch).commit()
    }
  }

  return refByKey
}

// ──────────────────────────────────────────────────────────────────────────
// Phase B — restaurant categories: strings → references
// ──────────────────────────────────────────────────────────────────────────

interface RestaurantDoc {
  _id: string
  name: string
  categories: unknown[] | null
}

function isRefAlready(item: unknown): boolean {
  return (
    typeof item === 'object' &&
    item !== null &&
    '_type' in item &&
    (item as { _type: unknown })._type === 'reference'
  )
}

async function migrateRestaurants(refByKey: Map<string, string>, dryRun: boolean) {
  console.log('\n── Phase B: restaurant.categories → refs ───────────────────')

  // Pull every restaurant (published + draft) including its raw categories array.
  // The `raw` perspective surfaces both, so we handle drafts as well as published
  // docs in a single pass — important because restaurants in flight from
  // import-from-url.ts live as drafts.
  const docs = await sanity.fetch<RestaurantDoc[]>(
    `*[_type=="restaurant"]{_id, name, categories}`,
    {},
    { perspective: 'raw' as const },
  )

  let migrated = 0
  let skipped = 0
  let droppedNullEntries = 0

  for (const doc of docs) {
    if (!Array.isArray(doc.categories) || doc.categories.length === 0) {
      skipped++
      continue
    }

    // If every entry is already a reference, skip.
    if (doc.categories.every(isRefAlready)) {
      skipped++
      continue
    }

    const newCategories: { _key: string; _type: 'reference'; _ref: string }[] = []
    const unresolved: string[] = []
    let hadNullOrEmpty = false

    for (const item of doc.categories) {
      if (item == null) {
        hadNullOrEmpty = true
        droppedNullEntries++
        continue
      }
      if (isRefAlready(item)) {
        const ref = item as { _key?: string; _type: 'reference'; _ref: string }
        newCategories.push({
          _key: ref._key ?? randomKey(),
          _type: 'reference',
          _ref: ref._ref,
        })
        continue
      }
      if (typeof item === 'string') {
        const trimmed = item.trim()
        if (!trimmed) {
          hadNullOrEmpty = true
          droppedNullEntries++
          continue
        }
        const refId = refByKey.get(trimmed)
        if (!refId) {
          unresolved.push(trimmed)
          continue
        }
        // Skip duplicates on the same doc.
        if (newCategories.some(c => c._ref === refId)) continue
        newCategories.push({
          _key: randomKey(),
          _type: 'reference',
          _ref: refId,
        })
        continue
      }
      unresolved.push(JSON.stringify(item))
    }

    if (unresolved.length > 0) {
      console.warn(
        `  ⚠ ${doc.name} (${doc._id}) — unresolved category entries: ${unresolved.join(', ')} — leaving doc untouched`,
      )
      continue
    }

    const note = hadNullOrEmpty ? ' (dropped null/empty)' : ''
    console.log(
      `  → ${doc.name} (${doc._id}) — ${doc.categories.length} → ${newCategories.length} refs${note}`,
    )
    if (!dryRun) {
      await sanity.patch(doc._id).set({ categories: newCategories }).commit()
    }
    migrated++
  }

  console.log(`\n  migrated: ${migrated}`)
  console.log(`  skipped:  ${skipped} (already refs / no categories)`)
  if (droppedNullEntries > 0) console.log(`  dropped:  ${droppedNullEntries} null/empty array entries`)
}

function randomKey(): string {
  // Sanity array items need a unique `_key`. crypto.randomUUID is available
  // in Node ≥ 19 (the project's tsx scripts run on the system Node).
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12)
}

// ──────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs()
  console.log(`migrate-categories-to-refs: phase=${opts.phase} dryRun=${opts.dryRun}`)

  let refByKey = new Map<string, string>()
  if (opts.phase === 'all' || opts.phase === 'categories') {
    refByKey = await backfillCategories(opts.dryRun)
  } else {
    // Phase B alone: load existing category ids without modifying them.
    const docs = await sanity.fetch<CategoryDoc[]>(
      `*[_type=="category"]{_id, name, nameEn, description, descriptionEn}`,
    )
    for (const doc of docs) {
      const key = Object.keys(CATEGORY_BACKFILL).find(
        k => k === doc.name || CATEGORY_BACKFILL[k].name === doc.name,
      )
      if (!key) continue
      const target = CATEGORY_BACKFILL[key]
      refByKey.set(key, doc._id)
      refByKey.set(target.name, doc._id)
      refByKey.set(target.nameEn, doc._id)
    }
  }

  if (opts.phase === 'all' || opts.phase === 'restaurants') {
    await migrateRestaurants(refByKey, opts.dryRun)
  }

  console.log('\nDone.')
}

main().catch(err => {
  console.error('Migration failed:', err)
  process.exit(1)
})
