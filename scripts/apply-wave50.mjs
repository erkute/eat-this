// Applies Wave 50 score-8 fixes from /tmp/wave50-outputs.json.
// Validator: Komma-Stack ≤3, keine konkrete Uhrzeit, kein Drittstimme/Lieferung,
// metaDescription ≤160 chars, description ≤650 chars (Ziel; warning at 651-700, fail >700).

import fs from 'node:fs'

const PROJECT = 'ehwjnjr2'
const DATASET = 'production'
const TOKEN = process.env.SANITY_TOKEN
const APPLY = process.argv.includes('--apply')

if (!TOKEN) { console.error('Missing SANITY_TOKEN'); process.exit(1) }

const outputs = JSON.parse(fs.readFileSync('/tmp/wave50-outputs.json', 'utf8'))

function checkCommaStack(text) {
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

function validate(label, v) {
  const issues = []
  if (typeof v === 'string') {
    const stack = checkCommaStack(v)
    if (stack >= 4) issues.push(`  ⚠ ${label}: Komma-Stack ${stack}`)
    if (HOURS_TIME.test(v)) issues.push(`  ⚠ ${label}: konkrete Uhrzeit`)
    if (DELIVERY_RE.test(v)) issues.push(`  ⚠ ${label}: Drittstimme/Lieferung-Trigger`)
    if (label === 'description' || label === 'descriptionEn') {
      if (v.length > 700) issues.push(`  ⚠ ${label}: ${v.length} chars > 700 cap`)
      else if (v.length > 650) issues.push(`  ℹ ${label}: ${v.length} chars > 650 target (warning)`)
    }
    if (label.includes('metaDescription') && v.length > 160) issues.push(`  ⚠ ${label}: ${v.length} chars > 160`)
  } else if (v && typeof v === 'object') {
    for (const [k, vv] of Object.entries(v)) issues.push(...validate(`${label}.${k}`, vv))
  }
  return issues
}

console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN + VALIDATE'}\n`)
let hardIssues = 0
const patches = []
for (const [slug, entry] of Object.entries(outputs)) {
  const { _id, ...fields } = entry
  const issues = []
  for (const [k, v] of Object.entries(fields)) issues.push(...validate(k, v))
  // ℹ = soft, ⚠ = hard
  const hard = issues.filter(i => i.includes('⚠')).length
  hardIssues += hard
  if (issues.length) { console.log(`${hard ? '✗' : '~'} ${slug}`); issues.forEach(i => console.log(i)) }
  else console.log(`✓ ${slug} — clean`)
  patches.push({ patch: { id: _id, set: fields } })
}
if (hardIssues > 0) { console.error(`\n✗ ${hardIssues} hard issues — fix before apply.`); process.exit(1) }
if (!APPLY) { console.log(`\n✓ ${patches.length} patches clean (soft warnings OK). --apply to commit.`); process.exit(0) }
const URL = `https://${PROJECT}.api.sanity.io/v2024-01-01/data/mutate/${DATASET}?returnIds=true`
const res = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` }, body: JSON.stringify({ mutations: patches }) })
const out = await res.json()
if (out.error) { console.error('Sanity error:', JSON.stringify(out.error, null, 2)); process.exit(1) }
console.log(`\n✓ Patched ${out.results.length}. Tx: ${out.transactionId}`)
