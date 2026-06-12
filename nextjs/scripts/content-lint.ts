/**
 * Content-Lint: prüft den Sanity-Bestand auf Pfleglücken, die stille
 * Folgeschäden haben — allen voran Öffnungszeiten, die der Parser nicht
 * versteht (dann fehlt das OpeningHoursSpecification-JSON-LD komplett,
 * ohne dass es jemand merkt).
 *
 * Run from `nextjs/`:
 *   npx tsx scripts/content-lint.ts            # Markdown-Report auf stdout
 *   npx tsx scripts/content-lint.ts --json     # maschinenlesbar
 *   npx tsx scripts/content-lint.ts --links    # zusätzlich Website/Reservierungs-Links per HEAD prüfen (langsam)
 *
 * Liest nur den öffentlichen Datensatz — kein Token nötig.
 */
import { createClient } from '@sanity/client'
import { buildOpeningHoursSpec } from '../lib/map/openingHours'

const client = createClient({
  projectId: 'ehwjnjr2',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
})

interface LintRestaurant {
  slug: string
  name: string
  openingHours?: { days: string; hours: string }[]
  hasImage: boolean
  imageAlt?: string
  descLen?: number
  metaTitle?: string
  metaDescription?: string
  website?: string
  instagramHandle?: string
  reservationUrl?: string
}

const QUERY = `*[_type == "restaurant" && isOpen == true && isClosed != true] | order(slug.current asc) {
  "slug": slug.current,
  name,
  openingHours[] { days, hours },
  "hasImage": defined(image),
  "imageAlt": image.alt,
  "descLen": length(description),
  "metaTitle": seo.metaTitle,
  "metaDescription": seo.metaDescription,
  website,
  instagramHandle,
  reservationUrl
}`

interface Finding {
  check: string
  severity: 'hoch' | 'mittel' | 'info'
  slug: string
  detail: string
}

type LinkResult = 'ok' | 'dead' | 'bot-blocked'

async function checkLink(url: string): Promise<LinkResult> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 10_000)
    // Erst HEAD, bei 405/403 GET probieren — manche Hoster blocken HEAD.
    let r = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal })
    if (r.status === 405 || r.status === 403) {
      r = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctrl.signal })
    }
    clearTimeout(t)
    if (r.ok) return 'ok'
    // 403/429 heißt meist Bot-Schutz (OpenTable & Co.), nicht toter Link —
    // als eigener Befund, damit kein Redakteur funktionierende Links löscht.
    return r.status === 403 || r.status === 429 ? 'bot-blocked' : 'dead'
  } catch {
    return 'dead'
  }
}

async function main() {
  const json = process.argv.includes('--json')
  const links = process.argv.includes('--links')

  const restaurants = await client.fetch<LintRestaurant[]>(QUERY)
  const findings: Finding[] = []

  for (const r of restaurants) {
    if (!r.openingHours || r.openingHours.length === 0) {
      findings.push({ check: 'hours-missing', severity: 'hoch', slug: r.slug, detail: 'keine Öffnungszeiten → kein Open-Badge, kein OpeningHours-JSON-LD' })
    } else if (buildOpeningHoursSpec(r.openingHours).length === 0) {
      const raw = r.openingHours.map(h => `"${h.days} ${h.hours}"`).join(', ')
      findings.push({ check: 'hours-unparseable', severity: 'hoch', slug: r.slug, detail: `Parser versteht ${raw} nicht → JSON-LD fällt still weg` })
    }
    if (!r.metaTitle || !r.metaDescription) {
      findings.push({ check: 'seo-meta-missing', severity: 'mittel', slug: r.slug, detail: `fehlt: ${[!r.metaTitle && 'metaTitle', !r.metaDescription && 'metaDescription'].filter(Boolean).join(', ')}` })
    }
    if ((r.descLen ?? 0) < 350) {
      findings.push({ check: 'description-thin', severity: 'mittel', slug: r.slug, detail: `description nur ${r.descLen ?? 0} Zeichen` })
    }
    if (r.hasImage && !r.imageAlt) {
      findings.push({ check: 'image-alt-missing', severity: 'info', slug: r.slug, detail: 'image.alt leer (Frontend rendert derzeit eh r.name — erst relevant, wenn verdrahtet)' })
    }
    if (!r.website && !r.instagramHandle) {
      findings.push({ check: 'no-external-presence', severity: 'info', slug: r.slug, detail: 'weder website noch instagramHandle gepflegt' })
    }
  }

  if (links) {
    const targets = restaurants.flatMap(r =>
      [r.website && { slug: r.slug, kind: 'website', url: r.website }, r.reservationUrl && { slug: r.slug, kind: 'reservationUrl', url: r.reservationUrl }].filter(Boolean) as { slug: string; kind: string; url: string }[],
    )
    // Begrenzte Parallelität, damit das kein unfreiwilliger Lasttest wird.
    const POOL = 8
    for (let i = 0; i < targets.length; i += POOL) {
      const batch = targets.slice(i, i + POOL)
      const results = await Promise.all(batch.map(async t => ({ t, result: await checkLink(t.url) })))
      for (const { t, result } of results) {
        if (result === 'dead') findings.push({ check: 'dead-link', severity: 'mittel', slug: t.slug, detail: `${t.kind} nicht erreichbar: ${t.url}` })
        if (result === 'bot-blocked') findings.push({ check: 'link-bot-blocked', severity: 'info', slug: t.slug, detail: `${t.kind} blockt automatisierte Checks (403/429) — manuell prüfen: ${t.url}` })
      }
      process.stderr.write(`\rLink-Check ${Math.min(i + POOL, targets.length)}/${targets.length}`)
    }
    process.stderr.write('\n')
  }

  if (json) {
    console.log(JSON.stringify({ checkedRestaurants: restaurants.length, findings }, null, 2))
    return
  }

  const order = { hoch: 0, mittel: 1, info: 2 } as const
  findings.sort((a, b) => order[a.severity] - order[b.severity] || a.check.localeCompare(b.check) || a.slug.localeCompare(b.slug))

  console.log(`# Content-Lint — ${restaurants.length} Restaurants geprüft, ${findings.length} Befunde\n`)
  let lastCheck = ''
  for (const f of findings) {
    if (f.check !== lastCheck) {
      const count = findings.filter(x => x.check === f.check).length
      console.log(`\n## ${f.check} (${f.severity}, ${count}×)\n`)
      lastCheck = f.check
    }
    console.log(`- \`${f.slug}\` — ${f.detail}`)
  }
  if (findings.length === 0) console.log('Keine Befunde — alles gepflegt.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
