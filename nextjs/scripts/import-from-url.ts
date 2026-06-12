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

// Read at module load but DON'T throw — Next.js evaluates this module at
// build time for page-data collection, where runtime-only secrets are not
// available. Validation happens inside runImport() / the CLI guard so the
// build succeeds with envs missing and the actual request fails clearly.
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY
const SANITY_TOKEN = process.env.SANITY_API_WRITE_TOKEN

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

/** Returns a slug guaranteed unique across all `restaurant` docs (drafts and
 *  published). Falls back to `<base>-<ortsteil>` then numeric `-2/-3/...`
 *  when the bare name collides — same brand at different addresses keeps a
 *  human-readable URL instead of going straight to a numeric suffix. */
async function uniqueSlug(base: string, ortsteil: string | null): Promise<string> {
  const exists = async (s: string) =>
    (await sanity.fetch<number>(
      `count(*[_type=="restaurant" && slug.current == $s])`,
      { s },
    )) > 0
  if (!(await exists(base))) return base
  if (ortsteil) {
    const withOrt = `${base}-${slugify(ortsteil)}`
    if (!(await exists(withOrt))) return withOrt
  }
  const ortPart = ortsteil ? `-${slugify(ortsteil)}` : ''
  for (let n = 2; n < 100; n++) {
    const candidate = `${base}${ortPart}-${n}`
    if (!(await exists(candidate))) return candidate
  }
  throw new ImportError(`Could not find unique slug for "${base}" after 100 attempts.`)
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
  priceLevel?: 'PRICE_LEVEL_FREE' | 'PRICE_LEVEL_INEXPENSIVE' | 'PRICE_LEVEL_MODERATE' | 'PRICE_LEVEL_EXPENSIVE' | 'PRICE_LEVEL_VERY_EXPENSIVE'
  priceRange?: {
    startPrice?: { units?: string; currencyCode?: string }
    endPrice?:   { units?: string; currencyCode?: string }
  }
  location?: { latitude: number; longitude: number }
  googleMapsUri?: string
  photos?: {
    name: string
    widthPx?: number
    heightPx?: number
    authorAttributions?: { displayName?: string; uri?: string; photoUri?: string }[]
  }[]
}

async function searchPlace(parsed: ParsedUrl): Promise<Place | null> {
  // IMPORTANT: do NOT request `places.reviews`. Google user reviews are
  // off-limits as a source for description / tip / shortDescription:
  // they're third-party voices and our brand promise is "personally
  // visited and curated" (see memory: feedback_curator_voice_no_third_party).
  // If you add a field below, keep `places.reviews` out.
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
    'places.priceLevel',
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
      // Hard-bound the search to a small box around the pin from the URL.
      // The URL's !3d!4d coords ARE the venue's location, so the real place
      // sits essentially at the pin. A soft `locationBias` lets an ambiguous
      // name outrank the venue with a famous namesake — e.g. textQuery "Bari"
      // returned the Italian *city*, not the Neukölln restaurant at the pin
      // (city ranks far above the venue, which then wasn't returned at all).
      // A hard `locationRestriction` rectangle excludes everything outside the
      // box, so only the venue at the pin can match. The ±0.02° box is ≈ ±2.2 km
      // N/S and ±1.4 km E/W at Berlin's latitude — tolerant of coordinate
      // jitter, far too tight to admit another locality.
      locationRestriction: {
        rectangle: {
          low: { latitude: parsed.lat - 0.02, longitude: parsed.lng - 0.02 },
          high: { latitude: parsed.lat + 0.02, longitude: parsed.lng + 0.02 },
        },
      },
    }),
  })
  if (!res.ok) throw new Error(`Places ${res.status}: ${await res.text()}`)
  const data = (await res.json()) as { places?: Place[] }
  return data.places?.[0] ?? null
}

// ----- Address-component → Bezirk + Categories + Photo --------------------

/** Berlin postal-code → Ortsteil mapping for the Sanity bezirk docs.
 *  Google's `sublocality_level_1` returns the admin Bezirk ("Bezirk Pankow"),
 *  not the Ortsteil ("Prenzlauer Berg"), so we resolve by PLZ instead. Any
 *  postal code not in this map → no Ortsteil match → bezirkRef stays empty
 *  and the user picks one in Studio. */
