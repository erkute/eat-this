/**
 * Generates DE descriptions for restaurants and bezirke that lack them.
 * Uses Sanity-stored facts + Google Places (place details + reviews) +
 * Claude Sonnet 4.6 with brand-voice prompt. Writes drafts only — editorial
 * publishes manually.
 *
 * Run from `nextjs/`:
 *   npx tsx scripts/generate-de-descriptions.ts --type all --limit 3 --dry-run
 *   npx tsx scripts/generate-de-descriptions.ts --type restaurant
 *   npx tsx scripts/generate-de-descriptions.ts --type bezirk
 *
 * Required env (in nextjs/.env.local):
 *   ANTHROPIC_API_KEY
 *   SANITY_API_WRITE_TOKEN  (Editor role)
 *   GOOGLE_API_KEY          (Places API v1 enabled)
 */
import { config as loadEnv } from 'dotenv'
import { createClient } from '@sanity/client'
import Anthropic from '@anthropic-ai/sdk'

loadEnv({ path: '.env.local' })

const SANITY_PROJECT_ID = 'ehwjnjr2'
const SANITY_DATASET = 'production'
const SANITY_API_VERSION = '2024-01-01'
const TRANSLATION_MODEL = 'claude-sonnet-4-6'

type DocType = 'restaurant' | 'bezirk'

