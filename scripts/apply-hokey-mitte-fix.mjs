// Quick fix for Hokey Pokey Mitte: konkrete Uhrzeit "22 Uhr"/"22:00" raus,
// EN-Komma-Stack im letzten Satz aufgelöst.

import fs from 'node:fs'

const PROJECT = 'ehwjnjr2'
const DATASET = 'production'
const TOKEN = process.env.SANITY_TOKEN
const APPLY = process.argv.includes('--apply')

if (!TOKEN) { console.error('Missing SANITY_TOKEN'); process.exit(1) }

const outputs = JSON.parse(fs.readFileSync('/tmp/wave49-hokey-mitte-fix.json', 'utf8'))

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

function validate(label, v) {
  const issues = []
  if (typeof v === 'string') {
    const stack = checkCommaStack(v)
    if (stack >= 4) issues.push(`  ⚠ ${label}: Komma-Stack ${stack}`)
    if (HOURS_TIME.test(v)) issues.push(`  ⚠ ${label}: konkrete Uhrzeit`)
    if (label.includes('metaDescription') && v.length > 160) issues.push(`  ⚠ ${label}: ${v.length} chars > 160`)
  } else if (v && typeof v === 'object') {
    for (const [k, vv] of Object.entries(v)) issues.push(...validate(`${label}.${k}`, vv))
  }
  return issues
}

console.log(`Mode: ${APPLY ? 'APPLY' : 'DRY-RUN'}\n`)
let total = 0
const patches = []
for (const [slug, entry] of Object.entries(outputs)) {
  const { _id, ...fields } = entry
  const issues = []
  for (const [k, v] of Object.entries(fields)) issues.push(...validate(k, v))
  if (issues.length) { console.log(`✗ ${slug}`); issues.forEach(i => console.log(i)); total += issues.length }
  else console.log(`✓ ${slug} — clean`)
  patches.push({ patch: { id: _id, set: fields } })
}
if (total > 0) { console.error(`\n✗ ${total} issues`); process.exit(1) }
if (!APPLY) { console.log(`\n✓ ${patches.length} clean. --apply to commit.`); process.exit(0) }
const URL = `https://${PROJECT}.api.sanity.io/v2024-01-01/data/mutate/${DATASET}?returnIds=true`
const res = await fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` }, body: JSON.stringify({ mutations: patches }) })
const out = await res.json()
if (out.error) { console.error('Sanity error:', JSON.stringify(out.error, null, 2)); process.exit(1) }
console.log(`\n✓ Patched ${out.results.length}. Tx: ${out.transactionId}`)
