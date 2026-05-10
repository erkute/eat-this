/**
 * Re-derives `restaurant.categories` for every restaurant by querying Google
 * Places API v1 for the canonical `types[]` and mapping them onto our
 * 9 category slugs:
 *   breakfast, coffee, dinner, drinks, fast-food, fine-dining,
 *   lunch, pizza, sweets
 *
 * Run from `nextjs/`:
 *   npx tsx scripts/recategorize-from-places.ts --dry-run
 *   npx tsx scripts/recategorize-from-places.ts --limit 5 --dry-run
 *   npx tsx scripts/recategorize-from-places.ts                  # apply
 *   npx tsx scripts/recategorize-from-places.ts --keep-extra     # union with existing instead of replace
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

interface CliOptions {
  dryRun: boolean
  limit: number | null
  keepExtra: boolean
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  const opts: CliOptions = { dryRun: false, limit: null, keepExtra: false }
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--dry-run') opts.dryRun = true
    else if (arg === '--keep-extra') opts.keepExtra = true
    else if (arg === '--limit') opts.limit = parseInt(args[++i] ?? '', 10)
    else throw new Error(`Unknown arg: ${arg}`)
  }
  if (opts.limit !== null && (Number.isNaN(opts.limit) || opts.limit < 1)) {
    throw new Error('--limit must be a positive integer')
  }
  return opts
}

const sanityToken = process.env.SANITY_API_WRITE_TOKEN
const googleKey = process.env.GOOGLE_API_KEY
if (!sanityToken) { console.error('Missing SANITY_API_WRITE_TOKEN'); process.exit(1) }
if (!googleKey)   { console.error('Missing GOOGLE_API_KEY');         process.exit(1) }

const sanity = createClient({
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  apiVersion: SANITY_API_VERSION,
  token: sanityToken,
  useCdn: false,
})

// ──────────────────────────────────────────────────────────────────────────
// Manual per-doc overrides for cases where Places types lie or oversimplify.
// Keep this list short — extending it instead of fixing the heuristic just
// pushes the same maintenance burden into another file.
// ──────────────────────────────────────────────────────────────────────────

const DOC_OVERRIDES: Record<string, string[]> = {
  // Korean-owned ice-cream parlour; Places tags it as `korean_restaurant`
  // because of the owner's nationality.
  'restaurant-kur-me': ['sweets', 'coffee', 'breakfast'],
  // Aperitivo / sparkling-wine bar — Places mis-tags it as `ice_cream_shop`
  // (probably from an old menu listing). Editor confirmed: drinks-focused.
  'restaurant-spumante': ['drinks'],
  // Editor confirmed: no lunch, breakfast only on weekends.
  'restaurant-bar-basta': ['breakfast', 'dinner'],
}

// ──────────────────────────────────────────────────────────────────────────
// Categorization rules
// ──────────────────────────────────────────────────────────────────────────

type Primary =
  | 'fine-dining'
  | 'pizza'
  | 'fast-food'
  | 'sweets'
  | 'bakery'
  | 'cafe'
  | 'brunch'
  | 'bar'
  | 'restaurant'
  | 'unknown'

/** Strong name/cuisine signals that override misleading Places types.
 *  Google sometimes tags ice-cream or pastry shops as `korean_restaurant`
 *  (etc.) when the owner is Korean — names like "Tribeca Ice Cream" or
 *  "Eispatisserie Hokey Pokey" must beat that. */
function nameOverride(name: string, cuisine: string): Primary | null {
  // Sweets: ice-cream shops + dessert-only spots Google sometimes mistypes
  // as `korean_restaurant` based on the owner's nationality.
  if (
    /ice cream|gelato|eis(patisserie|diele|laden)?|patisserie|vanille|marille|donut/.test(name) ||
    /^ice cream/.test(cuisine)
  ) return 'sweets'
  if (/crêpes?|crepe(s)?|galette(s)?/.test(name) || /crêpes?|crepe(s)?|galette(s)?/.test(cuisine)) return 'sweets'
  if (/bäckerei|boulangerie/.test(name)) return 'bakery'
  if (/pizza/.test(name) || /^pizza/.test(cuisine)) return 'pizza'
  if (/burger|döner|kebab|smash|sandwich|bánh mì|banh mi/.test(name)) return 'fast-food'
  return null
}

