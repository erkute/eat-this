/**
 * One-shot cleanup: removes the deprecated `price` (€/€€/€€€/€€€€ symbol)
 * field from every restaurant document. Replaced by the Places-derived
 * `priceRange` object which the frontend formats as "10–20 €".
 *
 * Touches both published and draft documents so an editor's open draft
 * doesn't keep showing the dead field.
 *
 * Run from `nextjs/`:
 *   npx tsx scripts/cleanup-restaurant-price.ts --dry-run
 *   npx tsx scripts/cleanup-restaurant-price.ts                 # apply
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
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  const opts: CliOptions = { dryRun: false }
  for (const arg of args) {
    if (arg === '--dry-run') opts.dryRun = true
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

interface Row {
  _id: string
  name: string
  price: string | null
}

async function main() {
  const { dryRun } = parseArgs()
  const rows = await sanity.fetch<Row[]>(
    `*[_type == "restaurant" && defined(price)]{_id, name, price}`,
    {},
    { perspective: 'raw' as const },
  )
  console.log(`Found ${rows.length} restaurant(s) with a legacy "price" field${dryRun ? ' [DRY RUN]' : ''}`)
  for (const r of rows) {
    console.log(`  → ${r.name} (${r._id}) — current price="${r.price}"`)
    if (!dryRun) {
      await sanity.patch(r._id).unset(['price']).commit()
    }
  }
  console.log('\nDone.')
}

main().catch(err => {
  console.error('Cleanup failed:', err)
  process.exit(1)
})
