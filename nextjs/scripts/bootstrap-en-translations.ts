/**
 * One-shot bootstrap that translates published Restaurant + Bezirk DE prose
 * into EN drafts in Sanity. Idempotent: skips docs that already have a
 * non-empty `descriptionEn`. Drafts only — editorial publishes manually.
 *
 * Run from `nextjs/`:
 *   npx tsx scripts/bootstrap-en-translations.ts --dry-run
 *   npx tsx scripts/bootstrap-en-translations.ts --type restaurant --limit 1
 *   npx tsx scripts/bootstrap-en-translations.ts --type bezirk
 *
 * Required env (in nextjs/.env.local):
 *   ANTHROPIC_API_KEY
 *   SANITY_API_WRITE_TOKEN  (Editor role, sanity.io/manage → API → Tokens)
 */
import { config as loadEnv } from 'dotenv'
import { createClient } from '@sanity/client'
import Anthropic from '@anthropic-ai/sdk'

// Next.js convention: secrets live in .env.local, not .env. Load explicitly.
loadEnv({ path: '.env.local' })

const SANITY_PROJECT_ID = 'ehwjnjr2'
const SANITY_DATASET = 'production'
const SANITY_API_VERSION = '2024-01-01'

type DocType = 'restaurant' | 'bezirk'

interface CliOptions {
  type: DocType | 'all'
  limit: number | null
  dryRun: boolean
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  const opts: CliOptions = { type: 'all', limit: null, dryRun: false }
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--dry-run') {
      opts.dryRun = true
    } else if (arg === '--limit') {
      opts.limit = parseInt(args[++i] ?? '', 10)
    } else if (arg === '--type') {
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

interface RestaurantSource {
  _id: string
  name: string
  description?: string
  descriptionEn?: string
  shortDescription?: string
  shortDescriptionEn?: string
  tip?: string
  tipEn?: string
  seo?: {
    metaTitle?: string
    metaTitleEn?: string
    metaDescription?: string
    metaDescriptionEn?: string
  }
}

interface BezirkSource {
  _id: string
  name: string
  description?: string
  descriptionEn?: string
}

// Project all fields with {...} wildcard. createIfNotExists needs the full
// published doc to clone; partial projections produced incomplete drafts that
// would lose image/slug/openingHours/etc. on publish (see repair-draft-fields.ts).
async function fetchRestaurants(): Promise<RestaurantSource[]> {
  return sanity.fetch(
    `*[_type == "restaurant" && !(_id in path("drafts.**"))]{...}`,
  )
}

async function fetchBezirke(): Promise<BezirkSource[]> {
  return sanity.fetch(
    `*[_type == "bezirk" && !(_id in path("drafts.**"))]{...}`,
  )
}

const TRANSLATION_MODEL = 'claude-sonnet-4-6'

const RESTAURANT_PROMPT = `You are translating restaurant content from German to English for "Eat This Berlin", a curated Berlin food guide. Brand voice: direct, opinionated, concrete. Avoid clickbait phrases ("discover amazing", "must-visit", "hidden gem"). Preserve specifics (dish names, district names, restaurant names, cuisine types) — these stay as they are.

You will receive a JSON object with the German source fields (some may be empty/null). Translate ONLY the fields with German content; for fields that are null or absent in the input, return null in the output. Do NOT invent content.

Length budgets:
- metaTitleEn: max 60 characters
- metaDescriptionEn: max 155 characters
- shortDescriptionEn: max 160 characters
- tipEn: short, single sentence
- descriptionEn: keep approximately the same length as the German source, max 300 characters

Return ONLY a JSON object matching this exact shape (no prose, no markdown fence):
{
  "descriptionEn": string | null,
  "shortDescriptionEn": string | null,
  "tipEn": string | null,
  "metaTitleEn": string | null,
  "metaDescriptionEn": string | null
}`

const BEZIRK_PROMPT = `You are translating Berlin district (Bezirk) content from German to English for "Eat This Berlin". Brand voice: direct, opinionated, concrete. Avoid clickbait. The bezirk name itself is a proper noun and stays untranslated.

Return ONLY this JSON object (no prose, no markdown fence):
{
  "descriptionEn": string | null
}`

interface RestaurantTranslation {
  descriptionEn: string | null
  shortDescriptionEn: string | null
  tipEn: string | null
  metaTitleEn: string | null
  metaDescriptionEn: string | null
}

interface BezirkTranslation {
  descriptionEn: string | null
}

function extractJsonText(content: Anthropic.ContentBlock[], docId: string): string {
  const textBlock = content.find(b => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error(`No text block in response for ${docId}`)
  }
  return textBlock.text.trim()
}

async function translateRestaurant(r: RestaurantSource): Promise<RestaurantTranslation> {
  const source = {
    name: r.name,
    description: r.description ?? null,
    shortDescription: r.shortDescription ?? null,
    tip: r.tip ?? null,
    metaTitle: r.seo?.metaTitle ?? null,
    metaDescription: r.seo?.metaDescription ?? null,
  }
  const msg = await anthropic.messages.create({
    model: TRANSLATION_MODEL,
    max_tokens: 2048,
    system: RESTAURANT_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Restaurant: ${r.name}\n\nGerman source:\n${JSON.stringify(source, null, 2)}`,
      },
    ],
  })
  return JSON.parse(extractJsonText(msg.content, r._id)) as RestaurantTranslation
}

async function translateBezirk(b: BezirkSource): Promise<BezirkTranslation> {
  if (!b.description) return { descriptionEn: null }
  const msg = await anthropic.messages.create({
    model: TRANSLATION_MODEL,
    max_tokens: 1024,
    system: BEZIRK_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Bezirk: ${b.name}\n\nGerman source:\n${JSON.stringify({ description: b.description }, null, 2)}`,
      },
    ],
  })
  return JSON.parse(extractJsonText(msg.content, b._id)) as BezirkTranslation
}