/** Pick the dominant identity from Places `primaryType` first, then the
 *  ranked types list, with name/cuisine as a final fallback. */
function classifyPrimary(
  types: string[],
  primaryType: string | undefined,
  name: string,
  cuisine: string,
): Primary {
  const override = nameOverride(name, cuisine)
  if (override) return override

  const candidates = [primaryType, ...types].filter(Boolean) as string[]
  for (const t of candidates) {
    if (t === 'fine_dining_restaurant') return 'fine-dining'
    if (t === 'pizza_restaurant') return 'pizza'
    if (t === 'fast_food_restaurant' || t === 'hamburger_restaurant' || t === 'sandwich_shop') return 'fast-food'
    if (
      t === 'ice_cream_shop' ||
      t === 'dessert_shop' ||
      t === 'dessert_restaurant' ||
      t === 'donut_shop' ||
      t === 'chocolate_shop' ||
      t === 'candy_store' ||
      t === 'confectionery' ||
      t === 'cake_shop'
    ) return 'sweets'
    // Pastry shops sit between bakery and sweets — most also sell bread or
    // breakfast pastries, so treat them like bakeries (breakfast + sweets).
    if (t === 'bakery' || t === 'pastry_shop') return 'bakery'
    if (t === 'breakfast_restaurant' || t === 'brunch_restaurant') return 'brunch'
    if (t === 'cafe' || t === 'coffee_shop') return 'cafe'
    if (t === 'wine_bar' || t === 'cocktail_bar' || t === 'bar' || t === 'pub' || t === 'gastropub') return 'bar'
    if (/_restaurant$/.test(t) || t === 'restaurant' || t === 'bistro') return 'restaurant'
  }
  // Final fallback on cuisine-only signals (after exhausting Places types).
  if (cuisine === 'café' || cuisine === 'cafe' || /coffee/.test(cuisine)) return 'cafe'
  if (cuisine === 'bakery' || /bäckerei/.test(cuisine)) return 'bakery'
  if (/wine bar|natural wine|cocktail|naturwein/.test(cuisine)) return 'bar'
  return 'unknown'
}

function baseSet(p: Primary): string[] {
  switch (p) {
    case 'fine-dining': return ['fine-dining', 'dinner']
    case 'pizza':       return ['pizza', 'dinner']
    case 'fast-food':   return ['fast-food', 'lunch', 'dinner']
    case 'sweets':      return ['sweets']
    case 'bakery':      return ['breakfast', 'sweets']
    case 'cafe':        return ['coffee', 'breakfast']
    // Brunch-focused spots: morning + lunch is the actual use case; coffee on
    // top because most also pour decent espresso.
    case 'brunch':      return ['breakfast', 'lunch', 'coffee']
    case 'bar':         return ['drinks']
    case 'restaurant':  return ['lunch', 'dinner']
    case 'unknown':     return []
  }
}

/** Layered enrichments — only add signals that strongly co-occur with the
 *  primary identity. Avoids the soup-of-everything problem the first pass had
 *  (a place with both `restaurant` and `bakery` types getting all 9 cats). */
