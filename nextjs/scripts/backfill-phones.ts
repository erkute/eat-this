/**
 * Backfills `phone` on restaurant documents from Google Places API v1.
 * Maps the Places `internationalPhoneNumber` (preferred) or
 * `nationalPhoneNumber` field into our Sanity `phone` string.
 *
 * Run from `nextjs/`:
 *   npx tsx scripts/backfill-phones.ts --dry-run --limit 5
 *   npx tsx scripts/backfill-phones.ts                    # all
 *   npx tsx scripts/backfill-phones.ts --force            # overwrite existing
 *
 * Required env (in nextjs/.env.local):
 *   SANITY_API_WRITE_TOKEN  (Editor role)
 *   GOOGLE_API_KEY          (Places API v1 enabled)
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
  phone?: string
}

async function fetchRestaurants(force: boolean): Promise<RestaurantRow[]> {
  const filter = force
    ? `*[_type == "restaurant" && !(_id in path("drafts.**"))]`
    : `*[_type == "restaurant" && !(_id in path("drafts.**"))
        && !defined(phone)]`
  return sanity.fetch(
    `${filter}{ _id, name, lat, lng, address, phone } | order(name asc)`,
  )
}

async function fetchPlacesPhone(r: RestaurantRow): Promise<string | null> {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.internationalPhoneNumber,places.nationalPhoneNumber',
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
  // Prefer the international form so the tel: link works from any country.
  const intl = place.internationalPhoneNumber as string | undefined
  const natl = place.nationalPhoneNumber as string | undefined
  return intl ?? natl ?? null
}

async function main() {
  const opts = parseArgs()
  const all = await fetchRestaurants(opts.force)
  const todo = opts.limit !== null ? all.slice(0, opts.limit) : all

  console.log(`📋 ${todo.length} restaurant(s) to process${opts.dryRun ? ' [DRY RUN]' : ''}${opts.force ? ' [FORCE]' : ''}`)

  let written = 0
  let skipped = 0
  for (const r of todo) {
    const tag = r.phone ? ' (replacing)' : ''
    process.stdout.write(`→ ${r.name}${tag} … `)
    try {
      const phone = await fetchPlacesPhone(r)
      if (!phone) {
        console.log('no phone')
        skipped++
        continue
      }
      if (opts.dryRun) {
        console.log(`would write ${phone}`)
      } else {
        await sanity.patch(r._id).set({ phone }).commit()
        console.log(`wrote ${phone}`)
      }
      written++
    } catch (err) {
      console.log(`ERROR ${(err as Error).message}`)
      skipped++
    }
    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`\n✅ ${written} written, ${skipped} skipped`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