const PLZ_TO_ORTSTEIL: Record<string, string> = {
  // Mitte (Bezirk Mitte)
  '10115': 'Mitte', '10117': 'Mitte', '10119': 'Mitte', '10178': 'Mitte', '10179': 'Mitte',
  // Moabit (Bezirk Mitte)
  '10551': 'Moabit', '10553': 'Moabit', '10555': 'Moabit',
  '10557': 'Moabit', '10559': 'Moabit',
  // Wedding (Bezirk Mitte)
  '13347': 'Wedding', '13349': 'Wedding', '13351': 'Wedding', '13353': 'Wedding',
  '13355': 'Wedding', '13357': 'Wedding', '13359': 'Wedding',
  // Prenzlauer Berg (Bezirk Pankow)
  '10405': 'Prenzlauer Berg', '10407': 'Prenzlauer Berg', '10409': 'Prenzlauer Berg',
  '10435': 'Prenzlauer Berg', '10437': 'Prenzlauer Berg', '10439': 'Prenzlauer Berg',
  // Pankow (Bezirk Pankow)
  '13156': 'Pankow', '13158': 'Pankow', '13159': 'Pankow',
  '13187': 'Pankow', '13189': 'Pankow',
  // Weißensee (Bezirk Pankow)
  '13086': 'Weißensee', '13088': 'Weißensee', '13089': 'Weißensee',
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
  // Wilmersdorf (Bezirk Charlottenburg-Wilmersdorf) — added 2026-05-11
  '10713': 'Wilmersdorf', '10715': 'Wilmersdorf', '10717': 'Wilmersdorf',
  // Schöneberg (Bezirk Tempelhof-Schöneberg)
  '10777': 'Schöneberg', '10779': 'Schöneberg', '10781': 'Schöneberg', '10783': 'Schöneberg',
  '10785': 'Schöneberg', '10787': 'Schöneberg', '10789': 'Schöneberg',
  '10823': 'Schöneberg', '10825': 'Schöneberg', '10827': 'Schöneberg', '10829': 'Schöneberg',
  // Friedenau (Bezirk Tempelhof-Schöneberg)
  '12157': 'Friedenau',
  // Tempelhof (Bezirk Tempelhof-Schöneberg)
  '12099': 'Tempelhof', '12101': 'Tempelhof', '12103': 'Tempelhof',
  '12105': 'Tempelhof', '12107': 'Tempelhof', '12109': 'Tempelhof',
  '12277': 'Tempelhof', '12279': 'Tempelhof', '12305': 'Tempelhof', '12307': 'Tempelhof',
  // Neukölln (Bezirk Neukölln)
  '12043': 'Neukölln', '12045': 'Neukölln', '12047': 'Neukölln', '12049': 'Neukölln',
  '12051': 'Neukölln', '12053': 'Neukölln', '12055': 'Neukölln', '12057': 'Neukölln',
  '12059': 'Neukölln',
  // Steglitz (Bezirk Steglitz-Zehlendorf)
  '12159': 'Steglitz', '12161': 'Steglitz', '12163': 'Steglitz',
  '12165': 'Steglitz', '12167': 'Steglitz', '12169': 'Steglitz',
  // Dahlem (Bezirk Steglitz-Zehlendorf)
  '14195': 'Dahlem',
  // Treptow (Bezirk Treptow-Köpenick)
  '12435': 'Treptow', '12437': 'Treptow', '12439': 'Treptow',
  '12524': 'Treptow', '12526': 'Treptow', '12527': 'Treptow',
  // Köpenick (Bezirk Treptow-Köpenick)
  '12459': 'Köpenick', '12487': 'Köpenick', '12489': 'Köpenick',
  '12555': 'Köpenick', '12557': 'Köpenick', '12559': 'Köpenick',
  '12587': 'Köpenick', '12589': 'Köpenick',
  // Lichtenberg (Bezirk Lichtenberg)
  '10315': 'Lichtenberg', '10317': 'Lichtenberg', '10318': 'Lichtenberg', '10319': 'Lichtenberg',
  '10365': 'Lichtenberg', '10367': 'Lichtenberg', '10369': 'Lichtenberg',
  '13051': 'Lichtenberg', '13053': 'Lichtenberg', '13055': 'Lichtenberg',
  '13057': 'Lichtenberg', '13059': 'Lichtenberg',
}

