// Audit aller Restaurant-Descriptions in Sanity gegen den Bar-Basta-Bar
// (Voice-B Curator-Voice + Bar-Basta-Lessons).
//
// Usage:
//   set -a; source scripts/.env.local; set +a
//   node scripts/audit-descriptions.mjs
//
// Output:
//   scripts/audit-out/restaurant-audit.json   — voller Report
//   scripts/audit-out/restaurant-audit.md     — ranked Top-Liste

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const PROJECT = 'ehwjnjr2'
const DATASET = 'production'
const TOKEN = process.env.SANITY_TOKEN

if (!TOKEN) {
  console.error('Missing SANITY_TOKEN — set via scripts/.env.local')
  process.exit(1)
}

// GROQ: alle Restaurants, die nicht permanent geschlossen sind.
// Wir holen alles, was für die Qualitätsprüfung + spätere Rewrite-Pipeline nötig ist.
const QUERY = `*[_type == "restaurant" && isOpen == true && isClosed != true]{
  _id,
  name,
  "slug": slug.current,
  cuisineType,
  shortDescription,
  shortDescriptionEn,
  description,
  descriptionEn,
  tip,
  tipEn,
  address,
  district,
  "bezirk": bezirkRef->name,
  mapsUrl,
  website,
  instagramHandle,
  lastReviewed,
  openingHours
} | order(name asc)`

const URL = `https://${PROJECT}.api.sanity.io/v2024-01-01/data/query/${DATASET}?query=${encodeURIComponent(QUERY)}`

console.log('Querying Sanity…')
const res = await fetch(URL, { headers: { Authorization: `Bearer ${TOKEN}` } })
if (!res.ok) {
  console.error(`Sanity ${res.status}: ${await res.text()}`)
  process.exit(1)
}
const { result: restaurants } = await res.json()
console.log(`→ ${restaurants.length} Restaurants geladen.`)

// ─── Heuristics ─────────────────────────────────────────────────────────
// Bar-Basta-Lessons + Curator-Voice. Severity-Gewichte addieren sich zum
// Restaurant-Score. Höherer Score = dringender Rewrite.

const HALLUCINATION_PHRASES = [
  // Verbatim-Beispiele aus dem Bar-Basta-Diff
  { re: /verkupplet|verkuppelt/i, weight: 8, label: 'Voice-Slip "verkupplet"' },
  { re: /\bsauber:\s/i, weight: 4, label: 'Filler-Slang "sauber:"' },
  { re: /einfach umwerfend/i, weight: 3, label: 'Klischee "einfach umwerfend"' },
  { re: /pr[äa]zise(n)? Cocktails?/i, weight: 3, label: 'Klischee "präzise Cocktails"' },
  { re: /knaller|krass\b/i, weight: 3, label: 'Slang-Adverb "knaller/krass"' },
  // Komma-Stack-Klischees
  { re: /(italien|berlin)\w*\s+(l[äa]ssigkeit|coolness)/i, weight: 5, label: 'Klischee-Paarung Italien/Berlin-Lässigkeit' },
  { re: /angehauchte[rn]?\b/i, weight: 3, label: 'Empty-Modifier "angehaucht"' },
  { re: /(asiatisch|italienisch|levantinisch|mediterran)\s+inspiriert/i, weight: 3, label: 'Empty-Modifier "X-inspiriert"' },
  { re: /etwas Buntes f[üu]r d[üu]ster/i, weight: 4, label: 'Editorial-Lift aus tip Berlin' },
  // Drittstimmen / Delivery (Curator-Voice-Verbot)
  { re: /lieferdienst|lieferung|deliveroo|wolt|uber\s*eats|lieferando/i, weight: 5, label: 'Drittstimme/Delivery erwähnt' },
  { re: /(empfehlen|raten)\s+(wir|ich|sie|euch)/i, weight: 2, label: 'Reader-Voice ("wir empfehlen…")' },
  // All-Day-Inflation
  { re: /\b(all[\s-]?day|ganzt[äa]gig|ganztags|durchgehend|non[\s-]?stop)\b/i, weight: 3, label: 'All-Day-Claim (Hours veraltet?)' },
]

// Konkrete Hours sind Drift-Risiko: 7:30, 18 Uhr, ab 12, bis 1 Uhr, etc.
const HOURS_TIME = /\b\d{1,2}([:.]\d{2}|\s*uhr|\s*Uhr|h\b)/

function checkCommaStack(text) {
  // Längster Komma-getrennter Stack (Items zwischen Punkten, getrennt durch Kommata).
  // ≥4 Items = Voice-Verstoß.
  let worst = 0
  const sentences = text.split(/[.!?]\s+/)
  for (const s of sentences) {
    const parts = s.split(/,\s+/).filter(Boolean)
    // Nur Stacks innerhalb eines Satzes zählen (parts ≥4 = ≥3 Kommata)
    if (parts.length > worst) worst = parts.length
  }
  return worst
}

function analyseDescription(d) {
  const issues = []
  let score = 0

  if (!d) {
    return { issues: ['Keine Description'], score: 100, length: 0 }
  }
  const length = d.length

  // Length-Tier
  if (length < 200) {
    issues.push(`Zu kurz (${length} Zeichen, Ziel 500–650)`)
    score += 8
  } else if (length < 400) {
    issues.push(`Eher kurz (${length} Zeichen, Ziel 500–650)`)
    score += 3
  } else if (length > 700) {
    issues.push(`Über Schema-Cap (${length} > 700)`)
    score += 10
  } else if (length > 650) {
    issues.push(`Knapp am Cap (${length}, Ziel ≤650)`)
    score += 1
  }

  // Komma-Stack
  const stack = checkCommaStack(d)
  if (stack >= 6) {
    issues.push(`Komma-Stack mit ${stack} Items (max 3)`)
    score += 6
  } else if (stack >= 4) {
    issues.push(`Komma-Stack mit ${stack} Items (max 3)`)
    score += 3
  }

  // Halluzinations-/Klischee-Phrases
  for (const p of HALLUCINATION_PHRASES) {
    if (p.re.test(d)) {
      issues.push(p.label)
      score += p.weight
    }
  }

  // Konkrete Hours im Fließtext (Drift-Risiko)
  if (HOURS_TIME.test(d)) {
    issues.push('Konkrete Uhrzeit im Text (Drift-Risiko)')
    score += 2
  }

  return { issues, score, length }
}

