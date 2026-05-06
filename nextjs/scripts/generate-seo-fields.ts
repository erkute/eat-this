/**
 * Generates SEO meta fields (DE + EN) for restaurants that lack them.
 * Reads name + description + descriptionEn + cuisine/district context from Sanity,
 * then asks Claude Sonnet 4.6 for compact, click-driver metaTitle / metaDescription.
 * Writes drafts only — editorial / publish-all-drafts.ts publishes after review.
 *
 * Run from `nextjs/`:
 *   npx tsx scripts/generate-seo-fields.ts --limit 3 --dry-run
 *   npx tsx scripts/generate-seo-fields.ts --limit 3
 *   npx tsx scripts/generate-seo-fields.ts
 *
 * Required env (in nextjs/.env.local):
 *   ANTHROPIC_API_KEY
 *   SANITY_API_WRITE_TOKEN  (Editor role)
 */
import { config as loadEnv } from 'dotenv'
import { createClient } from '@sanity/client'
import Anthropic from '@anthropic-ai/sdk'

loadEnv({ path: '.env.local' })

const SANITY_PROJECT_ID = 'ehwjnjr2'
const SANITY_DATASET = 'production'
const SANITY_API_VERSION = '2024-01-01'
const MODEL = 'claude-sonnet-4-6'

interface CliOptions {
  limit: number | null
  dryRun: boolean
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2)
  const opts: CliOptions = { limit: null, dryRun: false }
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (arg === '--dry-run') opts.dryRun = true
    else if (arg === '--limit') opts.limit = parseInt(args[++i] ?? '', 10)
    else if (arg === '--type') {
      // Accept --type restaurant for symmetry with sibling scripts; bezirk has no seo block.
      const v = args[++i]
      if (v !== 'restaurant') {
        throw new Error(`--type must be "restaurant" (bezirk has no seo block), got "${v}"`)
      }
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
  cuisineType?: string
  district?: string
  categories?: string[]
  price?: string
  seo?: {
    metaTitle?: string
    metaTitleEn?: string
    metaDescription?: string
    metaDescriptionEn?: string
  }
}

// Project all fields with {...} wildcard. The script needs the full doc to clone
// into a draft via createIfNotExists; partial projections produced incomplete
// drafts (image, slug, openingHours …) — see feedback_sanity_draft_full_clone.md.
//
// Idempotent on BOTH published and draft state: a restaurant qualifies only if
// neither side has seo.metaTitle. Without the draft check, re-runs would
// regenerate every doc whose seo lives only in the draft.
async function fetchRestaurants(): Promise<RestaurantSource[]> {
  return sanity.fetch(
    `*[_type == "restaurant" && !(_id in path("drafts.**"))
        && !defined(seo.metaTitle)
        && !defined(*[_id == "drafts." + ^._id][0].seo.metaTitle)]{...} | order(name asc)`,
  )
}

