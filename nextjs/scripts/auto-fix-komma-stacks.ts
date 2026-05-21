/**
 * Auto-Fix Komma-Stacks für score-≤6 Docs.
 *
 * Pipeline pro Doc:
 *  1. Lädt description + descriptionEn aus Sanity (raw).
 *  2. Sendet beide Felder an Claude Sonnet mit tight Voice-B-preserving Prompt.
 *  3. Validator: max 3 Komma-Parts pro Satz, keine konkrete Uhrzeit,
 *     keine Lieferung-Trigger, Länge ≤700.
 *  4. Patches Sanity per direct mutation API. Fail-Cases werden geloggt + geskippt.
 *
 * Usage (aus nextjs/):
 *   npx tsx scripts/auto-fix-komma-stacks.ts            # dry-run
 *   npx tsx scripts/auto-fix-komma-stacks.ts --apply    # patch live
 *   npx tsx scripts/auto-fix-komma-stacks.ts --limit 5  # nur n Docs (zum smoken)
 *   npx tsx scripts/auto-fix-komma-stacks.ts --slugs a,b,c  # specific slugs
 *
 * Required env (nextjs/.env.local):
 *   ANTHROPIC_API_KEY
 *   SANITY_API_WRITE_TOKEN
 */
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@sanity/client'

const SANITY_PROJECT_ID = 'ehwjnjr2'
const SANITY_DATASET = 'production'
const MODEL = 'claude-sonnet-4-6'

const APPLY = process.argv.includes('--apply')
const LIMIT_ARG = process.argv.find(a => a.startsWith('--limit'))
const SLUGS_ARG = process.argv.find(a => a.startsWith('--slugs'))
const LIMIT = LIMIT_ARG ? Number(LIMIT_ARG.split('=')[1] ?? process.argv[process.argv.indexOf(LIMIT_ARG) + 1]) : Infinity
const FORCED_SLUGS = SLUGS_ARG ? (SLUGS_ARG.split('=')[1] ?? process.argv[process.argv.indexOf(SLUGS_ARG) + 1]).split(',') : null

const SANITY_TOKEN = process.env.SANITY_API_WRITE_TOKEN
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
if (!SANITY_TOKEN) { console.error('Missing SANITY_API_WRITE_TOKEN'); process.exit(1) }
if (!ANTHROPIC_KEY) { console.error('Missing ANTHROPIC_API_KEY'); process.exit(1) }

const sanity = createClient({
  projectId: SANITY_PROJECT_ID, dataset: SANITY_DATASET, apiVersion: '2024-01-01',
  token: SANITY_TOKEN, useCdn: false,
})
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY })

