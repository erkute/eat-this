/**
 * Creates a *draft* restaurant document in Sanity from a Google Maps URL.
 * Resolves short links, extracts name + coordinates, queries Google Places
 * for the full record, maps the response onto our Sanity schema, then writes
 * a draft. The user opens the draft in Studio to fill the editorial bits
 * (description, tip, photo, bezirkRef) and publishes from there.
 *
 * Run from `nextjs/`:
 *   npx tsx scripts/import-from-url.ts <google-maps-url>
 *   npx tsx scripts/import-from-url.ts <google-maps-url> --dry-run
 *
 * Required env (in nextjs/.env.local):
 *   SANITY_API_WRITE_TOKEN  (Editor role)
 *   GOOGLE_API_KEY          (Places API v1 enabled)
 */
import { config as loadEnv } from 'dotenv'
import { createClient } from '@sanity/client'
import { randomUUID } from 'node:crypto'

loadEnv({ path: '.env.local' })

const SANITY_PROJECT_ID = 'ehwjnjr2'
const SANITY_DATASET = 'production'
const SANITY_API_VERSION = '2024-01-01'

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
const SANITY_TOKEN = process.env.SANITY_API_WRITE_TOKEN

if (!GOOGLE_API_KEY) throw new Error('GOOGLE_API_KEY missing in .env.local')
if (!SANITY_TOKEN) throw new Error('SANITY_API_WRITE_TOKEN missing in .env.local')

const sanity = createClient({
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  apiVersion: SANITY_API_VERSION,
  token: SANITY_TOKEN,
  useCdn: false,
})

// ----- URL resolution + parsing ---------------------------------------------

/** Follows redirects so maps.app.goo.gl/X → canonical /maps/place/... URL. */
async function resolveUrl(input: string): Promise<string> {
  const res = await fetch(input, { redirect: 'follow' })
  return res.url
}

interface ParsedUrl {
  name: string
  lat: number
  lng: number
}

function parseMapsUrl(url: string): ParsedUrl | null {
  const placeMatch = url.match(/\/place\/([^/?]+)/)
  if (!placeMatch) return null
  // Prefer the place coords embedded in `data=...!3d{lat}!4d{lng}` — these
  // pin the actual restaurant. Fall back to the `@lat,lng,zoom` map-view
  // center, which can be a country-level overview at low zooms (e.g. 7z).
  const placeCoords = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/)
  const viewCoords = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
  const coords = placeCoords ?? viewCoords
  if (!coords) return null
  return {
    name: decodeURIComponent(placeMatch[1].replace(/\+/g, ' ')),
    lat: parseFloat(coords[1]),
    lng: parseFloat(coords[2]),
  }
}

