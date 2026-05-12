/**
 * Backfills `instagramHandle` on restaurant docs by mining the restaurant's
 * own website for instagram.com/<handle> links. Most restaurants link their
 * Instagram in the footer, so this catches a high % without needing a paid
 * social-data API.
 *
 * Source of the website URL, in priority order:
 *   1. Existing `website` field on the Sanity doc
 *   2. Google Places `websiteUri` (only if --use-places is passed AND the
 *      doc has lat/lng + name)
 *
 * Run from `nextjs/`:
 *   npx tsx scripts/backfill-instagram-handles.ts --dry-run --limit 5
 *   npx tsx scripts/backfill-instagram-handles.ts --use-places --dry-run
 *   npx tsx scripts/backfill-instagram-handles.ts --apply             # write
 *   npx tsx scripts/backfill-instagram-handles.ts --apply --force     # overwrite
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
  instagramHandle?: string
}

async function fetchRestaurants(force: boolean): Promise<RestaurantRow[]> {
  const filter = force
    ? `*[_type == "restaurant" && !(_id in path("drafts.**"))]`
    : `*[_type == "restaurant" && !(_id in path("drafts.**"))
        && !defined(instagramHandle)]`
  return sanity.fetch(
    `${filter}{ _id, name, lat, lng, website, instagramHandle } | order(name asc)`,
  )
}

// Look up the official website via Google Places when Sanity has none.
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

// Paths under instagram.com that aren't user handles. Anything matching one
// of these is rejected so we don't accidentally store /p/, /reel/, etc.
const NON_HANDLE_SEGMENTS = new Set([
  'explore', 'p', 'reel', 'reels', 'stories', 'tags', 'directory',
  'web', 'accounts', 'about', 'developer', 'help', 'press',
  'privacy', 'terms', 'tv', 'legal', 'safety',
])

// Third-party brand prefixes that creep in via embedded reservation widgets,
// footer "Built with X" links, delivery-aggregator embeds, etc. We reject
// any handle that *starts* with one of these — global platforms each have
// dozens of regional handles (woltdanmark, woltbulgaria, wolt.deutschland,
// wolt_de, …), and no real Berlin restaurant has a handle that starts with
// these brand names. False-reject risk is effectively zero in this domain.
const THIRD_PARTY_BRANDS = [
  // Reservation
  'opentable', 'quandoo', 'bookatable', 'thefork', 'resy', 'sevenrooms', 'tablein',
  // Delivery / aggregator
  'wolt', 'lieferando', 'justeat', 'doordash', 'ubereats', 'foodora', 'deliveroo', 'glovo', 'gorillas',
  // Site-builders / hosting
  'squarespace', 'wix', 'shopify', 'webflow', 'godaddy', 'wordpress', 'jimdo',
  // Review / discovery
  'tripadvisor', 'yelp', 'foursquare', 'googlemaps',
  // Booking / travel
  'expedia', 'airbnb', 'bookingcom',
]

// Short generic handles where a prefix match would over-reject (e.g. a real
// restaurant called "facebookbar" doesn't deserve to be killed by the
// "facebook" prefix). Only the exact handle is rejected.
const EXACT_REJECT = new Set(['instagram', 'meta', 'facebook', 'google', 'apple'])

function isThirdPartyHandle(lower: string): boolean {
  if (EXACT_REJECT.has(lower)) return true
  for (const brand of THIRD_PARTY_BRANDS) {
    if (lower.startsWith(brand)) return true
  }
  return false
}

function isPlausibleHandle(handle: string): boolean {
  if (handle.length < 2 || handle.length > 30) return false
  const lower = handle.toLowerCase()
  if (NON_HANDLE_SEGMENTS.has(lower)) return false
  if (isThirdPartyHandle(lower)) return false
  // Instagram handles: letters, digits, underscore, period.
  return /^[A-Za-z0-9_.]+$/.test(handle)
}

function extractHandles(html: string): string[] {
  // Match every instagram.com/<token> occurrence in href attributes and bare
  // URLs. Stops at /, ?, #, ", ', whitespace, or end of string.
  const re = /(?:https?:)?\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9_.]+)/gi
  const handles: string[] = []
  for (const m of html.matchAll(re)) {
    const h = m[1]
    if (isPlausibleHandle(h)) handles.push(h.toLowerCase())
  }
  return handles
}

// Pick the handle that appears most often. Ties → first occurrence wins, so
// the order extractHandles returns them is preserved when frequencies match.
function pickBestHandle(handles: string[]): string | null {
  if (handles.length === 0) return null
  const counts = new Map<string, number>()
  for (const h of handles) counts.set(h, (counts.get(h) ?? 0) + 1)
  let best = handles[0]
  let bestCount = counts.get(best)!
  for (const [h, c] of counts) {
    if (c > bestCount) {
      best = h
      bestCount = c
    }
  }
  return best
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    // Restaurant sites sometimes 403 generic agents — pretend to be a browser.
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

  let written = 0
  let skipped = 0
  let noWebsite = 0
  let noHandle = 0

  for (const r of todo) {
    const tag = r.instagramHandle ? ' (replacing)' : ''
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

    const handle = pickBestHandle(extractHandles(html))
    if (!handle) {
      console.log('no instagram link')
      noHandle++
      skipped++
      continue
    }

    if (opts.dryRun) {
      console.log(`would write @${handle}`)
    } else {
      try {
        await sanity.patch(r._id).set({ instagramHandle: handle }).commit()
        console.log(`wrote @${handle}`)
      } catch (err) {
        console.log(`ERROR ${(err as Error).message}`)
        skipped++
        continue
      }
    }
    written++

    // Be polite to restaurant servers. Same gap as backfill-phones.
    await new Promise(r => setTimeout(r, 200))
  }

  console.log(
    `\n✅ ${written} ${opts.dryRun ? 'matched' : 'written'}, ` +
    `${skipped} skipped (no-website: ${noWebsite}, no-handle: ${noHandle}, other: ${skipped - noWebsite - noHandle})`,
  )
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