const SYSTEM_PROMPT = `You are an editor for "Eat This Berlin", a curated Berlin food guide. Your job is purely mechanical: rewrite restaurant descriptions to fix ONE specific style issue — comma stacks — while preserving everything else exactly.

# DEFINITION (count carefully)
A "comma stack" violation = ONE sentence containing ≥3 commas.
- Sentence boundaries: "." "!" "?" — NOT em-dashes, NOT colons, NOT semicolons.
- Count every ", " inside the sentence. ≥3 commas = violation. Target: ≤2 commas per sentence.

# EXAMPLES of violations (each has 3+ commas in ONE sentence)
- "Foo, bar, baz, qux." (3 commas)
- "Setup A, B, C — long phrase D, E." (4 commas — em-dash does not break)
- "X, Y mit Z, A und B, C — last note." (3 commas)
- "Karte: Suppe, Salat, Brot, Pizza." (3 commas)

# NOT violations
- "Foo, bar and baz." (1 comma)
- "Foo, bar — baz, qux." (2 commas)
- "Foo and bar, X and Y, Z." (2 commas)

# HOW TO FIX (per violating sentence)
Pick the simplest fix:
(a) Split into two sentences with a period: "Foo, bar, baz, qux." → "Foo, bar und baz. Qux dazu." (2 + 0 commas)
(b) Merge with "und"/"and": "A, B, C, D" → "A, B und C — D dazu." (2 commas)
(c) Both: rewrite to two ≤2-comma sentences.

# HARD CONSTRAINTS
1. Voice/tone: preserve EXACTLY. Don't smooth or "improve". This is surgery, not styling.
2. Facts: keep every name, dish, address, owner, neighbourhood, number, signature item.
3. NO concrete clock times in description. "bis 22 Uhr" → "bis spät am Abend"; "von 12 bis 16 Uhr" → "zur Mittagsschiene"; "until 22:00" → "into the late evening". Replace ANY "\\b\\d{1,2}([:.]\\d{2}|\\s*[Uu]hr|h\\b)" patterns.
4. Forbidden words: "Lieferung", "Lieferdienst", "Deliveroo", "Wolt", "Uber Eats", "Lieferando". If "Lieferung" means a goods shipment, use "Charge" or "Sendung" (DE) / "batch" (EN).
5. Length: stay ≤650 chars per language. If already over, trim — never add prose.
6. If a sentence already has ≤2 commas AND no other violation, leave it BYTE-FOR-BYTE untouched.
7. DE and EN both: apply independently.

# PROCESS
1. For DE: split into sentences (on .!?), count commas in each, rewrite ONLY those with ≥3.
2. For EN: same.
3. Self-check before output: re-count commas in your final sentences. If any sentence still has ≥3 commas, fix it before outputting.

# OUTPUT
JSON only, no markdown, no commentary:
{"description": "<DE>", "descriptionEn": "<EN>"}
`

interface Doc { _id: string, name: string, slug: string, description: string, descriptionEn: string | null }

function checkCommaStack(text: string | null | undefined): number {
  if (!text) return 0
  let worst = 0
  for (const s of text.split(/[.!?]\s+/)) {
    const parts = s.split(/,\s+/).filter(Boolean)
    if (parts.length > worst) worst = parts.length
  }
  return worst
}

const HOURS_TIME = /\b\d{1,2}([:.]\d{2}|\s*uhr|\s*Uhr|h\b)/
const DELIVERY_RE = /\b(lieferdienst|lieferung|deliveroo|wolt|uber\s*eats|lieferando)\b/i

function validate(d: string | null): string[] {
  const issues: string[] = []
  if (!d) return ['empty']
  const stack = checkCommaStack(d)
  if (stack >= 4) issues.push(`Komma-Stack ${stack}`)
  if (HOURS_TIME.test(d)) issues.push('konkrete Uhrzeit')
  if (DELIVERY_RE.test(d)) issues.push('Delivery-Trigger')
  if (d.length > 700) issues.push(`Length ${d.length} > 700`)
  return issues
}

function extractJson(text: string): string {
  // Strip code fences and find first { ... }
  const m = text.match(/\{[\s\S]*\}/)
  return m ? m[0] : text
}

function offendingSentences(text: string): string[] {
  const out: string[] = []
  for (const s of text.split(/[.!?]\s+/)) {
    const parts = s.split(/,\s+/).filter(Boolean)
    if (parts.length >= 4) out.push(s.trim())
  }
  return out
}

async function callModel(userMsg: string): Promise<{ description?: string, descriptionEn?: string } | null> {
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMsg }],
  })
  const raw = msg.content.filter(c => c.type === 'text').map(c => (c as { text: string }).text).join('')
  try {
    return JSON.parse(extractJson(raw))
  } catch {
    return null
  }
}