function hasEnDescription(doc: { descriptionEn?: string }): boolean {
  return typeof doc.descriptionEn === 'string' && doc.descriptionEn.trim().length > 0
}

async function patchRestaurantDraft(r: RestaurantSource, t: RestaurantTranslation): Promise<boolean> {
  const draftId = r._id.startsWith('drafts.') ? r._id : `drafts.${r._id}`

  const topLevelSets: Record<string, string> = {}
  if (t.descriptionEn != null) topLevelSets.descriptionEn = t.descriptionEn
  if (t.shortDescriptionEn != null) topLevelSets.shortDescriptionEn = t.shortDescriptionEn
  if (t.tipEn != null) topLevelSets.tipEn = t.tipEn

  const seoSets: Record<string, string> = {}
  if (t.metaTitleEn != null) seoSets['seo.metaTitleEn'] = t.metaTitleEn
  if (t.metaDescriptionEn != null) seoSets['seo.metaDescriptionEn'] = t.metaDescriptionEn

  if (Object.keys(topLevelSets).length === 0 && Object.keys(seoSets).length === 0) return false

  // Two separate awaits — chained transaction.patch(id, fn) silently no-op'd in
  // a prior version. createIfNotExists then a standalone patch.commit() is the
  // unambiguous form.
  await sanity.createIfNotExists({
    ...r,
    _id: draftId,
    _type: 'restaurant',
  } as { _id: string; _type: 'restaurant' } & Record<string, unknown>)

  let patch = sanity.patch(draftId)
  if (Object.keys(topLevelSets).length > 0) patch = patch.set(topLevelSets)
  if (Object.keys(seoSets).length > 0) {
    patch = patch.setIfMissing({ seo: {} }).set(seoSets)
  }
  await patch.commit({ autoGenerateArrayKeys: true })
  return true
}

async function patchBezirkDraft(b: BezirkSource, t: BezirkTranslation): Promise<boolean> {
  if (t.descriptionEn == null) return false
  const draftId = b._id.startsWith('drafts.') ? b._id : `drafts.${b._id}`

  await sanity.createIfNotExists({
    ...b,
    _id: draftId,
    _type: 'bezirk',
  } as { _id: string; _type: 'bezirk' } & Record<string, unknown>)

  await sanity.patch(draftId).set({ descriptionEn: t.descriptionEn }).commit()
  return true
}

async function main(): Promise<void> {
  const opts = parseArgs()
  console.log(`[bootstrap] type=${opts.type} limit=${opts.limit ?? 'all'} dryRun=${opts.dryRun}`)

  if (opts.type === 'restaurant' || opts.type === 'all') {
    let docs = await fetchRestaurants()
    docs = docs.filter(r => !hasEnDescription(r))
    if (opts.limit !== null) docs = docs.slice(0, opts.limit)
    console.log(`[bootstrap] restaurants needing translation: ${docs.length}`)
    for (const r of docs) {
      try {
        const t = await translateRestaurant(r)
        console.log(`  ✓ ${r.name} (${r._id})`)
        if (opts.dryRun) {
          console.log(JSON.stringify(t, null, 2))
        } else {
          const wrote = await patchRestaurantDraft(r, t)
          console.log(wrote ? `    → patched draft drafts.${r._id}` : `    (skipped: no EN fields to set)`)
        }
      } catch (e) {
        console.error(`  ✗ ${r.name} (${r._id}):`, e)
      }
    }
  }

  if (opts.type === 'bezirk' || opts.type === 'all') {
    let docs = await fetchBezirke()
    docs = docs.filter(b => !hasEnDescription(b))
    if (opts.limit !== null) docs = docs.slice(0, opts.limit)
    console.log(`[bootstrap] bezirke needing translation: ${docs.length}`)
    for (const b of docs) {
      try {
        const t = await translateBezirk(b)
        console.log(`  ✓ ${b.name} (${b._id})`)
        if (opts.dryRun) {
          console.log(JSON.stringify(t, null, 2))
        } else {
          const wrote = await patchBezirkDraft(b, t)
          console.log(wrote ? `    → patched draft drafts.${b._id}` : `    (skipped: no description in source)`)
        }
      } catch (e) {
        console.error(`  ✗ ${b.name} (${b._id}):`, e)
      }
    }
  }
}

main().catch(err => {
  console.error('[bootstrap] FATAL:', err)
  process.exit(1)
})
