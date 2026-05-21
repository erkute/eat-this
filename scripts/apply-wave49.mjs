// Applies Wave 49 Komma-Stack-Fixes (6 score-9 docs) from /tmp/wave49-outputs.json.
// Per-Doc kann description/descriptionEn/shortDescription/shortDescriptionEn/seo
// gesetzt werden. Validator prüft Komma-Stack ≤3 Items pro Satz.
//
// Usage:
//   set -a; source scripts/.env.local; set +a
//   node scripts/apply-wave49.mjs            # dry-run + validate
//   node scripts/apply-wave49.mjs --apply    # patch

import fs from 'node:fs'

const PROJECT = 'ehwjnjr2'
const DATASET = 'production'
const TOKEN = process.env.SANITY_TOKEN
const APPLY = process.argv.includes('--apply')

if (!TOKEN) { console.error('Missing SANITY_TOKEN'); process.exit(1) }

const outputs = JSON.parse(fs.readFileSync('/tmp/wave49-outputs.json', 'utf8'))

function checkCommaStack(text) {
  if (!text) return 0
  let worst = 0
  for (const s of text.split(/[.!?]\s+/)) {
    const parts = s.split(/,\s+/).filter(Boolean)
    if (parts.length > worst) worst = parts.length
  }
  return worst
}

function validateValue(label, v) {
  const issues = []
  if (typeof v === 'string') {
    const stack = checkCommaStack(v)
    if (stack >= 4) issues.push(`  ⚠ ${label}: Komma-Stack mit ${stack} Items`)
    if (label.includes('metaDescription') && v.length > 160) {
      issues.push(`  ⚠ ${label}: ${v.length} chars > 160 (Google cut-off)`)
    }
  } else if (v && typeof v === 'object') {
    for (const [k, vv] of Object.entries(v)) {
      issues.push(...validateValue(`${label}.${k}`, vv))
    }
  }
  return issues
}

console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN + VALIDATE'}\n`)

let totalIssues = 0
const patches = []
for (const [slug, entry] of Object.entries(outputs)) {
  const { _id, ...fields } = entry
  const issues = []
  for (const [k, v] of Object.entries(fields)) {
    issues.push(...validateValue(k, v))
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
