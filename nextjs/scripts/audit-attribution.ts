/**
 * Scans all restaurant docs (published + drafts) for "fremde Leute"
 * attribution phrases — review-citations, crowd-quoting, marketing fluff —
 * that violate the editorial brand voice. Reports hits, optionally creates
 * a draft per affected doc and unsets only the offending field(s).
 *
 * Published docs stay live until the user reviews the resulting draft and
 * publishes it themselves. Drafts already in flight just get the field
 * unset in place.
 *
 * Run from `nextjs/`:
 *   npx tsx scripts/audit-attribution.ts                 # dry-run, list hits
 *   npx tsx scripts/audit-attribution.ts --apply         # write drafts
 *
 * Required env (in nextjs/.env.local):
 *   SANITY_API_WRITE_TOKEN  (Editor role)
 */
import { config as loadEnv } from 'dotenv'
import { createClient } from '@sanity/client'

loadEnv({ path: '.env.local' })

const sanity = createClient({
  projectId: 'ehwjnjr2',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
})

// Same source-of-truth set as generate-de-descriptions.ts BANNED_PATTERNS,
// extended with EN equivalents and the long-tail review-citation patterns
// surfaced by the existing-data scan (see commit notes).
const DE_BANNED: RegExp[] = [
  // Attribution to crowd / reviews / strangers
  /\blaut (Stammgäst|Stammkund|Reviews?|Bewertung|Gäst|Kund|Besucher|mehreren|vielen)/i,
  /\bin Reviews? (wird|werden|hervorgehoben|gelobt|erwähnt|gepriesen|ausdrücklich|konstant)/i,
  /\bReviewstimmen\b/i,
  /\baktuelle Reviews\b/i,
  /\b(in|laut) mehreren Reviews\b/i,
  /\bin Reviews nicht überzeugt\b/i,
  // Rumor / hedging
  /\bes heißt\b/i,
  /\bangeblich\b/i,
  /\bman munkelt\b/i,
  /\bwird (oft |häufig )?(gelobt|hervorgehoben|gepriesen)\b/i,
  /\bsoll besser schmecken\b/i,
  // Marketing fluff
  /\bGeheimtipp\b/i,
  /\bMust-?Try\b/i,
  /\bInsider-Adresse\b/i,
  /\bPflichtbesuch\b/i,
  /\bhidden gem\b/i,
]

const EN_BANNED: RegExp[] = [
  // Attribution to crowd / reviews / strangers
  /\bregulars\b/i,
  /\baccording to (reviews?|patrons|guests|locals|fans|customers)\b/i,
  /\breviewers? (praise|love|highlight|call|note|say|report|treat)/i,
  /\breviews (praise|love|highlight|call|note|say|reflect|treat)/i,
  /\bis (loved|praised|hyped) by\b/i,
  /\bearns (consistent |unanimous )?praise\b/i,
  /\blocals? say\b/i,
  /\bcustomers (say|praise|love)/i,
  /\bget(s|ting)? explicit praise\b/i,
  /\bswear by\b/i,
  // Marketing fluff
  /\bhidden gem\b/i,
  /\bmust-?try\b/i,
  /\binsider tip\b/i,
]

interface FieldHit {
  field: 'description' | 'descriptionEn' | 'tip' | 'tipEn'
  match: string
  excerpt: string
}

interface DocResult {
  id: string
  name: string
  isDraft: boolean
  hits: FieldHit[]
}

interface RestaurantRow {
  _id: string
  name: string
  description?: string
  descriptionEn?: string
  tip?: string
  tipEn?: string
}

function findBanned(text: string, patterns: RegExp[]): { match: string; excerpt: string } | null {
  for (const re of patterns) {
    const m = text.match(re)
    if (m) {
      const idx = m.index ?? 0
      const start = Math.max(0, idx - 20)
      const end = Math.min(text.length, idx + m[0].length + 30)
      return { match: m[0], excerpt: `…${text.slice(start, end)}…` }
    }
  }
  return null
}

async function main() {
  const apply = process.argv.includes('--apply')

  const docs: RestaurantRow[] = await sanity.fetch(
    `*[_type=="restaurant" && (defined(description) || defined(descriptionEn) || defined(tip) || defined(tipEn))]{
      _id, name, description, descriptionEn, tip, tipEn
    }`,
  )

  const results: DocResult[] = []
  for (const d of docs) {
    const hits: FieldHit[] = []
    const checks: { field: FieldHit['field']; text?: string; patterns: RegExp[] }[] = [
      { field: 'description', text: d.description, patterns: DE_BANNED },
      { field: 'descriptionEn', text: d.descriptionEn, patterns: EN_BANNED },
      { field: 'tip', text: d.tip, patterns: DE_BANNED },
      { field: 'tipEn', text: d.tipEn, patterns: EN_BANNED },
    ]
    for (const { field, text, patterns } of checks) {
      if (!text) continue
      const found = findBanned(text, patterns)
      if (found) hits.push({ field, match: found.match, excerpt: found.excerpt })
    }
    if (hits.length) {
      results.push({
        id: d._id,
        name: d.name,
        isDraft: d._id.startsWith('drafts.'),
        hits,
      })
    }
  }

  console.log(`📋 ${results.length} doc(s) with banned phrases${apply ? '' : '  [DRY-RUN]'}\n`)
  for (const r of results) {
    console.log(`  ${r.isDraft ? '[draft]' : '[pub] '} ${r.name}`)
    for (const h of r.hits) {
      console.log(`         ${h.field.padEnd(15)} "${h.match}"   ${h.excerpt}`)
    }
  }
  console.log()

  if (!apply) {
    console.log(`Re-run with --apply to create drafts and unset offending fields.`)
    return
  }

  let written = 0
  for (const r of results) {
    const draftId = r.isDraft ? r.id : `drafts.${r.id}`
    // For published docs: clone full doc into a draft so the unset doesn't lose
    // the rest of the editorial state. Existing drafts just get patched.
    if (!r.isDraft) {
      const existingDraft = await sanity.fetch(`*[_id == $id][0]{_id}`, { id: draftId })
      if (!existingDraft) {
        const published = await sanity.fetch<RestaurantRow & Record<string, unknown>>(
          `*[_id == $id][0]{...}`,
          { id: r.id },
        )
        await sanity.createIfNotExists({ ...published, _id: draftId } as never)
      }
    }
    const fieldsToUnset = r.hits.map(h => h.field)
    await sanity.patch(draftId).unset(fieldsToUnset).commit()
    console.log(`✓ ${r.name}: unset ${fieldsToUnset.join(', ')} on ${draftId}`)
    written++
  }
  console.log(`\n✅ ${written} draft(s) updated. Review in Studio + publish when re-curated.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
