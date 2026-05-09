/**
 * Backfills `priceRange` on restaurant documents from Google Places API v1.
 * Maps the Places `priceRange.{startPrice,endPrice}.units` (string) into our
 * Sanity `priceRange.{min,max,currency}` object, so the map detail can render
 * "10–20 €" instead of "€€".
 *
 * Run from `nextjs/`:
 *   npx tsx scripts/backfill-price-ranges.ts --dry-run
 *   npx tsx scripts/backfill-price-ranges.ts --limit 5
 *   npx tsx scripts/backfill-price-ranges.ts            # all
 *   npx tsx scripts/backfill-price-ranges.ts --force    # overwrite existing
 *
 * Required env (in nextjs/.env.local):
 *   SANITY_API_WRITE_TOKEN  (Editor role)
 *   GOOGLE_API_KEY          (Places API v1 enabled)
 *
 * Notes:
 * - Places API only returns priceRange for restaurants where Google has the
 *   data — skipping is normal, often <50 % coverage.
 * - The script writes to the *published* doc (not drafts); editorial does not
 *   need to publish anything afterwards.
 * - Sanity transaction.patch(id, callback) silently no-ops, so each restaurant
 *   is patched with two separate awaits per the project memo.
 */
import { config as loadEnv } from 'dotenv'
import { createClient } from '@sanity/client'

loadEnv({ path: '.env.local' })

const SANITY_PROJECT_ID = 'ehwjnjr2'
const SANITY_DATASET = 'production'
const SANITY_API_VERSION = '2024-01-01'

interface CliOptions {
  limit: number | null
  dryRun: boolean
  force: boolean
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  const opts: CliOptions = { limit: null, dryRun: false, force: false }
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--dry-run') opts.dryRun = true
    else if (arg === '--force') opts.force = true
    else if (arg === '--limit') opts.limit = parseInt(args[++i] ?? '', 10)
    else throw new Error(`Unknown arg: ${arg}`)
  }
  if (opts.limit !== null && (Number.isNaN(opts.limit) || opts.limit < 1)) {
    throw new Error(`--limit must be a positive integer`)
  }
  return opts
}

function requireEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env var: ${name}. Add it to nextjs/.env.local.`)
  return v
}

const sanity = createClient({
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  apiVersion: SANITY_API_VERSION,
  token: requireEnv('SANITY_API_WRITE_TOKEN'),
  useCdn: false,
})

const GOOGLE_API_KEY = requireEnv('GOOGLE_API_KEY')

interface RestaurantRow {
  _id: string
  name: string
  lat: number
  lng: number
  address?: string
  priceRange?: { min?: number; max?: number; currency?: string }
}

async function fetchRestaurants(force: boolean): Promise<RestaurantRow[]> {
  // Skip drafts; in non-force mode also skip rows that already have a
  // priceRange object filled in.
  const filter = force
    ? `*[_type == "restaurant" && !(_id in path("drafts.**"))]`
    : `*[_type == "restaurant" && !(_id in path("drafts.**"))
        && !defined(priceRange.min)]`
  return sanity.fetch(
    `${filter}{ _id, name, lat, lng, address, priceRange } | order(name asc)`,
  )
}

interface PlacesPriceRange {
  startPrice?: { currencyCode?: string; units?: string }
  endPrice?:   { currencyCode?: string; units?: string }
}

async function fetchPlacesPriceRange(r: RestaurantRow): Promise<PlacesPriceRange | null> {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.priceRange',
    },
    body: JSON.stringify({
      textQuery: r.address ? `${r.name}, ${r.address}` : r.name,
      languageCode: 'de',
      locationBias: {
        circle: { center: { latitude: r.lat, longitude: r.lng }, radius: 300 },
      },
    }),
  })
  if (!res.ok) {
    console.warn(`      Places ${res.status}: ${await res.text()}`)
    return null
  }
  const data = (await res.json()) as { places?: Array<Record<string, unknown>> }
  const place = data.places?.[0]
  if (!place) return null
  return (place.priceRange as PlacesPriceRange | undefined) ?? null
}

function toMinMax(pr: PlacesPriceRange): { min: number; max: number; currency: string } | null {
  const minStr = pr.startPrice?.units
  const maxStr = pr.endPrice?.units
  const currency = pr.startPrice?.currencyCode ?? pr.endPrice?.currencyCode ?? 'EUR'
  if (!minStr && !maxStr) return null
  const min = minStr ? Number(minStr) : NaN
  const max = maxStr ? Number(maxStr) : NaN
  if (Number.isNaN(min) || Number.isNaN(max)) return null
  if (min <= 0 && max <= 0) return null
  return { min, max, currency }
}

async function main() {
  const opts = parseArgs()
  const all = await fetchRestaurants(opts.force)
  const todo = opts.limit !== null ? all.slice(0, opts.limit) : all

  console.log(`📋 ${todo.length} restaurant(s) to process${opts.dryRun ? ' [DRY RUN]' : ''}${opts.force ? ' [FORCE]' : ''}`)

  let written = 0
  let skipped = 0
  for (const r of todo) {
    const has = r.priceRange?.min != null && r.priceRange?.max != null
    const tag = has ? ' (replacing)' : ''
    process.stdout.write(`→ ${r.name}${tag} … `)
    try {
      const pr = await fetchPlacesPriceRange(r)
      if (!pr) {
        console.log('no Places match')
        skipped++
        continue
      }
      const range = toMinMax(pr)
      if (!range) {
        console.log('no price range data')
        skipped++
        continue
      }
      const display = `${range.min}–${range.max} ${range.currency === 'EUR' ? '€' : range.currency}`
      if (opts.dryRun) {
        console.log(`would write ${display}`)
      } else {
        await sanity.patch(r._id).set({ priceRange: range }).commit()
        console.log(`wrote ${display}`)
      }
      written++
    } catch (err) {
      console.log(`ERROR ${(err as Error).message}`)
      skipped++
    }
    // Light rate-limit — Places allows 600 QPM by default; 200 ms is safe.
    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`\n✅ ${written} written, ${skipped} skipped`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
