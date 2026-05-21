// Applies Wave 48 Komma-Stack-Fixes from /tmp/wave48-outputs.json.
// Each entry contains _id + the fields to set (description, descriptionEn,
// optionally shortDescription, shortDescriptionEn). Tip-Felder unverändert.
//
// Pre-flight validator: re-runs the same Komma-Stack check as audit-descriptions.mjs
// to catch any rewrite that still has ≥4 comma-split parts per sentence.
//
// Usage:
//   set -a; source scripts/.env.local; set +a
//   node scripts/apply-wave48.mjs            # dry-run + validate
//   node scripts/apply-wave48.mjs --apply    # actually patch

import fs from 'node:fs'

const PROJECT = 'ehwjnjr2'
const DATASET = 'production'
const TOKEN = process.env.SANITY_TOKEN
const APPLY = process.argv.includes('--apply')

if (!TOKEN) { console.error('Missing SANITY_TOKEN'); process.exit(1) }

const outputs = JSON.parse(fs.readFileSync('/tmp/wave48-outputs.json', 'utf8'))

function checkCommaStack(text) {
  if (!text) return 0
  let worst = 0
  const sentences = text.split(/[.!?]\s+/)
  for (const s of sentences) {
    const parts = s.split(/,\s+/).filter(Boolean)
    if (parts.length > worst) worst = parts.length
  }
  return worst
}

console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN + VALIDATE'}\n`)

let totalIssues = 0
const patches = []
for (const [slug, content] of Object.entries(outputs)) {
  const { _id, ...fields } = content
  const issues = []
  for (const [field, value] of Object.entries(fields)) {
    if (typeof value !== 'string') continue
    const stack = checkCommaStack(value)
    if (stack >= 4) issues.push(`  ⚠ ${field}: Komma-Stack mit ${stack} Items`)
  }
  if (issues.length) {
    console.log(`✗ ${slug} (${_id})`)
    issues.forEach(i => console.log(i))
    totalIssues += issues.length
  } else {
    console.log(`✓ ${slug} (${_id}) — clean`)
  }
  patches.push({ patch: { id: _id, set: fields } })
}

if (totalIssues > 0) {
  console.error(`\n✗ ${totalIssues} validation issues — fix before apply.`)
  process.exit(1)
}

if (!APPLY) {
  console.log(`\n✓ All ${patches.length} patches clean. Run with --apply to commit.`)
  process.exit(0)
}

const MUTATION_URL = `https://${PROJECT}.api.sanity.io/v2024-01-01/data/mutate/${DATASET}?returnIds=true`
const res = await fetch(MUTATION_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
  body: JSON.stringify({ mutations: patches }),
})
const out = await res.json()
if (out.error) { console.error('Sanity error:', JSON.stringify(out.error, null, 2)); process.exit(1) }
console.log(`\n✓ Patched ${out.results.length} docs. Transaction: ${out.transactionId}`)
