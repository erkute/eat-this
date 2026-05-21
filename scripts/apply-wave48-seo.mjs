// Applies Wave 48 SEO-Komma-Stack-Fixes from /tmp/wave48-seo-outputs.json.
// Patches seo.metaTitle / metaTitleEn / metaDescription / metaDescriptionEn
// for 4 docs (Do De Li, Companion, Imren, Klinke) whose SEO copy still had ≥4
// comma-split items per sentence. Validator runs the same check as audit.

import fs from 'node:fs'

const PROJECT = 'ehwjnjr2'
const DATASET = 'production'
const TOKEN = process.env.SANITY_TOKEN
const APPLY = process.argv.includes('--apply')

if (!TOKEN) { console.error('Missing SANITY_TOKEN'); process.exit(1) }

const outputs = JSON.parse(fs.readFileSync('/tmp/wave48-seo-outputs.json', 'utf8'))

function checkCommaStack(text) {
  if (!text) return 0
  let worst = 0
  for (const s of text.split(/[.!?]\s+/)) {
    const parts = s.split(/,\s+/).filter(Boolean)
    if (parts.length > worst) worst = parts.length
  }
  return worst
}

console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN + VALIDATE'}\n`)

let totalIssues = 0
const patches = []
for (const [slug, entry] of Object.entries(outputs)) {
  const { _id, seo } = entry
  const issues = []
  for (const [k, v] of Object.entries(seo)) {
    const stack = checkCommaStack(v)
    if (stack >= 4) issues.push(`  ⚠ seo.${k}: Komma-Stack mit ${stack} Items`)
    if (k.startsWith('metaDescription') && v.length > 160) issues.push(`  ⚠ seo.${k}: ${v.length} chars > 160 (Google cut-off)`)
  }
  if (issues.length) {
    console.log(`✗ ${slug} (${_id})`)
    issues.forEach(i => console.log(i))
    totalIssues += issues.length
  } else {
    console.log(`✓ ${slug} (${_id}) — clean`)
  }
  patches.push({ patch: { id: _id, set: { seo } } })
}

if (totalIssues > 0) {
  console.error(`\n✗ ${totalIssues} validation issues — fix before apply.`)
  process.exit(1)
}

if (!APPLY) {
  console.log(`\n✓ All ${patches.length} SEO patches clean. Run with --apply to commit.`)
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
