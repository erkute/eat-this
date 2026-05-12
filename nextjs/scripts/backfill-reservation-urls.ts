/**
 * Backfills `reservationUrl` on restaurant docs by mining the restaurant's
 * own website for links to known reservation platforms (OpenTable, Resy,
 * Quandoo, TheFork, Bookatable, Resmio, SevenRooms). Same idea as the
 * Instagram backfill — most restaurants embed the "Reserve" button on their
 * homepage, which links straight to the booking page.
 *
 * Source of the website URL, in priority order:
 *   1. Existing `website` field on the Sanity doc
 *   2. Google Places `websiteUri` (only if --use-places is passed)
 *
 * Run from `nextjs/`:
 *   npx tsx scripts/backfill-reservation-urls.ts --dry-run --limit 10
 *   npx tsx scripts/backfill-reservation-urls.ts --use-places --dry-run
 *   npx tsx scripts/backfill-reservation-urls.ts --apply
 *   npx tsx scripts/backfill-reservation-urls.ts --apply --force
 *
 * Required env (in nextjs/.env.local):
 *   SANITY_API_WRITE_TOKEN  (Editor role)
 *   GOOGLE_API_KEY          (Places API v1; only needed for --use-places)
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
  apply: boolean
  force: boolean
  usePlaces: boolean
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  const opts: CliOptions = {
    limit: null,
    dryRun: false,
    apply: false,
    force: false,
    usePlaces: false,
  }
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--dry-run') opts.dryRun = true
    else if (arg === '--apply') opts.apply = true
    else if (arg === '--force') opts.force = true
    else if (arg === '--use-places') opts.usePlaces = true
    else if (arg === '--limit') opts.limit = parseInt(args[++i] ?? '', 10)
    else throw new Error(`Unknown arg: ${arg}`)
  }
  if (!opts.apply && !opts.dryRun) opts.dryRun = true
  if (opts.apply && opts.dryRun) {
    throw new Error('Pass either --apply or --dry-run, not both.')
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

interface RestaurantRow {
  _id: string
  name: string
  lat?: number
  lng?: number
  website?: string
  reservationUrl?: string
}

async function fetchRestaurants(force: boolean): Promise<RestaurantRow[]> {
  const filter = force
    ? `*[_type == "restaurant" && !(_id in path("drafts.**"))]`
    : `*[_type == "restaurant" && !(_id in path("drafts.**"))
        && !defined(reservationUrl)]`
  return sanity.fetch(
    `${filter}{ _id, name, lat, lng, website, reservationUrl } | order(name asc)`,
  )
}

async function fetchPlacesWebsite(r: RestaurantRow): Promise<string | null> {
  if (!r.lat || !r.lng) return null
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': requireEnv('GOOGLE_API_KEY'),
      'X-Goog-FieldMask': 'places.id,places.displayName,places.websiteUri',
    },
    body: JSON.stringify({
      textQuery: r.name,
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
  return (place?.websiteUri as string | undefined) ?? null
}

// Each entry: [platform-label, regex matching a deep-link URL]. Order is
// preference order — OpenTable/Resy are the most common in Berlin, so they
// rank first. The regex captures the full URL up to but not including a
// space, quote, or angle-bracket terminator.
//
// Crucially each pattern requires a *restaurant-specific* path prefix so we
// don't capture generic landing pages like "/private-dining" or "/help".
const PROVIDERS: Array<{ label: string; re: RegExp }> = [
  // OpenTable booking forms: /r/<slug>, /restref/..., /booking/..., /restaurant/...
  { label: 'OpenTable', re: /https?:\/\/(?:www\.)?opentable\.(?:de|com|co\.uk)\/(?:r|restref|booking|restaurant)\/[^\s"'<>)]+/i },
  // Resy booking pages: /cities/<city>/<slug>
  { label: 'Resy', re: /https?:\/\/(?:www\.)?resy\.com\/cities\/[^\s"'<>)]+/i },
  // TheFork restaurant page
  { label: 'TheFork', re: /https?:\/\/(?:www\.)?thefork\.(?:de|com|fr|es|it)\/restaurant\/[^\s"'<>)]+/i },
  // Quandoo restaurant page (/place/<slug>)
  { label: 'Quandoo', re: /https?:\/\/(?:www\.)?quandoo\.(?:de|com|at)\/(?:place|restaurant|booking)\/[^\s"'<>)]+/i },
  // Bookatable restaurant page
  { label: 'Bookatable', re: /https?:\/\/(?:www\.)?bookatable\.com\/(?:book|restaurants?)\/[^\s"'<>)]+/i },
  // Resmio is mostly used by smaller spots; the booking embed always points
  // at <slug>.resmio.com or resmio.com/<slug>/booking — accept both.
  { label: 'Resmio', re: /https?:\/\/(?:[A-Za-z0-9-]+\.)?resmio\.(?:com|de)\/[^\s"'<>)]+/i },
  // SevenRooms hosted reservations
  { label: 'SevenRooms', re: /https?:\/\/(?:www\.)?sevenrooms\.com\/(?:reservations|landing|explore)\/[^\s"'<>)]+/i },
]

function findReservationUrl(html: string): { url: string; provider: string } | null {
  for (const { label, re } of PROVIDERS) {
    const m = html.match(re)
    if (m) {
      // Strip a trailing punctuation char that often comes from regex
      // terminators in HTML (e.g. "&quot;" trailing or a closing >).
      let url = m[0].replace(/[.,;:!?)]+$/, '')
      // Decode common HTML entities introduced by minifiers.
      url = url.replace(/&amp;/g, '&')
      return { url, provider: label }
    }
  }
  return null
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'de,en;q=0.8',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) return null
    const ct = res.headers.get('content-type') ?? ''
    if (!ct.includes('html') && !ct.includes('xml') && ct !== '') return null
    return await res.text()
  } catch {
    return null
  }
}

async function main() {
  const opts = parseArgs()
  const all = await fetchRestaurants(opts.force)
  const todo = opts.limit !== null ? all.slice(0, opts.limit) : all

  const mode = opts.dryRun ? '[DRY RUN]' : '[APPLY]'
  const flags = [opts.force && '[FORCE]', opts.usePlaces && '[+PLACES]'].filter(Boolean).join(' ')
  console.log(`📋 ${todo.length} restaurant(s) to process ${mode} ${flags}`)

  const providerCounts = new Map<string, number>()
  let written = 0
  let skipped = 0
  let noWebsite = 0
  let noBooking = 0

  for (const r of todo) {
    const tag = r.reservationUrl ? ' (replacing)' : ''
    process.stdout.write(`→ ${r.name}${tag} … `)

    let website = r.website ?? null
    if (!website && opts.usePlaces) {
      website = await fetchPlacesWebsite(r)
      if (website) process.stdout.write(`[via Places] `)
    }
    if (!website) {
      console.log('no website')
      noWebsite++
      skipped++
      continue
    }

    const html = await fetchHtml(website)
    if (!html) {
      console.log(`fetch failed (${website})`)
      skipped++
      continue
    }

    const found = findReservationUrl(html)
    if (!found) {
      console.log('no booking link')
      noBooking++
      skipped++
      continue
    }

    providerCounts.set(found.provider, (providerCounts.get(found.provider) ?? 0) + 1)

    if (opts.dryRun) {
      console.log(`would write [${found.provider}] ${found.url}`)
    } else {
      try {
        await sanity.patch(r._id).set({ reservationUrl: found.url }).commit()
        console.log(`wrote [${found.provider}] ${found.url}`)
      } catch (err) {
        console.log(`ERROR ${(err as Error).message}`)
        skipped++
        continue
      }
    }
    written++

    await new Promise(r => setTimeout(r, 200))
  }

  const breakdown = Array.from(providerCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([p, c]) => `${p}: ${c}`)
    .join(', ')

  console.log(
    `\n✅ ${written} ${opts.dryRun ? 'matched' : 'written'}` +
    (breakdown ? ` (${breakdown})` : '') +
    `, ${skipped} skipped (no-website: ${noWebsite}, no-booking: ${noBooking}, other: ${skipped - noWebsite - noBooking})`,
  )
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