function enrich(
  base: string[],
  types: string[],
  primary: Primary,
  cuisine: string,
  name: string,
): string[] {
  const out = new Set(base)
  const has = (t: string) => types.includes(t)

  // A bistro/restaurant that *also* serves wine/cocktails → drinks too.
  if ((primary === 'restaurant' || primary === 'fine-dining') &&
      (has('bar') || has('wine_bar') || has('cocktail_bar') ||
       /wine bar|natural wine|cocktail|naturwein/.test(cuisine))) {
    out.add('drinks')
  }
  // A restaurant that's also explicitly tagged as pizza-serving → pizza too
  // (covers Italian places with a wood oven).
  if (primary === 'restaurant' && (has('pizza_restaurant') || /pizza/.test(cuisine))) {
    out.add('pizza')
  }
  // A restaurant tagged as breakfast/brunch focused → breakfast too.
  if (primary === 'restaurant' && (has('breakfast_restaurant') || has('brunch_restaurant'))) {
    out.add('breakfast')
  }
  // A café that also has brunch/breakfast restaurant tag → already covered by
  // the cafe base ('breakfast'). A café whose primary is cafe but explicitly
  // does dinners (rare): leave manual.

  // A bar that also serves a real menu (restaurant in types) → add lunch/dinner.
  if (primary === 'bar' && has('restaurant')) {
    out.add('dinner')
    if (has('lunch')) out.add('lunch') // unusual but explicit
  }

  // A bakery that doubles as a café (cafe in types) → also coffee.
  if (primary === 'bakery' && (has('cafe') || has('coffee_shop'))) {
    out.add('coffee')
  }
  // A pure sweets shop with cafe component → also coffee + breakfast.
  if (primary === 'sweets' && (has('cafe') || has('coffee_shop'))) {
    out.add('coffee')
    out.add('breakfast')
  }
  // A café with a strong pastry/cake offer (pastry_shop/cake_shop in types) →
  // also sweets.
  if (primary === 'cafe' && (has('pastry_shop') || has('cake_shop') || has('bakery'))) {
    out.add('sweets')
  }
  // A café that ALSO sells pizza in the evening (Common-style) — Places lists
  // pizza_delivery / meal_delivery alongside the cafe identity.
  if (primary === 'cafe' && (has('pizza_restaurant') || has('pizza_delivery') || /pizza/.test(name))) {
    out.add('pizza')
    out.add('dinner')
  }
  // A brunch spot that also does coffee well → already covered by brunch base.

  // Vietnamese/Asian sandwich-style spots: small Bánh Mì stalls often Places-tagged
  // as "vietnamese_restaurant" — the name override above already handles that
  // via classifyPrimary's fallback when primary becomes fast-food.

  return [...out]
}

function inferCategories(input: {
  types: string[]
  primaryType?: string
  cuisineType?: string | null
  name: string
}): string[] {
  const types = input.types ?? []
  const name = input.name.toLowerCase()
  const cuisine = (input.cuisineType ?? '').toLowerCase()
  const primary = classifyPrimary(types, input.primaryType, name, cuisine)
  return enrich(baseSet(primary), types, primary, cuisine, name)
}

// ──────────────────────────────────────────────────────────────────────────
// Sanity / Places I/O
// ──────────────────────────────────────────────────────────────────────────

interface RestaurantRow {
  _id: string
  name: string
  lat: number
  lng: number
  address?: string
  cuisineType?: string | null
  currentSlugs: string[]
}

interface PlaceLookup {
  types: string[]
  primaryType?: string
  matchedName?: string
}

async function fetchPlaceTypes(r: RestaurantRow): Promise<PlaceLookup | null> {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': googleKey!,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.types,places.primaryType',
    },
    body: JSON.stringify({
      textQuery: r.address ? `${r.name}, ${r.address}` : r.name,
      languageCode: 'en',
      locationBias: {
        circle: { center: { latitude: r.lat, longitude: r.lng }, radius: 200 },
      },
    }),
  })
  if (!res.ok) {
    console.warn(`     ⚠ Places ${res.status}: ${await res.text()}`)
    return null
  }
  const data = (await res.json()) as { places?: Array<{
    types?: string[]
    primaryType?: string
    displayName?: { text?: string }
  }> }
  const place = data.places?.[0]
  if (!place) return null
  return {
    types: place.types ?? [],
    primaryType: place.primaryType,
    matchedName: place.displayName?.text,
  }
}

interface CategoryDoc { _id: string; slug: string }

async function fetchCategoryRefMap(): Promise<Map<string, string>> {
  const docs = await sanity.fetch<CategoryDoc[]>(
    `*[_type=="category"]{_id, "slug": slug.current}`,
  )
  const m = new Map<string, string>()
  for (const d of docs) m.set(d.slug, d._id)
  return m
}