const SEO_PROMPT = `Du schreibst Suchmaschinen-Meta-Felder für "Eat This Berlin", einen kuratierten Berliner Food-Guide.

Du bekommst Sanity-Fakten zu einem Restaurant: Name, Beschreibung (DE), englische Beschreibung (EN), Kategorien, Cuisine-Typ, Bezirk, Preisklasse.

ZIEL: vier kompakte Strings, die in Google-Snippets messbar besser klicken als der generische Fallback "<Name> — Eat This Berlin" + abgeschnittene description.

LÄNGEN-LIMITS (HART, dürfen nicht überschritten werden — Sanity-Validierung schlägt sonst zu):
- metaTitle (DE): max 60 Zeichen
- metaTitleEn (EN): max 60 Zeichen
- metaDescription (DE): max 160 Zeichen
- metaDescriptionEn (EN): max 160 Zeichen

REGELN:
- Restaurantnamen, Bezirksnamen, Dish-Eigennamen bleiben unverändert.
- Kein Werbe-Sprech ("entdecke", "must-try", "hidden gem", "Geheimtipp"), keine inhaltsleeren Superlative.
- Nur Fakten verwenden, die in den Quellen stehen. Keine Erfindungen.
- Rating-Zahlen nicht erwähnen (würden stale werden).
- Brand-Suffix " — Eat This Berlin" weglassen — der Browser hängt das nicht automatisch an, aber im Title ist Platz teurer als das Brand-Suffix; der Bezirks-Anchor klickt besser.

PATTERN-EMPFEHLUNG:
- metaTitle DE: "<Name> – <kompakter USP> in <Bezirk>"  (z.B. "893 Ryōtei – Sushi-Omakase in Charlottenburg")
- metaTitleEn: parallele EN-Variante  (z.B. "893 Ryōtei – Omakase Sushi in Charlottenburg")
- metaDescription DE: 140-160 Zeichen, ein klick-orientierter Satz mit USP + Bezirk + ein konkretes Detail aus der description
- metaDescriptionEn: parallel auf EN, aus descriptionEn destilliert (NICHT von DE übersetzt)

Falls descriptionEn fehlt, übersetze die DE-Essenz natürlich auf Englisch — kein wörtliches Übertragen.

Gib NUR ein JSON-Objekt zurück (kein Prosa, kein Markdown-Fence):
{
  "metaTitle": string,
  "metaTitleEn": string,
  "metaDescription": string,
  "metaDescriptionEn": string
}`

interface SeoGen {
  metaTitle: string
  metaTitleEn: string
  metaDescription: string
  metaDescriptionEn: string
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

const LENGTH_LIMITS: Array<[keyof SeoGen, number]> = [
  ['metaTitle', 60],
  ['metaTitleEn', 60],
  ['metaDescription', 160],
  ['metaDescriptionEn', 160],
]

function validateLengths(parsed: SeoGen, docId: string): { ok: true } | { ok: false; offenders: string[] } {
  const offenders: string[] = []
  for (const [key, max] of LENGTH_LIMITS) {
    const v = parsed[key]
    if (!v || typeof v !== 'string') {
      throw new Error(`${key} missing or not a string for ${docId}`)
    }
    if (v.length > max) {
      offenders.push(`${key} ist ${v.length} Zeichen, Limit ${max} (überschuss: ${v.length - max})`)
    }
  }
  return offenders.length === 0 ? { ok: true } : { ok: false, offenders }
}

async function generateSeo(r: RestaurantSource): Promise<SeoGen> {
  const facts = {
    name: r.name,
    description: r.description ?? null,
    descriptionEn: r.descriptionEn ?? null,
    shortDescription: r.shortDescription ?? null,
    cuisineType: r.cuisineType ?? null,
    district: r.district ?? null,
    categories: r.categories ?? [],
    priceLevel: r.price ?? null,
  }
  const userMsg = `SANITY-FAKTEN:\n${JSON.stringify(facts, null, 2)}`

  const callOnce = async (reminder: 'none' | 'json' | 'length', lengthOffenders: string[] = []) => {
    let content = userMsg
    if (reminder === 'json') {
      content +=
        '\n\nWICHTIG: Antworte AUSSCHLIESSLICH mit gültigem JSON in der oben definierten Form. Keine Prosa, keine Erklärungen, keine Markdown-Codeblöcke. Halte die Längen-Limits ein.'
    } else if (reminder === 'length') {
      // Tell the model exactly which fields overshot and by how much. Avoid the
      // word "count" / "zählen" — Sonnet 4.6 takes it literally and replies with
      // prose ("I'll count…") instead of JSON. Just state the overshoot and
      // demand a shortened JSON object.
      content +=
        `\n\nDer letzte Versuch hat die HARTEN Längen-Limits verletzt:\n- ${lengthOffenders.join('\n- ')}\n\nKürze die betroffenen Felder strikt unter ihr Limit (metaTitle/metaTitleEn ≤ 60, metaDescription/metaDescriptionEn ≤ 160). Antworte AUSSCHLIESSLICH mit dem aktualisierten JSON-Objekt — keine Erklärung, keine Prosa, kein Markdown-Fence.`
    }
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: SEO_PROMPT,
      messages: [{ role: 'user', content }],
    })
    return JSON.parse(extractJsonText(msg.content, r._id)) as SeoGen
  }

  let parsed: SeoGen
  try {
    parsed = await callOnce('none')
  } catch (firstErr) {
    if (firstErr instanceof SyntaxError) {
      parsed = await callOnce('json')
    } else {
      throw firstErr
    }
  }

  // Length-violation retry: Sonnet 4.6 routinely overshoots EN metaDescription
  // by 1-15 chars (~15% rate). Re-prompt with explicit char counts + overshoot
  // delta — cheaper than a manual cleanup pass after the full run.
  let validation = validateLengths(parsed, r._id)
  if (!validation.ok) {
    try {
      parsed = await callOnce('length', validation.offenders)
    } catch (lenErr) {
      // Some retries come back as prose ("I'll count chars…") if the prompt
      // accidentally triggers reasoning-out-loud. One more attempt with the
      // stricter JSON-only reminder usually fixes it.
      if (lenErr instanceof SyntaxError) {
        parsed = await callOnce('json')
      } else {
        throw lenErr
      }
    }
    validation = validateLengths(parsed, r._id)
    if (!validation.ok) {
      throw new Error(`length retry still failed for ${r._id}: ${validation.offenders.join('; ')}`)
    }
  }

  return parsed
}