// ─── Audit pass ─────────────────────────────────────────────────────────

const report = restaurants.map(r => {
  const de = analyseDescription(r.description)
  const en = r.descriptionEn ? analyseDescription(r.descriptionEn) : null

  const flags = {
    missingShort: !r.shortDescription,
    missingDescription: !r.description,
    missingTip: !r.tip,
    missingAddress: !r.address,
    missingBezirk: !r.bezirk,
    missingMapsUrl: !r.mapsUrl,
    missingWebsite: !r.website && !r.instagramHandle,
    // EN-Coverage
    missingDescriptionEn: !!r.description && !r.descriptionEn,
  }
  const flagsCount = Object.values(flags).filter(Boolean).length

  const totalScore = de.score + (en?.score || 0) + flagsCount * 1

  return {
    name: r.name,
    slug: r.slug,
    bezirk: r.bezirk || r.district || null,
    cuisineType: r.cuisineType || null,
    lengthDe: de.length,
    lengthEn: en?.length || 0,
    score: totalScore,
    issuesDe: de.issues,
    issuesEn: en?.issues || [],
    flags,
    hasWebsite: !!r.website,
    hasInstagram: !!r.instagramHandle,
    hasMapsUrl: !!r.mapsUrl,
    lastReviewed: r.lastReviewed || null,
  }
})

report.sort((a, b) => b.score - a.score)

// ─── Aggregates ─────────────────────────────────────────────────────────

const stats = {
  total: report.length,
  missingDescription: report.filter(r => r.flags.missingDescription).length,
  missingShortDescription: report.filter(r => r.flags.missingShort).length,
  missingTip: report.filter(r => r.flags.missingTip).length,
  missingDescriptionEn: report.filter(r => r.flags.missingDescriptionEn).length,
  missingAddress: report.filter(r => r.flags.missingAddress).length,
  missingBezirk: report.filter(r => r.flags.missingBezirk).length,
  highScore: report.filter(r => r.score >= 10).length, // dringend
  midScore: report.filter(r => r.score >= 5 && r.score < 10).length,
  clean: report.filter(r => r.score === 0).length,
}

// ─── Write outputs ──────────────────────────────────────────────────────

const OUT_DIR = path.join(__dirname, 'audit-out')
fs.mkdirSync(OUT_DIR, { recursive: true })

fs.writeFileSync(
  path.join(OUT_DIR, 'restaurant-audit.json'),
  JSON.stringify({ stats, report }, null, 2)
)

// Markdown-Top-Liste
const topN = report.slice(0, 50)
const md = [
  '# Restaurant Description Audit',
  '',
  `Stand: ${new Date().toISOString().slice(0, 10)} · ${stats.total} Restaurants (isOpen && !isClosed)`,
  '',
  '## Aggregate',
  '',
  `- **Dringend** (Score ≥ 10): ${stats.highScore}`,
  `- **Mittel** (Score 5–9): ${stats.midScore}`,
  `- **Sauber** (Score 0): ${stats.clean}`,
  `- Keine DE-Description: ${stats.missingDescription}`,
  `- Keine Short-Description: ${stats.missingShortDescription}`,
  `- Kein Insider-Tip: ${stats.missingTip}`,
  `- Keine EN-Description (obwohl DE da): ${stats.missingDescriptionEn}`,
  `- Keine Adresse: ${stats.missingAddress}`,
  `- Kein Bezirk: ${stats.missingBezirk}`,
  '',
  '## Top 50 nach Rewrite-Priorität',
  '',
  '| # | Restaurant | Bezirk | Score | Länge | Issues |',
  '|---|---|---|---|---|---|',
  ...topN.map((r, i) => {
    const issues = [...new Set([...r.issuesDe, ...r.issuesEn])].slice(0, 3).join('; ') || '—'
    return `| ${i + 1} | ${r.name} | ${r.bezirk || '?'} | ${r.score} | ${r.lengthDe} | ${issues} |`
  }),
].join('\n')

fs.writeFileSync(path.join(OUT_DIR, 'restaurant-audit.md'), md)

console.log('')
console.log('=== Aggregate ===')
console.log(`Total:              ${stats.total}`)
console.log(`Dringend (≥10):     ${stats.highScore}`)
console.log(`Mittel  (5–9):      ${stats.midScore}`)
console.log(`Sauber  (0):        ${stats.clean}`)
console.log(`Ohne DE-Desc:       ${stats.missingDescription}`)
console.log(`Ohne EN-Desc:       ${stats.missingDescriptionEn}`)
console.log(`Ohne Tip:           ${stats.missingTip}`)
console.log('')
console.log('=== Top 10 ===')
report.slice(0, 10).forEach((r, i) => {
  const issues = [...new Set([...r.issuesDe, ...r.issuesEn])].slice(0, 2).join('; ') || '—'
  console.log(`${(i + 1).toString().padStart(2)}. [${r.score.toString().padStart(3)}] ${r.name.padEnd(34)} ${issues}`)
})
console.log('')
console.log(`Reports: scripts/audit-out/restaurant-audit.{json,md}`)