// ----- Slug — mirrors studio/schemaTypes/restaurant.js ----------------------

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/['’]/g, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ----- Places API ----------------------------------------------------------

const TYPE_MAP: Record<string, string> = {
  ramen_restaurant: 'Japanese / Ramen',
  japanese_restaurant: 'Japanese',
  sushi_restaurant: 'Japanese / Sushi',
  chinese_restaurant: 'Chinese',
  korean_restaurant: 'Korean',
  thai_restaurant: 'Thai',
  vietnamese_restaurant: 'Vietnamese',
  turkish_restaurant: 'Turkish',
  kebab_restaurant: 'Turkish / Kebab',
  italian_restaurant: 'Italian',
  pizza_restaurant: 'Italian / Pizza',
  french_restaurant: 'French',
  american_restaurant: 'American',
  hamburger_restaurant: 'Burgers',
  sandwich_shop: 'Sandwiches',
  mexican_restaurant: 'Mexican',
  greek_restaurant: 'Greek',
  indian_restaurant: 'Indian',
  middle_eastern_restaurant: 'Middle Eastern',
  lebanese_restaurant: 'Lebanese',
  mediterranean_restaurant: 'Mediterranean',
  spanish_restaurant: 'Spanish',
  austrian_restaurant: 'Austrian',
  german_restaurant: 'German',
  european_restaurant: 'European',
  fine_dining_restaurant: 'Fine Dining',
  seafood_restaurant: 'Seafood',
  steak_house: 'Steakhouse',
  vegetarian_restaurant: 'Vegetarian',
  vegan_restaurant: 'Vegan',
  cafe: 'Café',
  coffee_shop: 'Coffee',
  bakery: 'Bakery',
  ice_cream_shop: 'Ice Cream',
  dessert_shop: 'Desserts',
  dessert_restaurant: 'Desserts',
  wine_bar: 'Wine Bar',
  bar: 'Bar',
}

function pickCuisine(types: string[] = []): string | null {
  for (const t of types) if (TYPE_MAP[t]) return TYPE_MAP[t]
  return null
}

// Convert Places weekdayDescriptions (localized German) to Sanity daySlot[],
// grouping consecutive same-hours days into ranges. Same logic as
// scripts/enrich-new-restaurants.mjs.
const DAY_ORDER = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
const DAY_SHORT: Record<string, string> = {
  Montag: 'Mon', Dienstag: 'Tue', Mittwoch: 'Wed',
  Donnerstag: 'Thu', Freitag: 'Fri', Samstag: 'Sat', Sonntag: 'Sun',
}

interface DaySlot { _key: string; _type: 'daySlot'; days: string; hours: string }

function parseWeekdayDescriptions(descs: string[] = []): DaySlot[] {
  const parsed = descs.map(d => {
    const [day, ...rest] = d.split(':')
    const hours = rest.join(':').trim()
    const isClosed = /geschlossen|closed/i.test(hours)
    const clean = isClosed
      ? 'closed'
      : hours.replace(/ | /g, '').replace(/–/g, '-').replace(/Uhr/gi, '').trim()
    return { day: day.trim(), hours: clean }
  })
  const ordered = DAY_ORDER
    .map(d => parsed.find(p => p.day === d))
    .filter((p): p is { day: string; hours: string } => Boolean(p))
  const groups: { days: string[]; hours: string }[] = []
  for (const slot of ordered) {
    const last = groups[groups.length - 1]
    if (last && last.hours === slot.hours) last.days.push(slot.day)
    else groups.push({ days: [slot.day], hours: slot.hours })
  }
  return groups.map((g, i) => ({
    _key: `hours-${i}`,
    _type: 'daySlot' as const,
    days: g.days.length === 1
      ? DAY_SHORT[g.days[0]]
      : `${DAY_SHORT[g.days[0]]}-${DAY_SHORT[g.days[g.days.length - 1]]}`,
    hours: g.hours,
  }))
}

interface Place {
  id: string
  displayName?: { text: string }
  types?: string[]
  formattedAddress?: string
  websiteUri?: string
  internationalPhoneNumber?: string
  regularOpeningHours?: { weekdayDescriptions?: string[] }
  editorialSummary?: { text: string }
  priceRange?: {
    startPrice?: { units?: string; currencyCode?: string }
    endPrice?:   { units?: string; currencyCode?: string }
  }
  location?: { latitude: number; longitude: number }
  googleMapsUri?: string
}

async function searchPlace(parsed: ParsedUrl): Promise<Place | null> {
  const FIELDS = [
    'places.id',
    'places.displayName',
    'places.types',
    'places.formattedAddress',
    'places.websiteUri',
    'places.internationalPhoneNumber',
    'places.regularOpeningHours',
    'places.editorialSummary',
    'places.priceRange',
    'places.location',
    'places.googleMapsUri',
  ].join(',')
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY!,
      'X-Goog-FieldMask': FIELDS,
    },
    body: JSON.stringify({
      textQuery: parsed.name,
      languageCode: 'de',
      locationBias: {
        circle: { center: { latitude: parsed.lat, longitude: parsed.lng }, radius: 200 },
      },
    }),
  })
  if (!res.ok) throw new Error(`Places ${res.status}: ${await res.text()}`)
  const data = (await res.json()) as { places?: Place[] }
  return data.places?.[0] ?? null
}

// ----- Doc construction -----------------------------------------------------

