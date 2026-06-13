/**
 * Resolves a Google `googlePlaceId` for restaurants that lack one (mostly
 * chain branches added without a Places match). Without a placeId the gallery
 * backfill can't fetch photos, so these stay hero-only.
 *
 * Strategy: Places Text Search by name, biased to the restaurant's stored
 * coordinates, then accept the closest result ONLY when it is both near the
 * stored location and name-matches — so a chain's other branch can't win.
 *
 * Run from `nextjs/`:
 *   npx tsx scripts/resolve-place-ids.ts --dry-run     # show proposed matches, no writes
 *   npx tsx scripts/resolve-place-ids.ts --limit 5
 *   npx tsx scripts/resolve-place-ids.ts               # write confident matches
 *
 * Required env (nextjs/.env.local): SANITY_API_WRITE_TOKEN, GOOGLE_API_KEY
 */
import { config as loadEnv } from 'dotenv'
import { createClient } from '@sanity/client'

loadEnv({ path: '.env.local' })

if (!process.env.GOOGLE_API_KEY || !process.env.SANITY_API_WRITE_TOKEN) {
  console.error('Missing GOOGLE_API_KEY / SANITY_API_WRITE_TOKEN in .env.local')
  process.exit(1)
}
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY

const sanity = createClient({
  projectId: 'ehwjnjr2',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
})

// Confident only when the matched place is within this many metres of the
// stored coords AND the names align. 300m tolerates imprecise stored pins
// while still keeping chain branches (which resolve at ~0m) from cross-
// matching; anything further with an exact name is surfaced for manual review
// (its map pin is likely wrong, which is a separate data issue).
const MAX_DISTANCE_M = 300

interface Target {
  _id: string
  name: string
  slug: string
  lat: number
  lng: number
  address?: string
}

interface PlaceResult {
  id: string
  displayName?: { text?: string }
  location?: { latitude: number; longitude: number }
  formattedAddress?: string
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/** Names align if one normalised name contains the other (Places often adds a
 *  district/branch suffix, e.g. "Bonanza Coffee Roasters" vs "Bonanza Coffee"). */
function namesAlign(a: string, b: string): boolean {
  const na = norm(a)
  const nb = norm(b)
  if (!na || !nb) return false
  return na.includes(nb) || nb.includes(na)
}

async function searchPlaces(name: string, lat: number, lng: number): Promise<PlaceResult[]> {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.location,places.formattedAddress',
    },
    body: JSON.stringify({
      textQuery: name,
      languageCode: 'de',
      locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius: 300 } },
    }),
  })
  if (!res.ok) {
    console.warn(`  search ${res.status} — skipping`)
    return []
  }
  const j = (await res.json()) as { places?: PlaceResult[] }
  return j.places ?? []
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const limitArg = args.indexOf('--limit')
  const limit = limitArg >= 0 ? Number(args[limitArg + 1]) : Infinity
  if (limitArg >= 0 && (Number.isNaN(limit) || limit < 1)) {
    console.error('--limit requires a positive integer, e.g. --limit 5')
    process.exit(1)
  }

  const targets = await sanity.fetch<Target[]>(
    `*[_type == "restaurant" && !(_id in path("drafts.**")) && !defined(googlePlaceId)
       && defined(lat) && defined(lng)]
       | order(name asc) { _id, name, "slug": slug.current, lat, lng, address }`,
  )
  console.log(`${targets.length} restaurants without googlePlaceId${dryRun ? ' (dry-run)' : ''}\n`)

  let attempted = 0
  let resolved = 0
  const unresolved: string[] = []
  for (const t of targets) {
    if (attempted >= limit) break
    attempted++
    try {
      const places = await searchPlaces(t.name, t.lat, t.lng)
      // Rank by distance to the stored coords; require a name alignment too.
      const ranked = places
        .filter((p) => p.location && p.id)
        .map((p) => ({
          p,
          dist: haversine(t.lat, t.lng, p.location!.latitude, p.location!.longitude),
          aligns: namesAlign(t.name, p.displayName?.text ?? ''),
        }))
        .sort((a, b) => a.dist - b.dist)
      const best = ranked.find((r) => r.aligns) ?? ranked[0]
      const confident = !!best && best.aligns && best.dist <= MAX_DISTANCE_M

      const matchedName = best?.p.displayName?.text ?? '—'
      const distStr = best ? `${Math.round(best.dist)}m` : 'n/a'
      const flag = confident ? '✓' : '✗'
      console.log(`${flag} ${t.name}  →  ${matchedName}  (${distStr}${best && !best.aligns ? ', name≠' : ''})`)

      if (!confident) {
        unresolved.push(t.slug)
        continue
      }
      if (!dryRun) {
        const patch: Record<string, unknown> = { googlePlaceId: best!.p.id }
        if (!t.address && best!.p.formattedAddress) patch.address = best!.p.formattedAddress
        await sanity.patch(t._id).set(patch).commit()
        resolved++
        await sleep(300)
      } else {
        resolved++
      }
    } catch (err) {
      console.error(`  ✗ ${t.name} (${t._id}):`, err instanceof Error ? err.message : err)
      unresolved.push(t.slug)
    }
  }

  console.log(
    `\nDone: ${attempted} checked, ${resolved} ${dryRun ? 'would be resolved' : 'resolved'}, ${unresolved.length} need manual review.`,
  )
  if (unresolved.length) console.log('Manual:', unresolved.join(', '))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
