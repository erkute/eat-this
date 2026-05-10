/**
 * Backfills `googlePlaceId` on restaurant documents from Google Places API v1.
 * The Place ID is now the dedup key in `import-from-url.ts` — without this
 * backfill, name-based dedup falls away with no replacement and re-imports
 * of the same physical location would create silent duplicates.
 *
 * Run from `nextjs/`:
 *   npx tsx scripts/backfill-place-ids.ts --dry-run --limit 5
 *   npx tsx scripts/backfill-place-ids.ts                    # all
 *   npx tsx scripts/backfill-place-ids.ts --force            # overwrite existing
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

// Refuse to patch when the Places match drifts further than this from the
// stored coordinates. Guards against Places returning a same-name place at a
// completely different address (chain stores, common venue names).
const MAX_DRIFT_METERS = 150

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
  googlePlaceId?: string
}

async function fetchRestaurants(force: boolean): Promise<RestaurantRow[]> {
  const filter = force
    ? `*[_type == "restaurant" && !(_id in path("drafts.**"))]`
    : `*[_type == "restaurant" && !(_id in path("drafts.**"))
        && !defined(googlePlaceId)]`
  return sanity.fetch(
    `${filter}{ _id, name, lat, lng, address, googlePlaceId } | order(name asc)`,
  )
}

interface PlaceMatch {
  id: string
  lat: number
  lng: number
  displayName: string
}

async function searchPlace(r: RestaurantRow): Promise<PlaceMatch | null> {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.location',
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
  const data = (await res.json()) as {
    places?: Array<{
      id: string
      displayName?: { text: string }
      location?: { latitude: number; longitude: number }
    }>
  }
  const place = data.places?.[0]
  if (!place?.id || !place.location) return null
  return {
    id: place.id,
    lat: place.location.latitude,
    lng: place.location.longitude,
    displayName: place.displayName?.text ?? '(no name)',
  }
}

/** Haversine distance in meters between two lat/lng points. */
function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

async function main() {
  const opts = parseArgs()
  const all = await fetchRestaurants(opts.force)
  const todo = opts.limit !== null ? all.slice(0, opts.limit) : all

  console.log(`📋 ${todo.length} restaurant(s) to process${opts.dryRun ? ' [DRY RUN]' : ''}${opts.force ? ' [FORCE]' : ''}`)

  let written = 0
  let skipped = 0
  let drifted = 0
  for (const r of todo) {
    const tag = r.googlePlaceId ? ' (replacing)' : ''
    process.stdout.write(`→ ${r.name}${tag} … `)
    try {
      const match = await searchPlace(r)
      if (!match) {
        console.log('no match')
        skipped++
        continue
      }
      const drift = distanceMeters({ lat: r.lat, lng: r.lng }, { lat: match.lat, lng: match.lng })
      if (drift > MAX_DRIFT_METERS) {
        console.log(`SKIP — match "${match.displayName}" is ${Math.round(drift)}m away (>${MAX_DRIFT_METERS}m) — manual review needed`)
        drifted++
        continue
      }
      if (opts.dryRun) {
        console.log(`would write ${match.id} (${Math.round(drift)}m)`)
      } else {
        await sanity.patch(r._id).set({ googlePlaceId: match.id }).commit()
        console.log(`wrote ${match.id} (${Math.round(drift)}m)`)
      }
      written++
    } catch (err) {
      console.log(`ERROR ${(err as Error).message}`)
      skipped++
    }
    await new Promise(r => setTimeout(r, 200))
  }

  console.log(`\n✅ ${written} written, ${skipped} skipped, ${drifted} drifted (>${MAX_DRIFT_METERS}m, needs manual review)`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
