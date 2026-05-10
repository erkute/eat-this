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
  addressComponents?: { longText: string; shortText?: string; types: string[] }[]
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
  photos?: { name: string; widthPx?: number; heightPx?: number }[]
}

async function searchPlace(parsed: ParsedUrl): Promise<Place | null> {
  const FIELDS = [
    'places.id',
    'places.displayName',
    'places.types',
    'places.formattedAddress',
    'places.addressComponents',
    'places.websiteUri',
    'places.internationalPhoneNumber',
    'places.regularOpeningHours',
    'places.editorialSummary',
    'places.priceRange',
    'places.location',
    'places.googleMapsUri',
    'places.photos',
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

// ----- Address-component → Bezirk + Categories + Photo --------------------

/** Berlin postal-code → Ortsteil mapping for the 10 Sanity bezirke.
 *  Google's `sublocality_level_1` returns the admin Bezirk ("Bezirk Pankow"),
 *  not the Ortsteil ("Prenzlauer Berg"), so we resolve by PLZ instead. Any
 *  postal code not in this map → no Ortsteil match → bezirkRef stays empty
 *  and the user picks one in Studio. */
const PLZ_TO_ORTSTEIL: Record<string, string> = {
  // Mitte (Bezirk Mitte)
  '10115': 'Mitte', '10117': 'Mitte', '10119': 'Mitte', '10178': 'Mitte', '10179': 'Mitte',
  // Wedding (Bezirk Mitte)
  '13347': 'Wedding', '13349': 'Wedding', '13351': 'Wedding', '13353': 'Wedding',
  '13355': 'Wedding', '13357': 'Wedding', '13359': 'Wedding',
  // Prenzlauer Berg (Bezirk Pankow)
  '10405': 'Prenzlauer Berg', '10407': 'Prenzlauer Berg', '10409': 'Prenzlauer Berg',
  '10435': 'Prenzlauer Berg', '10437': 'Prenzlauer Berg', '10439': 'Prenzlauer Berg',
  // Friedrichshain (Bezirk Friedrichshain-Kreuzberg)
  '10243': 'Friedrichshain', '10245': 'Friedrichshain',
  '10247': 'Friedrichshain', '10249': 'Friedrichshain',
  // Kreuzberg (Bezirk Friedrichshain-Kreuzberg)
  '10961': 'Kreuzberg', '10963': 'Kreuzberg', '10965': 'Kreuzberg', '10967': 'Kreuzberg',
  '10969': 'Kreuzberg', '10997': 'Kreuzberg', '10999': 'Kreuzberg',
  // Charlottenburg (Bezirk Charlottenburg-Wilmersdorf)
  '10585': 'Charlottenburg', '10587': 'Charlottenburg', '10589': 'Charlottenburg',
  '10623': 'Charlottenburg', '10625': 'Charlottenburg', '10627': 'Charlottenburg',
  '10629': 'Charlottenburg', '10707': 'Charlottenburg', '10711': 'Charlottenburg',
  '10719': 'Charlottenburg',
  // Schöneberg (Bezirk Tempelhof-Schöneberg)
  '10777': 'Schöneberg', '10779': 'Schöneberg', '10781': 'Schöneberg', '10783': 'Schöneberg',
  '10785': 'Schöneberg', '10787': 'Schöneberg', '10789': 'Schöneberg',
  '10823': 'Schöneberg', '10825': 'Schöneberg', '10827': 'Schöneberg', '10829': 'Schöneberg',
  // Neukölln (Bezirk Neukölln)
  '12043': 'Neukölln', '12045': 'Neukölln', '12047': 'Neukölln', '12049': 'Neukölln',
  '12051': 'Neukölln', '12053': 'Neukölln', '12055': 'Neukölln', '12057': 'Neukölln',
  '12059': 'Neukölln',
  // Steglitz (Bezirk Steglitz-Zehlendorf)
  '12159': 'Steglitz', '12161': 'Steglitz', '12163': 'Steglitz',
  '12165': 'Steglitz', '12167': 'Steglitz', '12169': 'Steglitz',
  // Dahlem (Bezirk Steglitz-Zehlendorf)
  '14195': 'Dahlem',
}

/** Resolves the Ortsteil for a Berlin address by postal code. */
function findOrtsteil(components: Place['addressComponents'] = []): string | null {
  const plz = components.find(c => c.types.includes('postal_code'))?.longText
  return plz ? (PLZ_TO_ORTSTEIL[plz] ?? null) : null
}

/** Looks up an existing bezirk doc by exact name; returns its _id or null. */
async function findBezirkRef(name: string): Promise<string | null> {
  const doc = await sanity.fetch<{ _id: string } | null>(
    `*[_type=="bezirk" && name == $name][0]{_id}`,
    { name },
  )
  return doc?._id ?? null
}

/** Heuristic: Places types → restaurant categories from the Sanity list. */
function inferCategories(types: string[] = []): string[] {
  const out = new Set<string>()
  for (const t of types) {
    if (/^pizza_/.test(t)) { out.add('Dinner'); out.add('Pizza') }
    else if (t === 'cafe' || t === 'coffee_shop') { out.add('Breakfast'); out.add('Coffee') }
    else if (t === 'bakery') { out.add('Breakfast'); out.add('Sweets') }
    else if (t === 'ice_cream_shop' || t === 'dessert_shop' || t === 'dessert_restaurant') { out.add('Sweets') }
    else if (t === 'bar' || t === 'wine_bar') { out.add('Dinner') }
    else if (/_restaurant$/.test(t)) { out.add('Lunch'); out.add('Dinner') }
  }
  return [...out]
}

interface PhotoAsset { _id: string }

/** Downloads the first Places photo (≤1600px wide) and uploads it to Sanity
 *  as an image asset; returns the asset doc. Skips silently on any failure
 *  so a single bad photo doesn't kill the whole import. */
async function importPhoto(place: Place, restaurantSlug: string): Promise<PhotoAsset | null> {
  const photo = place.photos?.[0]
  if (!photo?.name) return null
  try {
    const url = `https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=1600&key=${GOOGLE_API_KEY}`
    const res = await fetch(url, { redirect: 'follow' })
    if (!res.ok) {
      console.warn(`  photo fetch ${res.status} — skipping image`)
      return null
    }
    const buffer = Buffer.from(await res.arrayBuffer())
    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    const ext = contentType.includes('png') ? 'png' : 'jpg'
    const asset = await sanity.assets.upload('image', buffer, {
      filename: `${restaurantSlug}.${ext}`,
      contentType,
    })
    return { _id: asset._id }
  } catch (err) {
    console.warn(`  photo upload failed: ${(err as Error).message} — skipping image`)
    return null
  }
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

interface BuildContext {
  bezirkRefId: string | null
  ortsteil: string | null
  photoAsset: PhotoAsset | null
}

function buildDoc(parsed: ParsedUrl, place: Place, mapsUrl: string, ctx: BuildContext) {
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
    const summary = place.editorialSummary.text
    doc.shortDescription = summary.slice(0, 160)
    // The longer description field caps at 300 — only set when the summary
    // adds something beyond the 160-char short version.
    if (summary.length > 160) doc.description = summary.slice(0, 300)
  }
  if (place.regularOpeningHours?.weekdayDescriptions?.length) {
    doc.openingHours = parseWeekdayDescriptions(place.regularOpeningHours.weekdayDescriptions)
  }
  const priceRange = buildPriceRange(place.priceRange)
  if (priceRange) doc.priceRange = priceRange

  if (ctx.ortsteil) doc.district = ctx.ortsteil
  if (ctx.bezirkRefId) {
    doc.bezirkRef = { _type: 'reference', _ref: ctx.bezirkRefId }
  }
  const categories = inferCategories(place.types)
  if (categories.length) doc.categories = categories

  if (ctx.photoAsset) {
    doc.image = {
      _type: 'image',
      asset: { _type: 'reference', _ref: ctx.photoAsset._id },
    }
  }

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
    console.error('  Skipping — edit the existing doc in Studio if you want to update it.')
    process.exit(1)
  }

  // Bezirk match (sublocality_level_1 → existing bezirk doc by name).
  const ortsteil = findOrtsteil(place.addressComponents)
  const bezirkRefId = ortsteil ? await findBezirkRef(ortsteil) : null
  if (ortsteil) {
    console.log(`  ortsteil: ${ortsteil}${bezirkRefId ? ` → ref ${bezirkRefId}` : ' (no bezirk doc)'}`)
  }

  // Photo: download first Places photo, upload to Sanity assets. Skip on
  // --dry-run so we don't pollute assets while iterating.
  const restaurantSlug = slugify(matchedName)
  const photoAsset = dryRun ? null : await importPhoto(place, restaurantSlug)
  if (photoAsset) console.log(`  photo:    uploaded ${photoAsset._id}`)
  else if (place.photos?.length) console.log(`  photo:    ${dryRun ? 'skipped (--dry-run)' : 'failed'}`)
  else console.log(`  photo:    none on Places`)

  const doc = buildDoc(parsed, place, canonical, { bezirkRefId, ortsteil, photoAsset })
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