interface CliOptions {
  type: DocType | 'all'
  limit: number | null
  dryRun: boolean
  includeShortDesc: boolean
  includeTip: boolean
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  const opts: CliOptions = {
    type: 'all',
    limit: null,
    dryRun: false,
    includeShortDesc: true,
    includeTip: true,
  }
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--dry-run') opts.dryRun = true
    else if (arg === '--no-shortdesc') opts.includeShortDesc = false
    else if (arg === '--no-tip') opts.includeTip = false
    else if (arg === '--limit') opts.limit = parseInt(args[++i] ?? '', 10)
    else if (arg === '--type') {
      const v = args[++i]
      if (v !== 'restaurant' && v !== 'bezirk' && v !== 'all') {
        throw new Error(`--type must be restaurant|bezirk|all, got "${v}"`)
      }
      opts.type = v
    } else {
      throw new Error(`Unknown arg: ${arg}`)
    }
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

const anthropic = new Anthropic({ apiKey: requireEnv('ANTHROPIC_API_KEY') })
const GOOGLE_API_KEY = requireEnv('GOOGLE_API_KEY')

interface RestaurantSource {
  _id: string
  name: string
  description?: string
  shortDescription?: string
  tip?: string
  cuisineType?: string
  district?: string
  address?: string
  categories?: string[]
  price?: string
  lat: number
  lng: number
  website?: string
}

interface BezirkSource {
  _id: string
  name: string
  description?: string
}

// Project all fields with {...} wildcard. The script needs the full doc to clone
// into a draft via createIfNotExists; projecting only the prompt-input fields
// produced incomplete drafts (missing image, slug, openingHours, etc.). Repaired
// after the fact via repair-draft-fields.ts.
//
// Filter is idempotent on BOTH published and draft state: a restaurant qualifies
// only if neither the published doc NOR its draft already has a description.
// Without the draft check, re-runs would re-translate every restaurant whose
// description lives only in the draft (because publish hasn't happened yet).
async function fetchRestaurants(): Promise<RestaurantSource[]> {
  return sanity.fetch(
    `*[_type == "restaurant" && !(_id in path("drafts.**"))
        && !defined(description)
        && !defined(*[_id == "drafts." + ^._id][0].description)]{...} | order(name asc)`,
  )
}

async function fetchBezirke(): Promise<BezirkSource[]> {
  return sanity.fetch(
    `*[_type == "bezirk" && !(_id in path("drafts.**"))
        && !defined(description)
        && !defined(*[_id == "drafts." + ^._id][0].description)]{...} | order(name asc)`,
  )
}

interface PlaceContext {
  formattedAddress?: string
  websiteUri?: string
  rating?: number
  userRatingCount?: number
  priceLevel?: string
  editorialSummary?: string
  types?: string[]
  reviews?: Array<{ rating?: number; text?: string; lang?: string }>
}

async function fetchPlaceContext(r: RestaurantSource): Promise<PlaceContext | null> {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      'X-Goog-FieldMask': [
        'places.id',
        'places.displayName',
        'places.types',
        'places.formattedAddress',
        'places.websiteUri',
        'places.editorialSummary',
        'places.rating',
        'places.userRatingCount',
        'places.priceLevel',
        'places.reviews',
      ].join(','),
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
  if (!place) return null

  type ReviewBlock = { rating?: number; text?: { text?: string; languageCode?: string } }
  const reviews = ((place.reviews as ReviewBlock[]) ?? []).slice(0, 5).map(rev => ({
    rating: rev.rating,
    text: rev.text?.text,
    lang: rev.text?.languageCode,
  }))

  return {
    formattedAddress: place.formattedAddress as string | undefined,
    websiteUri: place.websiteUri as string | undefined,
    rating: place.rating as number | undefined,
    userRatingCount: place.userRatingCount as number | undefined,
    priceLevel: place.priceLevel as string | undefined,
    editorialSummary: (place.editorialSummary as { text?: string } | undefined)?.text,
    types: place.types as string[] | undefined,
    reviews,
  }
}

const RESTAURANT_PROMPT = `Du schreibst Restaurant-Beschreibungen auf Deutsch für "Eat This Berlin", einen kuratierten Berliner Food-Guide.

Brand-Voice: direkt, meinungsstark, konkret. Vermeide Werbe-Phrasen ("entdecke", "must-try", "hidden gem", "ein wahrer Geheimtipp"), Superlative ohne Substanz, Pressetext-Ton. Schreib wie jemand der die Stadt kennt und einer Freundin etwas empfiehlt.

Du bekommst zwei Datenblöcke:
1. SANITY-FAKTEN: was wir intern über das Restaurant wissen (Name, Adresse, Bezirk, Preisklasse, Kategorien, Cuisine-Typ).
2. GOOGLE-PLACES-KONTEXT: editorialSummary, Rating, Review-Auszüge. **Verwende Reviews als Atmosphäre- und Spezialitäten-Hinweis, niemals als Direktzitat.** Konkrete Dishes, Atmosphäre, "wofür ist das Restaurant bekannt" — solche Hinweise destillieren.

REGELN:
- Nur Fakten verwenden die in den Quellen stehen. Keine Erfindungen. Wenn Reviews ein Dish nicht erwähnen, erwähne es nicht.
- Restaurantnamen, Dish-Namen, Bezirksnamen bleiben wie sie sind.
- Rating-Zahlen NICHT erwähnen (Google-Rating ändert sich, würde stale werden).

LÄNGEN-BUDGETS (harte Limits):
- description: 200-300 Zeichen, ein bis zwei Sätze. Konkret, das "warum geht man da hin".
- shortDescription: max 160 Zeichen, EIN Satz. SEO-Meta-Description-Stil. Komprimierte Essenz.
- tip: 1-2 kurze Sätze (max 200 Zeichen). Insider-Hinweis: was bestellt man, wann hingehen, was übersehen.

Falls für ein Feld nicht genug Substanz da ist (z.B. Reviews zu dünn für einen echten Tip), setze das Feld auf null. Lieber kein Tip als ein generischer.

Gib NUR ein JSON-Objekt zurück (kein Prosa, kein Markdown-Fence):
{
  "description": string,
  "shortDescription": string | null,
  "tip": string | null
}`

const BEZIRK_PROMPT = `Du schreibst Bezirks-Beschreibungen auf Deutsch für "Eat This Berlin", einen kuratierten Berliner Food-Guide.

Brand-Voice: direkt, konkret, food-fokussiert. Kein Tourismus-Sprech, kein "lebendige Kieze", kein "bunt und multikulturell". Beschreibe was den Bezirk *kulinarisch* charakterisiert: typische Esskulturen, Straßen-Achsen, Nachbarschaftsidentität.

Bezirksname bleibt unverändert (Eigenname).

LÄNGEN-BUDGET: 200-300 Zeichen, zwei bis drei Sätze.

Gib NUR ein JSON-Objekt zurück:
{
  "description": string
}`

interface RestaurantGen {
  description: string
  shortDescription: string | null
  tip: string | null
}

interface BezirkGen {
  description: string
}

function extractJsonText(content: Anthropic.ContentBlock[], docId: string): string {
  const textBlock = content.find(b => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error(`No text block in response for ${docId}`)
  }
  // Models sometimes wrap JSON in ```json ... ``` despite explicit instructions; strip defensively.
  return textBlock.text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()
}

async function generateRestaurant(r: RestaurantSource, places: PlaceContext | null): Promise<RestaurantGen> {
  const sanityFacts = {
    name: r.name,
    cuisineType: r.cuisineType ?? null,
    district: r.district ?? null,
    address: r.address ?? null,
    categories: r.categories ?? [],
    priceLevel: r.price ?? null,
    website: r.website ?? null,
    existingShortDescription: r.shortDescription ?? null,
    existingTip: r.tip ?? null,
  }
  const placesFacts = places
    ? {
        formattedAddress: places.formattedAddress ?? null,
        editorialSummary: places.editorialSummary ?? null,
        priceLevel: places.priceLevel ?? null,
        types: places.types ?? [],
        reviewSnippets: (places.reviews ?? [])
          .filter(rev => rev.text)
          .map(rev => ({ lang: rev.lang, text: rev.text?.slice(0, 600) })),
      }
    : { note: 'No Google Places match found — derive description only from Sanity facts.' }

  const userMsg = `SANITY-FAKTEN:\n${JSON.stringify(sanityFacts, null, 2)}\n\nGOOGLE-PLACES-KONTEXT:\n${JSON.stringify(placesFacts, null, 2)}`

  const callOnce = async (extraReminder = false) => {
    const content = extraReminder
      ? userMsg + '\n\nWICHTIG: Antworte AUSSCHLIESSLICH mit gültigem JSON in der oben definierten Form. Keine deutsche Prosa, keine Erklärungen, keine Markdown-Codeblöcke. Wenn Source-Daten dünn sind, schreibe trotzdem JSON — mit description nur aus Sanity-Fakten und tip/shortDescription auf null falls keine Substanz da ist.'
      : userMsg
    const msg = await anthropic.messages.create({
      model: TRANSLATION_MODEL,
      max_tokens: 1024,
      system: RESTAURANT_PROMPT,
      messages: [{ role: 'user', content }],
    })
    return JSON.parse(extractJsonText(msg.content, r._id)) as RestaurantGen
  }

  let parsed: RestaurantGen
  try {
    parsed = await callOnce(false)
  } catch (firstErr) {
    if (firstErr instanceof SyntaxError) {
      // Model returned prose instead of JSON (typically when Places data is thin).
      // Retry once with an explicit JSON-only reminder at the end of the user message.
      parsed = await callOnce(true)
    } else {
      throw firstErr
    }
  }

  if (!parsed.description || parsed.description.length > 320) {
    throw new Error(`description out of bounds (${parsed.description?.length ?? 0} chars) for ${r._id}`)
  }
  if (parsed.shortDescription && parsed.shortDescription.length > 170) {
    throw new Error(`shortDescription too long (${parsed.shortDescription.length}) for ${r._id}`)
  }
  if (parsed.tip && parsed.tip.length > 220) {
    throw new Error(`tip too long (${parsed.tip.length}) for ${r._id}`)
  }
  return parsed
}

async function generateBezirk(b: BezirkSource): Promise<BezirkGen> {
  const userMsg = `Bezirk: ${b.name}\n\nSchreib eine kulinarisch fokussierte Beschreibung dieses Berliner Bezirks für "Eat This Berlin" Lesende, 200-300 Zeichen.`
  const msg = await anthropic.messages.create({
    model: TRANSLATION_MODEL,
    max_tokens: 512,
    system: BEZIRK_PROMPT,
    messages: [{ role: 'user', content: userMsg }],
  })
  const parsed = JSON.parse(extractJsonText(msg.content, b._id)) as BezirkGen
  if (!parsed.description || parsed.description.length > 320) {
    throw new Error(`description out of bounds (${parsed.description?.length ?? 0}) for ${b._id}`)
  }
  return parsed
}

async function patchRestaurantDraft(
  r: RestaurantSource,
  g: RestaurantGen,
  opts: CliOptions,
): Promise<boolean> {
  const draftId = `drafts.${r._id}`
  const sets: Record<string, string> = { description: g.description }
  if (opts.includeShortDesc && g.shortDescription && !r.shortDescription) {
    sets.shortDescription = g.shortDescription
  }
  if (opts.includeTip && g.tip && !r.tip) {
    sets.tip = g.tip
  }
  if (Object.keys(sets).length === 0) return false

  await sanity.createIfNotExists({
    ...r,
    _id: draftId,
    _type: 'restaurant',
  } as { _id: string; _type: 'restaurant' } & Record<string, unknown>)
  await sanity.patch(draftId).set(sets).commit({ autoGenerateArrayKeys: true })
  return true
}

async function patchBezirkDraft(b: BezirkSource, g: BezirkGen): Promise<boolean> {
  const draftId = `drafts.${b._id}`
  await sanity.createIfNotExists({
    ...b,
    _id: draftId,
    _type: 'bezirk',
  } as { _id: string; _type: 'bezirk' } & Record<string, unknown>)
  await sanity.patch(draftId).set({ description: g.description }).commit()
  return true
}

async function main(): Promise<void> {
  const opts = parseArgs()
  console.log(`[generate-de] type=${opts.type} limit=${opts.limit ?? 'all'} dryRun=${opts.dryRun} shortDesc=${opts.includeShortDesc} tip=${opts.includeTip}`)

  if (opts.type === 'restaurant' || opts.type === 'all') {
    let docs = await fetchRestaurants()
    if (opts.limit !== null) docs = docs.slice(0, opts.limit)
    console.log(`[generate-de] restaurants needing description: ${docs.length}`)
    for (const r of docs) {
      try {
        const places = await fetchPlaceContext(r)
        const g = await generateRestaurant(r, places)
        console.log(`  ✓ ${r.name} (${r._id})${places ? '' : '  [no Places match]'}`)
        if (opts.dryRun) {
          console.log(JSON.stringify(g, null, 2))
        } else {
          const wrote = await patchRestaurantDraft(r, g, opts)
          console.log(wrote ? `    → patched draft drafts.${r._id}` : `    (skipped: nothing to set)`)
        }
        // Rate-limit gentle: 200ms between docs (~5 req/s, well under Places + Anthropic limits)
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (e) {
        console.error(`  ✗ ${r.name} (${r._id}):`, e instanceof Error ? e.message : e)
      }
    }
  }

  if (opts.type === 'bezirk' || opts.type === 'all') {
    let docs = await fetchBezirke()
    if (opts.limit !== null) docs = docs.slice(0, opts.limit)
    console.log(`[generate-de] bezirke needing description: ${docs.length}`)
    for (const b of docs) {
      try {
        const g = await generateBezirk(b)
        console.log(`  ✓ ${b.name} (${b._id})`)
        if (opts.dryRun) {
          console.log(JSON.stringify(g, null, 2))
        } else {
          const wrote = await patchBezirkDraft(b, g)
          console.log(wrote ? `    → patched draft drafts.${b._id}` : `    (skipped: nothing to set)`)
        }
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (e) {
        console.error(`  ✗ ${b.name} (${b._id}):`, e instanceof Error ? e.message : e)
      }
    }
  }
}

main().catch(err => {
  console.error('[generate-de] FATAL:', err)
  process.exit(1)
})