/** Resolves the Ortsteil for a Berlin address by postal code. */
function findOrtsteil(components: Place['addressComponents'] = []): string | null {
  const plz = components.find(c => c.types?.includes('postal_code'))?.longText
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

/** Heuristic: Places types → category names matching the canonical EN
 *  identifier on the `category` documents. Returns names; the caller resolves
 *  them into reference objects via `lookupCategoryRefs`. */
function inferCategories(types: string[] = []): string[] {
  const out = new Set<string>()
  // Fine Dining wins outright — the category excludes Lunch + Dinner by
  // convention (see memory: project-fine-dining-recategorization).
  if (types.includes('fine_dining_restaurant')) {
    out.add('Fine Dining')
    return [...out]
  }
  for (const t of types) {
    if (/^pizza_/.test(t)) { out.add('Dinner'); out.add('Pizza') }
    else if (t === 'cafe' || t === 'coffee_shop') { out.add('Breakfast'); out.add('Coffee') }
    else if (t === 'bakery') { out.add('Breakfast'); out.add('Sweets') }
    else if (t === 'ice_cream_shop' || t === 'dessert_shop' || t === 'dessert_restaurant') { out.add('Sweets') }
    else if (t === 'bar' || t === 'wine_bar') { out.add('Dinner'); out.add('Drinks') }
    else if (/_restaurant$/.test(t)) { out.add('Lunch'); out.add('Dinner') }
  }
  return [...out]
}

/** Resolves category names to `{_type:'reference', _ref:<id>}` array items
 *  by looking up the matching `category` document. Match is case-insensitive
 *  and tolerant of post-migration DE name renames (e.g. "Coffee" still
 *  resolves after the doc's `name` becomes "Café") via `nameEn`. */
async function lookupCategoryRefs(
  names: string[],
): Promise<{ _key: string; _type: 'reference'; _ref: string }[]> {
  if (!names.length) return []
  const docs = await sanity.fetch<{ _id: string; name: string; nameEn: string | null }[]>(
    `*[_type == "category" && (name in $names || nameEn in $names)]{_id, name, nameEn}`,
    { names },
  )
  const refs: { _key: string; _type: 'reference'; _ref: string }[] = []
  for (const name of names) {
    const match = docs.find(d => d.name === name || d.nameEn === name)
    if (!match) {
      console.warn(`  ⚠ no category doc for "${name}" — dropping from import`)
      continue
    }
    if (refs.some(r => r._ref === match._id)) continue
    refs.push({
      _key: randomUUID().replace(/-/g, '').slice(0, 12),
      _type: 'reference',
      _ref: match._id,
    })
  }
  return refs
}

interface PhotoAsset {
  _id: string
  credit: string | null
  creditUrl: string | null
}

/** Downloads the first Places photo (≤1600px wide) and uploads it to Sanity
 *  as an image asset; also returns the photographer attribution from Places.
 *  Skips silently on any failure so a single bad photo doesn't kill the
 *  whole import. Google Places ToS require attribution — credit is captured
 *  here and applied as image.credit / image.creditUrl in buildDoc. */
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
    const author = photo.authorAttributions?.[0]
    const displayName = author?.displayName
    // Google returns a generic placeholder string when the photo has no real
    // author attribution. Catch it and fall back to a clean "Foto: Google Maps"
    // with the place's mapsUri as the credit URL — satisfies the Places ToS
    // attribution requirement without leaking the awkward placeholder text.
    const isPlaceholder = !displayName || /copyrighted by their owners/i.test(displayName)
    return {
      _id: asset._id,
      credit: isPlaceholder ? 'Foto: Google Maps' : `Foto: ${displayName}`,
      creditUrl: isPlaceholder ? (place.googleMapsUri ?? null) : (author?.uri ?? null),
    }
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
  categoryRefs: { _key: string; _type: 'reference'; _ref: string }[]
  slug: string
}

