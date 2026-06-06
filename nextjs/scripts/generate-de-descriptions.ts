/**
 * Generates DE descriptions for restaurants and bezirke that lack them.
 * Uses Sanity-stored facts + Google Places (place details, NO user reviews) +
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
  draftsOnly: boolean
  force: boolean
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  const opts: CliOptions = {
    type: 'all',
    limit: null,
    dryRun: false,
    includeShortDesc: true,
    includeTip: true,
    draftsOnly: false,
    force: false,
  }
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--dry-run') opts.dryRun = true
    else if (arg === '--drafts-only') opts.draftsOnly = true
    else if (arg === '--force') opts.force = true
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

// Lazy env reads — Next.js loads this module at build time (page-data
// collection) and the runtime secrets are not available there. Throwing
// here would fail the deploy. Functions below validate when they actually
// need a value, so missing env at runtime still surfaces clearly.
const sanity = createClient({
  projectId: SANITY_PROJECT_ID,
  dataset: SANITY_DATASET,
  apiVersion: SANITY_API_VERSION,
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
})

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? '' })
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY ?? ''

export interface RestaurantSource {
  _id: string
  name: string
  description?: string
  shortDescription?: string
  tip?: string
  cuisineType?: string
  district?: string
  address?: string
  categories?: string[]
  priceRange?: { min?: number; max?: number; currency?: string }
  lat: number
  lng: number
  website?: string
}

/** Cheap derivation of a €/€€/€€€/€€€€ symbol from the Places price range,
 *  matching the buckets the prompts learned to read. Falls back to null when
 *  no min is present. */