function buildPriceRange(pr?: Place['priceRange']) {
  if (!pr?.startPrice?.units || !pr?.endPrice?.units) return null
  const min = Number(pr.startPrice.units)
  const max = Number(pr.endPrice.units)
  if (Number.isNaN(min) || Number.isNaN(max) || (min <= 0 && max <= 0)) return null
  return {
    min,
    max,
    currency: pr.startPrice.currencyCode ?? pr.endPrice.currencyCode ?? 'EUR',
  }
}

function buildDoc(parsed: ParsedUrl, place: Place, mapsUrl: string) {
  const name = place.displayName?.text ?? parsed.name
  const doc: { _id: string; _type: 'restaurant' } & Record<string, unknown> = {
    _id: `drafts.${randomUUID()}`,
    _type: 'restaurant',
    name,
    slug: { _type: 'slug', current: slugify(name) },
    isOpen: true,
    isClosed: false,
    lat: place.location?.latitude ?? parsed.lat,
    lng: place.location?.longitude ?? parsed.lng,
    mapsUrl: place.googleMapsUri ?? mapsUrl,
  }
  if (place.formattedAddress) doc.address = place.formattedAddress
  if (place.websiteUri) doc.website = place.websiteUri
  if (place.internationalPhoneNumber) doc.phone = place.internationalPhoneNumber

  const cuisine = pickCuisine(place.types)
  if (cuisine) doc.cuisineType = cuisine

  if (place.editorialSummary?.text) {
    doc.shortDescription = place.editorialSummary.text.slice(0, 160)
  }
  if (place.regularOpeningHours?.weekdayDescriptions?.length) {
    doc.openingHours = parseWeekdayDescriptions(place.regularOpeningHours.weekdayDescriptions)
  }
  const priceRange = buildPriceRange(place.priceRange)
  if (priceRange) doc.priceRange = priceRange

  return doc
}

// ----- Main ----------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const url = args.find(a => !a.startsWith('--'))
  if (!url) {
    console.error('Usage: npx tsx scripts/import-from-url.ts <google-maps-url> [--dry-run]')
    process.exit(1)
  }

  console.log(`→ Resolving: ${url}`)
  const canonical = await resolveUrl(url)
  if (canonical !== url) console.log(`  canonical: ${canonical}`)

  const parsed = parseMapsUrl(canonical)
  if (!parsed) {
    console.error('  could not extract name + coordinates from URL')
    console.error('  URL must contain /place/{name}/ and @lat,lng — try the desktop "Share → Copy link" form')
    process.exit(1)
  }
  console.log(`  parsed: name="${parsed.name}", lat=${parsed.lat}, lng=${parsed.lng}`)

  console.log(`→ Searching Places: "${parsed.name}" near (${parsed.lat}, ${parsed.lng})`)
  const place = await searchPlace(parsed)
  if (!place) {
    console.error('  no Places match — try a more specific URL or check the coordinates')
    process.exit(1)
  }
  console.log(`  matched: ${place.displayName?.text ?? '(no name)'} (id=${place.id})`)
  if (place.types?.length) console.log(`  types:   ${place.types.slice(0, 4).join(', ')}`)

  const matchedName = place.displayName?.text ?? parsed.name
  const existing = await sanity.fetch<{ _id: string; name: string }[]>(
    `*[_type=="restaurant" && name == $name && !(_id in path("drafts.**"))]{_id,name}`,
    { name: matchedName },
  )
  if (existing.length) {
    console.error(`\n✗ Duplicate: "${matchedName}" already exists as ${existing[0]._id}`)
    console.error('  Skipping — pass --force to override (not implemented yet; edit the existing doc).')
    process.exit(1)
  }

  const doc = buildDoc(parsed, place, canonical)
  console.log(`\n→ Draft preview:\n${JSON.stringify(doc, null, 2)}\n`)

  if (dryRun) {
    console.log('--dry-run: skipping Sanity write')
    return
  }

  const created = await sanity.create(doc)
  const publishedId = created._id.replace(/^drafts\./, '')
  console.log(`✓ Draft created: ${created._id}`)
  console.log(`  Open in Studio:`)
  console.log(`    https://eat-this-studio.sanity.studio/desk/restaurant;${publishedId}`)
  console.log(`  Next steps in the Studio: review address + cuisine, set bezirkRef,`)
  console.log(`  add description/tip/photo, then publish.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