async function patchRestaurantDraft(r: RestaurantSource, g: SeoGen): Promise<void> {
  const draftId = `drafts.${r._id}`

  // Clone the full published doc into a draft if no draft exists yet — preserves
  // image, slug, openingHours, etc. so a later publish doesn't blow them away.
  await sanity.createIfNotExists({
    ...r,
    _id: draftId,
    _type: 'restaurant',
  } as { _id: string; _type: 'restaurant' } & Record<string, unknown>)

  // setIfMissing the parent seo object first — most restaurants have no seo
  // block at all, so a direct .set({'seo.metaTitle': ...}) on a missing parent
  // would create implicit nesting that's harder to reason about. Two separate
  // awaits, never transaction.patch(callback) — see feedback_sanity_transaction_patch_callback.md.
  await sanity
    .patch(draftId)
    .setIfMissing({ seo: {} })
    .set({
      'seo.metaTitle': g.metaTitle,
      'seo.metaTitleEn': g.metaTitleEn,
      'seo.metaDescription': g.metaDescription,
      'seo.metaDescriptionEn': g.metaDescriptionEn,
    })
    .commit({ autoGenerateArrayKeys: true })
}

async function main(): Promise<void> {
  const opts = parseArgs()
  console.log(`[generate-seo] limit=${opts.limit ?? 'all'} dryRun=${opts.dryRun}`)

  let docs = await fetchRestaurants()
  if (opts.limit !== null) docs = docs.slice(0, opts.limit)
  console.log(`[generate-seo] restaurants needing seo fields: ${docs.length}`)

  let ok = 0
  let failed = 0

  for (const r of docs) {
    try {
      const g = await generateSeo(r)
      console.log(`  ✓ ${r.name} (${r._id})`)
      console.log(`     T  DE [${g.metaTitle.length}]: ${g.metaTitle}`)
      console.log(`     T  EN [${g.metaTitleEn.length}]: ${g.metaTitleEn}`)
      console.log(`     D  DE [${g.metaDescription.length}]: ${g.metaDescription}`)
      console.log(`     D  EN [${g.metaDescriptionEn.length}]: ${g.metaDescriptionEn}`)
      if (!opts.dryRun) {
        await patchRestaurantDraft(r, g)
        console.log(`     → patched draft drafts.${r._id}`)
      }
      ok++
      // Gentle rate-limit: 200ms (~5 req/s, well under Anthropic limits).
      await new Promise(resolve => setTimeout(resolve, 200))
    } catch (e) {
      console.error(`  ✗ ${r.name} (${r._id}):`, e instanceof Error ? e.message : e)
      failed++
    }
  }

  console.log(`[generate-seo] done — ok: ${ok}, failed: ${failed}`)
}

main().catch(err => {
  console.error('[generate-seo] FATAL:', err)
  process.exit(1)
})