function priceSymbolFromRange(pr?: { min?: number }): string | null {
  const min = pr?.min
  if (min == null || Number.isNaN(min)) return null
  if (min < 10) return '€'
  if (min < 25) return '€€'
  if (min < 50) return '€€€'
  return '€€€€'
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
async function fetchRestaurants(opts: { draftsOnly: boolean; force: boolean }): Promise<RestaurantSource[]> {
  const descClause = opts.force ? '' : ' && !defined(description)'
  if (opts.draftsOnly) {
    return sanity.fetch(
      `*[_type == "restaurant" && _id in path("drafts.**")${descClause}]{...} | order(name asc)`,
    )
  }
  // Non-drafts mode: in force-regen we want EVERY published restaurant; in
  // normal mode we still skip ones whose draft already has a description
  // (live-doc empty but draft staged).
  if (opts.force) {
    return sanity.fetch(
      `*[_type == "restaurant" && !(_id in path("drafts.**"))]{...} | order(name asc)`,
    )
  }
  return sanity.fetch(
    `*[_type == "restaurant" && !(_id in path("drafts.**"))
        && !defined(description)
        && !defined(*[_id == "drafts." + ^._id][0].description)]{...} | order(name asc)`,
  )
}

async function fetchBezirke(opts: { draftsOnly: boolean; force: boolean }): Promise<BezirkSource[]> {
  const descClause = opts.force ? '' : ' && !defined(description)'
  if (opts.draftsOnly) {
    return sanity.fetch(
      `*[_type == "bezirk" && _id in path("drafts.**")${descClause}]{...} | order(name asc)`,
    )
  }
  if (opts.force) {
    return sanity.fetch(
      `*[_type == "bezirk" && !(_id in path("drafts.**"))]{...} | order(name asc)`,
    )
  }
  return sanity.fetch(
    `*[_type == "bezirk" && !(_id in path("drafts.**"))
        && !defined(description)
        && !defined(*[_id == "drafts." + ^._id][0].description)]{...} | order(name asc)`,
  )
}

export interface PlaceContext {
  formattedAddress?: string
  websiteUri?: string
  rating?: number
  userRatingCount?: number
  priceLevel?: string
  editorialSummary?: string
  types?: string[]
}

export async function fetchPlaceContext(r: RestaurantSource): Promise<PlaceContext | null> {
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_API_KEY,
      // IMPORTANT: do NOT request `places.reviews`. Google user reviews are
      // off-limits as a source for description / tip / shortDescription:
      // they're third-party voices and our brand promise is "personally
      // visited and curated" (see memory: feedback_curator_voice_no_third_party).
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

  return {
    formattedAddress: place.formattedAddress as string | undefined,
    websiteUri: place.websiteUri as string | undefined,
    rating: place.rating as number | undefined,
    userRatingCount: place.userRatingCount as number | undefined,
    priceLevel: place.priceLevel as string | undefined,
    editorialSummary: (place.editorialSummary as { text?: string } | undefined)?.text,
    types: place.types as string[] | undefined,
  }
}

const RESTAURANT_PROMPT = `Du schreibst Restaurant-Beschreibungen auf Deutsch für "Eat This Berlin", einen kuratierten Berliner Food-Guide.

BRAND-VOICE — sehr wichtig:
- Cool und souverän mit High-Snobiety / Hypebeast-Energie übertragen aufs Essen. Scene-aware, nicht touristisch. Wir stehen über den Restaurants — wir empfehlen sie, wir verkaufen sie nicht.
- Editor-Pick-Energie statt Erklärbär: knappe, deklarative Sätze, die Insider klingen lassen ohne damit anzugeben. Geschmack zeigt sich in Restraint, nicht in Lautstärke.
- Englische Begriffe sparsam und ORGANISCH wo sie aus dem Genre kommen (drop, line-up, spot, scene, pick, classic, signature, no-frills [nein! verboten weiter unten], outpost, flagship, brunch, lunch, drinks). Nicht erzwingen, nicht jeder Satz braucht eins. Kein Denglisch-Bingo.
- Kuratoren-Stimme, nicht Reviewer-Echo. "Eat This" empfiehlt; Lob anderer (Reviews, Stammgäste, Besucher) wird NIE zitiert.
- Witz, wenn überhaupt, durch Wortwahl und Untertreibung — NIE durch Pointen, Satzkonstrukte oder Wortspiele. Lieber gar kein Witz als ein bemühter.

SCHREIB-DISZIPLIN (hart):
- Kurze, deklarative Sätze mit variabler Länge. Keine konstruierten Kontrastfiguren ("X ist Y, Z ist es nicht", "klein in A, groß in B", "viel C, wenig D").
- KEINE LISTEN-STRUKTUR. Mehrere Dishes nicht durch Kommas aneinanderreihen ("Teriyaki Wels, Pulled Chicken, Milchreis"). Dishes in Sätze einbetten — mit Verb, Kontext, oder einzelnem Satz pro Dish. Maximal ZWEI Items hintereinander per "und", danach neuer Satz.
- Beschreiben, nicht bewerten. Konkrete Dishes/Orte/Eigenheiten nennen — keine Adjektiv-Wolken ("kreativ", "durchdacht", "ungewöhnlich", "konkret").
- Eigenheiten (Cash-only, kein Wifi, wechselnde Karte, no-Reservation, no-Laptop, Take-away-only) sind erlaubt und nützlich. Kommentar dazu maximal halber Satz.
- Adjektive sparsam und spezifisch. "Hervorragend" / "exzellent" / "phantastisch" / "fantastisch" / "spannend" sind verboten.

VERBOTENES WORDING (komplett raus, ohne Ausnahmen):
- "ohne Schnörkel", "schnörkellos", "ohne Schnickschnack"
- "überschaubar" (in jedem Kontext)
- "auf den Punkt", "auf das Wesentliche", "reduziert"
- "ehrlich", "unprätentiös", "bodenständig", "ungekünstelt"
- "echtes Handwerk", "mit Liebe", "mit Sorgfalt", "mit Hingabe"
- "entdecke", "must-try", "hidden gem", "Geheimtipp", "Pflichtbesuch"
- "kreativ", "durchdacht", "ungewöhnlich" (als Pauschaladjektiv)
- "ein wahrer …", "ein echter …"
- "es lohnt sich" (Floskel)
- "konsequent" (außer wenn fachlich genau zutreffend, z.B. "konsequent vegan")
- Konstrukte wie "die Karte ist X, die Y sind es nicht" sind verboten.

KEINE LIEFER-ERWÄHNUNGEN — Brand-Position:
- Eat This empfiehlt für den BESUCH vor Ort. Liefer-Services sind nicht das Thema.
- NIE erwähnen: "Wolt", "Lieferando", "Uber Eats", "Deliveroo", "wird geliefert", "per Lieferung", "Liefergebiet", "auch zum Liefern", "Delivery". Auch nicht als Nebensatz.
- "Take-away" und "zum Mitnehmen" sind okay (man kommt vorbei und holt ab — das ist on-site).

TON — wie es klingen soll (konkret, eingebettet, scene-aware, KEINE Komma-Listen):
- "Specialty-Coffee-Spot in der Akazienstraße seit 2003. Die Espressi haben WM-Format, Pastéis de Nata laufen als Zugabe."
- "Omakase am Tresen, sieben Plätze. Das Line-up bestimmt der Chef — kein Menü zur Auswahl."
- "Neapolitanische Pizza in Mitte. Kartenzahlung only, abends Wartezeit."
- "Die Bowls drehen sich um Teriyaki-Wels und Butter Chicken. Auf den Stullen kommt Pulled Chicken zum Sauerteig, der Abschluss heißt Milchreis mit Salzkaramell."
- "Das Drinks-Programm zählt hier mindestens so viel wie die Karte."
- "Hafermilch ohne Aufpreis. Default, kein Statement."

KEINE Aufzählung wie "Teriyaki Wels, Pulled Chicken, Milchreis als Closer" oder "Cold Drip, Iced Espresso und Pastéis de Nata" — IMMER mit Verb oder neuem Satz einbinden.

Du bekommst zwei Datenblöcke:
1. SANITY-FAKTEN: was wir intern über das Restaurant wissen (Name, Adresse, Bezirk, Preisklasse, Kategorien, Cuisine-Typ).
2. GOOGLE-PLACES-KONTEXT: editorialSummary, Rating, Review-Auszüge. **Reviews sind interne Recherchequelle — Atmosphäre- und Spezialitäten-Hinweise daraus destillieren und als Fakt formulieren, NIEMALS zitieren oder Reviewer/Stammgäste/Kunden erwähnen.**

NO-HALLUCINATION + KEINE FREMDEN STIMMEN (hart):
- Jede konkrete Aussage muss durch SANITY-FAKTEN oder GOOGLE-PLACES-KONTEXT gedeckt sein. Nichts erfinden — auch nicht "passend klingende" Details.
- KEINE Personennamen (Inhaber/Chef/Barista) erfinden. Wenn nicht in den Quellen erwähnt → weglassen.
- KEINE Erwähnung dritter Personen / fremder Leute — "Stammgäste", "Stammkundschaft", "Gäste", "Kunden", "Besucher", "Reviewer", "Reviewstimmen", "Locals", "Fans" sind alle verboten, sowohl als Subjekt ("die Stammgäste loben…") als auch als Quelle ("laut Stammgästen", "den Gästen zufolge").
- KEINE Reviews-Verweise: "in Reviews", "laut Reviews", "Reviewstimmen", "aktuelle Reviews", "in mehreren Reviews", "Bewertungen sagen". Das Restaurant ist X — nicht "wird in Reviews als X gelobt".
- KEINE Hedging-Sprache: "es heißt", "angeblich", "soll … sein", "wird oft gelobt", "soll besser schmecken".
- KEINE Crowd-Behauptungen ohne Beleg: "im Sommer Schlangen", "abends voll" nur wenn Places-Daten oder editorialSummary das explizit sagen.
- KEINE Marketing-Etiketten: "Geheimtipp", "Pflichtbesuch", "Insider-Adresse", "Must-Try", "hidden gem".
- Restaurantnamen, Dish-Namen, Bezirksnamen bleiben wie sie sind.
- Rating-Zahlen NICHT erwähnen (Google-Rating ändert sich, würde stale werden).

LÄNGEN-BUDGETS (harte Limits):
- description: 200-300 Zeichen, ein bis zwei Sätze. Konkret, das "warum geht man da hin".
- shortDescription: max 160 Zeichen, EIN Satz. SEO-Meta-Description-Stil. Komprimierte Essenz.
- tip: 1-2 kurze Sätze (max 200 Zeichen).

TIP-QUALITÄT (strikter Filter):
Ein gültiger Tip enthält MINDESTENS EIN konkretes Detail aus den Quellen:
- Spezifische Speise/Drink, die in Reviews oder editorialSummary auftaucht (mit Namen)
- Operative Eigenheit aus den Sanity-Fakten (Kartenzahlung-only, no-laptop, no-reservation, BYO, Cash-only, ohne Reservierung)
- Verifizierbares zeitliches Detail (z.B. Wochentag-Special, das Reviews konkret nennen)

GENERISCHE TIPS SIND VERBOTEN — wenn nichts Konkretes da ist, tip = null:
- ❌ "Reservierung empfohlen" / "Tisch reservieren"
- ❌ "Früh kommen" / "Schlange einplanen"
- ❌ "Bei gutem Wetter draußen sitzen"
- ❌ "Außerhalb der Stoßzeiten kommen"
- ❌ "Wer XYZ sucht, ist hier richtig/falsch"
- ❌ "Zeit mitbringen"

✓ Gutes Beispiel: "Hot Honey zur Pepperoni ist kein optionales Extra — die Slice schmeckt anders ohne."
✓ Gutes Beispiel: "Nur Kartenzahlung — Bargeld kann zuhause bleiben."
✗ Schlechtes Beispiel (→ null): "Wer früh kommt, vermeidet Wartezeiten."

Lieber tip = null als ein generischer Tip. Im Zweifel: null.

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

export interface RestaurantGen {
  description: string
  shortDescription: string | null
  tip: string | null
}

// Last-resort filters: even with the strengthened prompt the model occasionally
// slips a rumor-style attribution or marketing tag into the output. We nuke
// the tip (set null) and warn on the description (user reviews before publish).
const BANNED_PATTERNS: RegExp[] = [
  // Reviews / external attribution
  /\blaut (Stammgäst|Stammkund|Reviews?|Bewertung|Gäst|Kund|Besucher|mehreren|vielen)/i,
  /\bin Reviews? (wird|werden|hervorgehoben|gelobt|erwähnt|gepriesen|ausdrücklich|konstant)/i,
  /\bin Reviews nicht überzeugt\b/i,
  /\bReviewstimmen\b/i,
  /\baktuelle Reviews\b/i,
  /\b(in|laut) mehreren Reviews\b/i,
  // Stammgäste/Kunden/Gäste als handelnde Subjekte/Quellen — ohne "laut"-Prefix
  /\b(den|der|die) Stammgäst(e|en)\b/i,
  /\b(den|der|die) Stammkund(en|schaft)\b/i,
  /\bStammgäst(e|en) (sagen|loben|empfehlen|finden|halten|treat)/i,
  // Hedging / Gerücht
  /\bes heißt\b/i,
  /\bangeblich\b/i,
  /\bman munkelt\b/i,
  /\bwird (oft |häufig )?(gelobt|hervorgehoben|gepriesen)\b/i,
  /\bsoll besser schmecken\b/i,
  // Marketing / press-release labels
  /\bGeheimtipp\b/i,
  /\bMust-?Try\b/i,
  /\bInsider-Adresse\b/i,
  /\bPflichtbesuch\b/i,
  /\bhidden gem\b/i,
]

function findBannedPhrase(text: string): string | null {
  for (const re of BANNED_PATTERNS) {
    const m = text.match(re)
    if (m) return m[0]
  }
  return null
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

export async function generateRestaurant(r: RestaurantSource, places: PlaceContext | null): Promise<RestaurantGen> {
  const sanityFacts = {
    name: r.name,
    cuisineType: r.cuisineType ?? null,
    district: r.district ?? null,
    address: r.address ?? null,
    categories: r.categories ?? [],
    priceLevel: priceSymbolFromRange(r.priceRange),
    website: r.website ?? null,
    existingShortDescription: r.shortDescription ?? null,
    existingTip: r.tip ?? null,
  }
  // Note: Google user reviews intentionally excluded — they're third-party
  // voices and would undermine the "personally visited & curated" promise.
  const placesFacts = places
    ? {
        formattedAddress: places.formattedAddress ?? null,
        editorialSummary: places.editorialSummary ?? null,
        priceLevel: places.priceLevel ?? null,
        types: places.types ?? [],
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
  if (parsed.tip) {
    const banned = findBannedPhrase(parsed.tip)
    if (banned) {
      console.warn(`      tip dropped (banned phrase: "${banned}") for ${r._id}`)
      parsed.tip = null
    }
  }
  if (parsed.description) {
    const banned = findBannedPhrase(parsed.description)
    if (banned) {
      console.warn(`      description has banned phrase: "${banned}" for ${r._id} — review manually`)
    }
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
  const draftId = r._id.startsWith('drafts.') ? r._id : `drafts.${r._id}`
  const sets: Record<string, string> = { description: g.description }
  // In --force mode, write over any existing shortDescription/tip so the new
  // brand-voice content fully replaces older versions. Otherwise we only fill
  // gaps (keep manual edits intact).
  if (opts.includeShortDesc && g.shortDescription && (opts.force || !r.shortDescription)) {
    sets.shortDescription = g.shortDescription
  }
  if (opts.includeTip && g.tip && (opts.force || !r.tip)) {
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
  const draftId = b._id.startsWith('drafts.') ? b._id : `drafts.${b._id}`
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
    let docs = await fetchRestaurants({ draftsOnly: opts.draftsOnly, force: opts.force })
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
          console.log(wrote ? `    → patched draft ${r._id.startsWith('drafts.') ? r._id : `drafts.${r._id}`}` : `    (skipped: nothing to set)`)
        }
        // Rate-limit gentle: 200ms between docs (~5 req/s, well under Places + Anthropic limits)
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (e) {
        console.error(`  ✗ ${r.name} (${r._id}):`, e instanceof Error ? e.message : e)
      }
    }
  }

  if (opts.type === 'bezirk' || opts.type === 'all') {
    let docs = await fetchBezirke({ draftsOnly: opts.draftsOnly, force: opts.force })
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
          console.log(wrote ? `    → patched draft ${b._id.startsWith('drafts.') ? b._id : `drafts.${b._id}`}` : `    (skipped: nothing to set)`)
        }
        await new Promise(resolve => setTimeout(resolve, 200))
      } catch (e) {
        console.error(`  ✗ ${b.name} (${b._id}):`, e instanceof Error ? e.message : e)
      }
    }
  }
}

// Only run main when invoked directly via tsx; skipped when imported by the
// API route. Symlink-safe via realpath (macOS /tmp → /private/tmp).
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
    console.error('[generate-de] FATAL:', err)
    process.exit(1)
  })
}