async function fetchRestaurants(): Promise<RestaurantRow[]> {
  const rows = await sanity.fetch<Array<Omit<RestaurantRow, 'currentSlugs'> & { currentSlugs: string[] | null }>>(
    `*[_type=="restaurant" && !(_id in path("drafts.**"))] | order(name asc) {
      _id,
      name,
      lat,
      lng,
      address,
      cuisineType,
      "currentSlugs": categories[defined(@->_id)]->slug.current
    }`,
  )
  return rows.map(r => ({ ...r, currentSlugs: r.currentSlugs ?? [] }))
}

function makeKey(): string {
  return randomUUID().replace(/-/g, '').slice(0, 12)
}

function setEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sa = new Set(a)
  for (const x of b) if (!sa.has(x)) return false
  return true
}

// ──────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs()
  console.log(`recategorize-from-places: dryRun=${opts.dryRun} limit=${opts.limit ?? '∞'} keepExtra=${opts.keepExtra}`)

  const [refMap, restaurants] = await Promise.all([
    fetchCategoryRefMap(),
    fetchRestaurants(),
  ])

  const targets = opts.limit !== null ? restaurants.slice(0, opts.limit) : restaurants
  console.log(`📋 ${targets.length} restaurant(s) to process\n`)

  let touched = 0
  let unchanged = 0
  let placesMisses = 0
  let unresolvedSlugs = 0

  for (const r of targets) {
    const override = DOC_OVERRIDES[r._id]
    let inferredSlugs: string[]
    let placesNote: string

    if (override) {
      inferredSlugs = override
      placesNote = 'manual override'
    } else {
      const lookup = await fetchPlaceTypes(r)
      if (!lookup) {
        placesMisses++
        console.log(`✗ ${r.name} — no Places match (current: ${r.currentSlugs.join(',') || '—'})`)
        await new Promise(res => setTimeout(res, 200))
        continue
      }
      inferredSlugs = inferCategories({
        types: lookup.types,
        primaryType: lookup.primaryType,
        cuisineType: r.cuisineType ?? null,
        name: r.name,
      })
      placesNote = `places: ${lookup.types.slice(0, 3).join(',')}${lookup.types.length > 3 ? ',…' : ''}`
    }

    const finalSlugs = opts.keepExtra
      ? [...new Set([...inferredSlugs, ...r.currentSlugs])]
      : inferredSlugs

    // Skip when the slug set already matches (avoids unnecessary patches).
    if (setEqual(finalSlugs, r.currentSlugs)) {
      unchanged++
      console.log(`= ${r.name} — ${finalSlugs.join(',') || '—'}  [${placesNote}]`)
      await new Promise(res => setTimeout(res, 200))
      continue
    }

    const refs: { _key: string; _type: 'reference'; _ref: string }[] = []
    const missing: string[] = []
    for (const slug of finalSlugs) {
      const id = refMap.get(slug)
      if (!id) { missing.push(slug); continue }
      refs.push({ _key: makeKey(), _type: 'reference', _ref: id })
    }
    if (missing.length) {
      unresolvedSlugs++
      console.warn(`⚠ ${r.name} — unresolved slug(s): ${missing.join(',')} — skipping`)
      await new Promise(res => setTimeout(res, 200))
      continue
    }

    const arrowFromTo = `${r.currentSlugs.join(',') || '—'} → ${finalSlugs.join(',')}`
    console.log(`→ ${r.name}: ${arrowFromTo}  [${placesNote}]`)

    if (!opts.dryRun) {
      await sanity.patch(r._id).set({ categories: refs }).commit()
    }
    touched++

    // Light rate-limit (Places allows 600 QPM by default).
    await new Promise(res => setTimeout(res, 200))
  }

  console.log(`\nDone.`)
  console.log(`  changed:        ${touched}`)
  console.log(`  unchanged:      ${unchanged}`)
  console.log(`  Places misses:  ${placesMisses}`)
  console.log(`  unresolved:     ${unresolvedSlugs}`)
}

main().catch(err => {
  console.error('Recategorize failed:', err)
  process.exit(1)
})