function buildDoc(parsed: ParsedUrl, place: Place, mapsUrl: string, ctx: BuildContext) {
  const name = place.displayName?.text ?? parsed.name
  const doc: { _id: string; _type: 'restaurant' } & Record<string, unknown> = {
    _id: `drafts.${randomUUID()}`,
    _type: 'restaurant',
    name,
    slug: { _type: 'slug', current: ctx.slug },
    isOpen: true,
    isClosed: false,
    lat: place.location?.latitude ?? parsed.lat,
    lng: place.location?.longitude ?? parsed.lng,
    mapsUrl: place.googleMapsUri ?? mapsUrl,
    googlePlaceId: place.id,
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
  if (ctx.categoryRefs.length) doc.categories = ctx.categoryRefs

  if (ctx.photoAsset) {
    const image: Record<string, unknown> = {
      _type: 'image',
      asset: { _type: 'reference', _ref: ctx.photoAsset._id },
    }
    if (ctx.photoAsset.credit) image.credit = ctx.photoAsset.credit
    if (ctx.photoAsset.creditUrl) image.creditUrl = ctx.photoAsset.creditUrl
    doc.image = image
  }

  return doc
}

// ----- Reusable runner ------------------------------------------------------

/** Throws when the URL can't be parsed, no Places match exists, or a published
 *  restaurant with the matched name is already in Sanity. */
export class ImportError extends Error {
  constructor(message: string, public hint?: string) {
    super(message)
    this.name = 'ImportError'
  }
}

export interface RunImportOptions {
  /** When false, skip downloading + uploading the Places photo. Default true. */
  uploadPhoto?: boolean
  /** When false, don't reject on a name collision. Default true. */
  duplicateCheck?: boolean
}

export interface RunImportResult {
  doc: { _id: string; _type: 'restaurant' } & Record<string, unknown>
  place: Place
  matchedName: string
  ortsteil: string | null
  bezirkRefId: string | null
  photoAsset: PhotoAsset | null
  canonicalUrl: string
  /** Category names inferred from Places types (EN identifiers like "Coffee",
   *  "Pizza"). Use these for LLM prompts; `doc.categories` carries the matching
   *  reference array for Sanity. */
  categoryNames: string[]
}

/** Resolves a Google Maps URL to a draft-ready restaurant doc shape. Used by
 *  the CLI entrypoints in this directory. The doc carries a generated
 *  `drafts.<uuid>` id which the basic importer passes to sanity.create. */
export async function runImport(url: string, opts: RunImportOptions = {}): Promise<RunImportResult> {
  const canonicalUrl = await resolveUrl(url)
  const parsed = parseMapsUrl(canonicalUrl)
  if (!parsed) {
    throw new ImportError(
      'Could not extract name + coordinates from this URL.',
      'URL must contain /place/{name}/ and @lat,lng — try the desktop "Share → Copy link" form.',
    )
  }
  return runImportFromParsed(parsed, canonicalUrl, opts)
}

/** Batch entry: skips URL-parsing when caller already has name + coords (e.g.
 *  cremeguides scrape produced `search/?api=1&query=lat,lng` URLs that don't
 *  parse via parseMapsUrl). Reuses the full doc-building pipeline. */
export async function runImportFromParsed(
  parsed: ParsedUrl,
  canonicalUrl: string,
  opts: RunImportOptions = {},
): Promise<RunImportResult> {
  if (!GOOGLE_API_KEY) throw new ImportError('GOOGLE_API_KEY is not set.')
  if (!SANITY_TOKEN) throw new ImportError('SANITY_API_WRITE_TOKEN is not set.')

  const uploadPhoto = opts.uploadPhoto !== false
  const duplicateCheck = opts.duplicateCheck !== false

  const place = await searchPlace(parsed)
  if (!place) {
    throw new ImportError(
      'No Places match for that URL.',
      'Try a more specific URL or check the coordinates.',
    )
  }

  const matchedName = place.displayName?.text ?? parsed.name

  // Dedupe on the canonical Google Place ID — different physical locations of
  // the same brand (e.g. "Five Elephant Kreuzberg" vs "Five Elephant Schwedter")
  // share a name but never a place_id. Includes drafts so re-running the same
  // URL twice while a draft is open doesn't create a second draft.
  if (duplicateCheck) {
    const existing = await sanity.fetch<{ _id: string; name: string }[]>(
      `*[_type=="restaurant" && googlePlaceId == $placeId]{_id,name}`,
      { placeId: place.id },
    )
    if (existing.length) {
      const isDraft = existing[0]._id.startsWith('drafts.')
      throw new ImportError(
        `"${existing[0].name}" already exists in Sanity with the same Google Place ID (${existing[0]._id}).`,
        isDraft
          ? 'A draft for this place is already open — finish it in Studio.'
          : 'Edit the existing document instead.',
      )
    }
  }

  const ortsteil = findOrtsteil(place.addressComponents)
  const bezirkRefId = ortsteil ? await findBezirkRef(ortsteil) : null

  const slug = await uniqueSlug(slugify(matchedName), ortsteil)
  const photoAsset = uploadPhoto ? await importPhoto(place, slug) : null

  const categoryNames = inferCategories(place.types)
  const categoryRefs = await lookupCategoryRefs(categoryNames)

  const doc = buildDoc(parsed, place, canonicalUrl, {
    bezirkRefId,
    ortsteil,
    photoAsset,
    categoryRefs,
    slug,
  })

  return {
    doc,
    place,
    matchedName,
    ortsteil,
    bezirkRefId,
    photoAsset,
    canonicalUrl,
    categoryNames,
  }
}

// ----- CLI Main ------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const url = args.find(a => !a.startsWith('--'))
  if (!url) {
    console.error('Usage: npx tsx scripts/import-from-url.ts <google-maps-url> [--dry-run]')
    process.exit(1)
  }

  console.log(`→ Resolving: ${url}`)
  let result: RunImportResult
  try {
    result = await runImport(url, { uploadPhoto: !dryRun })
  } catch (err) {
    if (err instanceof ImportError) {
      console.error(`✗ ${err.message}`)
      if (err.hint) console.error(`  ${err.hint}`)
      process.exit(1)
    }
    throw err
  }

  if (result.canonicalUrl !== url) console.log(`  canonical: ${result.canonicalUrl}`)
  console.log(`  matched: ${result.matchedName} (id=${result.place.id})`)
  if (result.place.types?.length) console.log(`  types:   ${result.place.types.slice(0, 4).join(', ')}`)
  if (result.ortsteil) {
    console.log(`  ortsteil: ${result.ortsteil}${result.bezirkRefId ? ` → ref ${result.bezirkRefId}` : ' (no bezirk doc)'}`)
  }
  if (result.photoAsset) console.log(`  photo:    uploaded ${result.photoAsset._id}`)
  else if (result.place.photos?.length) console.log(`  photo:    ${dryRun ? 'skipped (--dry-run)' : 'failed'}`)
  else console.log(`  photo:    none on Places`)

  console.log(`\n→ Draft preview:\n${JSON.stringify(result.doc, null, 2)}\n`)

  if (dryRun) {
    console.log('--dry-run: skipping Sanity write')
    return
  }

  const created = await sanity.create(result.doc)
  const publishedId = created._id.replace(/^drafts\./, '')
  console.log(`✓ Draft created: ${created._id}`)
  console.log(`  Open in Studio:`)
  console.log(`    https://eat-this.sanity.studio/structure/restaurant;${publishedId}`)
  console.log(`  Next steps in the Studio: review address + cuisine, set bezirkRef,`)
  console.log(`  add description/tip/photo, then publish.`)
}

// Only run main when invoked directly via tsx — skipped when this module is
// imported by the enriched local importer. Symlink-safe via
// realpath: on macOS /tmp resolves to /private/tmp so a naive URL/path
// comparison would mis-detect.
import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
function isCliEntry(): boolean {
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1] ?? '')
  } catch {
    return false
  }
}
if (isCliEntry()) {
  main().catch(err => {
    console.error(err)
    process.exit(1)
  })
}