async function rewriteDoc(d: Doc): Promise<{ description: string, descriptionEn: string } | null> {
  const userMsg = `DE description (current):\n${d.description}\n\nEN description (current):\n${d.descriptionEn ?? ''}\n\nReturn JSON with both fields, fixed where needed.`
  let parsed = await callModel(userMsg)
  if (!parsed?.description || !parsed?.descriptionEn) return null

  // Second pass if validator still flags
  const deBad = validate(parsed.description)
  const enBad = validate(parsed.descriptionEn)
  if (deBad.length > 0 || enBad.length > 0) {
    const deOff = offendingSentences(parsed.description)
    const enOff = offendingSentences(parsed.descriptionEn)
    const feedback = `Your previous attempt still has violations. Fix these specific sentences (each has ≥3 commas — reduce to ≤2):

DE issues: ${deBad.join('; ') || 'none'}
${deOff.length ? `DE offending sentences:\n${deOff.map(s => `  - "${s}"`).join('\n')}` : ''}

EN issues: ${enBad.join('; ') || 'none'}
${enOff.length ? `EN offending sentences:\n${enOff.map(s => `  - "${s}"`).join('\n')}` : ''}

Previous DE output:
${parsed.description}

Previous EN output:
${parsed.descriptionEn}

Rewrite again — keep everything else identical, only fix the listed sentences. Output JSON.`
    parsed = await callModel(feedback)
    if (!parsed?.description || !parsed?.descriptionEn) return null
  }
  return { description: parsed.description, descriptionEn: parsed.descriptionEn }
}

async function main() {
  console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'} · Model: ${MODEL}\n`)

  // Pull all score-≤6 candidates: docs with at least one ≥4 comma-stack in either DE or EN.
  // We re-derive the candidate set from Sanity rather than the stale audit JSON.
  let groqFilter = '_type == "restaurant" && isOpen == true && isClosed != true'
  if (FORCED_SLUGS) {
    groqFilter += ` && slug.current in [${FORCED_SLUGS.map(s => `"${s}"`).join(',')}]`
  }
  const allDocs = await sanity.fetch<Doc[]>(`*[${groqFilter}]{ _id, name, "slug": slug.current, description, descriptionEn } | order(name asc)`)
  console.log(`Loaded ${allDocs.length} docs from Sanity.`)

  // Filter to docs with stack ≥4 in either lang OR hard-fail trigger
  const candidates = FORCED_SLUGS
    ? allDocs
    : allDocs.filter(d => {
        const deIssues = validate(d.description)
        const enIssues = validate(d.descriptionEn)
        return deIssues.length > 0 || enIssues.length > 0
      })
  console.log(`${candidates.length} candidates (Komma-Stack ≥4, konkrete Uhrzeit, oder Lieferung-Trigger).\n`)

  const subset = candidates.slice(0, LIMIT)
  let succeeded = 0
  let failed = 0
  let skipped = 0
  const failures: string[] = []

  for (const [i, d] of subset.entries()) {
    process.stdout.write(`[${i + 1}/${subset.length}] ${d.slug.padEnd(40)} `)
    let result
    try {
      result = await rewriteDoc(d)
    } catch (e) {
      console.log(`✗ API error: ${(e as Error).message}`)
      failed++; failures.push(d.slug)
      continue
    }
    if (!result) { failed++; failures.push(d.slug); continue }

    const deIssues = validate(result.description)
    const enIssues = validate(result.descriptionEn)
    if (deIssues.length > 0 || enIssues.length > 0) {
      console.log(`✗ post-validate: DE [${deIssues.join(', ')}] EN [${enIssues.join(', ')}]`)
      failed++; failures.push(d.slug)
      continue
    }

    if (!APPLY) {
      console.log(`✓ clean (dry-run)`)
      skipped++
      continue
    }
    try {
      await sanity.patch(d._id).set({ description: result.description, descriptionEn: result.descriptionEn }).commit()
      console.log(`✓ patched`)
      succeeded++
    } catch (e) {
      console.log(`✗ patch error: ${(e as Error).message}`)
      failed++; failures.push(d.slug)
    }
  }

  console.log(`\n=== Summary ===`)
  console.log(`Total processed: ${subset.length}`)
  if (APPLY) console.log(`Patched: ${succeeded}`)
  else console.log(`Would patch: ${skipped}`)
  console.log(`Failed: ${failed}`)
  if (failures.length) console.log(`Failed slugs: ${failures.join(', ')}`)
}

main().catch(e => { console.error(e); process.exit(1) })
