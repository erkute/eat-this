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
import { FIRST_PARTY_RESTAURANT_PHOTO_SLUGS } from '../lib/sanity-image-presets'

const client = createClient({
  projectId: 'ehwjnjr2',
  dataset: 'production',
  apiVersion: '2024-01-01',
  // A maintenance lint must reflect the current dataset immediately after
  // editorial fixes; CDN staleness would keep reporting already-fixed issues.
  useCdn: false,
})

interface LintRestaurant {
  slug: string
  name: string
  openingHours?: { days: string; hours: string }[]
  cuisineType?: string
  shortDescription?: string
  tip?: string
  descLen?: number
  metaTitle?: string
  metaDescription?: string
  website?: string
  menuUrl?: string
  instagramHandle?: string
  reservationUrl?: string
  hasHeroPhoto?: boolean
  photoCredit?: string
  photoCreditUrl?: string
  categoryCount: number
  gallery?: {
    assetRef?: string
    alt?: string
    credit?: string
    creditUrl?: string
  }[]
}

const QUERY = `*[_type == "restaurant" && isOpen == true && isClosed != true] | order(slug.current asc) {
  "slug": slug.current,
  name,
  openingHours[] { days, hours },
  cuisineType,
  shortDescription,
  tip,
  "descLen": length(description),
  "metaTitle": seo.metaTitle,
  "metaDescription": seo.metaDescription,
  website,
  menuUrl,
  instagramHandle,
  reservationUrl,
  "hasHeroPhoto": defined(image.asset),
  "photoCredit": image.credit,
  "photoCreditUrl": image.creditUrl,
  "categoryCount": coalesce(count(categories), 0),
  "gallery": gallery[] {
    "assetRef": asset._ref,
    alt,
    credit,
    creditUrl
  }
}`

interface Finding {
  check: string
  severity: 'hoch' | 'mittel' | 'info'
  slug: string
  detail: string
}

type LinkResult = 'ok' | 'dead' | 'bot-blocked' | 'unreachable'

function isHttpUrl(url: string | undefined) {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

async function checkLink(url: string): Promise<LinkResult> {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 10_000)
    // Erst HEAD, bei jedem Fehlerstatus GET probieren — manche Hoster liefern
    // für HEAD sogar 404, obwohl die normale Seite per GET erreichbar ist.
    let r = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal })
    if (!r.ok) {
      r = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctrl.signal })
    }
    clearTimeout(t)
    if (r.ok) return 'ok'
    // Nur explizite "weg"-Antworten sind ein belastbarer Dead-Link-Befund.
    // 403/429 heißt meist Bot-Schutz (OpenTable & Co.), nicht toter Link —
    // als eigener Befund, damit kein Redakteur funktionierende Links löscht.
    if (r.status === 404 || r.status === 410) return 'dead'
    return r.status === 401 || r.status === 403 || r.status === 429 ? 'bot-blocked' : 'unreachable'
  } catch {
    // DNS-, TLS- und Timeout-Fehler können lokal oder temporär sein. Sie sind
    // ein Prüfhinweis, aber kein Beleg dafür, dass die Zielseite verschwunden ist.
    return 'unreachable'
  }
}

async function main() {
  const json = process.argv.includes('--json')
  const links = process.argv.includes('--links')

  const restaurants = await client.fetch<LintRestaurant[]>(QUERY)
  const findings: Finding[] = []
  const firstPartyPhotoSlugs = new Set<string>(FIRST_PARTY_RESTAURANT_PHOTO_SLUGS)

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
    if (!r.cuisineType) {
      findings.push({ check: 'cuisine-type-missing', severity: 'mittel', slug: r.slug, detail: 'cuisineType fehlt → schwächt Suche und strukturierte Detailseiten-Fakten' })
    }
    if (!r.shortDescription) {
      findings.push({ check: 'short-description-missing', severity: 'mittel', slug: r.slug, detail: 'shortDescription fehlt → keine kompakte Vorschau' })
    }
    if (!r.tip) {
      findings.push({ check: 'tip-missing', severity: 'info', slug: r.slug, detail: 'Insider-Tipp fehlt im Map-Popup' })
    }
    if (!r.website && !r.instagramHandle) {
      findings.push({ check: 'no-external-presence', severity: 'info', slug: r.slug, detail: 'weder website noch instagramHandle gepflegt' })
    }
    if (r.categoryCount === 0) {
      findings.push({ check: 'categories-missing', severity: 'hoch', slug: r.slug, detail: 'keine Kategorie → fehlt auf allen Kategorie-Hubs und in Category-Entitlements' })
    }
    const hasAttributionFallback = firstPartyPhotoSlugs.has(r.slug) || !!r.instagramHandle
    if (r.hasHeroPhoto && !hasAttributionFallback && (!r.photoCredit || !isHttpUrl(r.photoCreditUrl))) {
      findings.push({
        check: 'hero-attribution-missing',
        severity: 'hoch',
        slug: r.slug,
        detail: `${!r.photoCredit ? 'photoCredit fehlt' : ''}${!r.photoCredit && !isHttpUrl(r.photoCreditUrl) ? ', ' : ''}${!isHttpUrl(r.photoCreditUrl) ? 'photoCreditUrl fehlt/ungueltig' : ''}`,
      })
    }
    if (r.gallery?.length) {
      const seen = new Set<string>()
      const duplicateRefs = new Set<string>()
      let missingAlt = 0
      let missingCredit = 0
      let missingCreditUrl = 0
      for (const image of r.gallery) {
        if (image.assetRef && seen.has(image.assetRef)) duplicateRefs.add(image.assetRef)
        if (image.assetRef) seen.add(image.assetRef)
        if (!image.alt) missingAlt++
        if (!image.credit) missingCredit++
        if (!isHttpUrl(image.creditUrl)) missingCreditUrl++
      }
      if (duplicateRefs.size) {
        findings.push({
          check: 'gallery-duplicate-assets',
          severity: 'mittel',
          slug: r.slug,
          detail: `${duplicateRefs.size} Bild${duplicateRefs.size === 1 ? '' : 'er'} mehrfach in gallery referenziert`,
        })
      }
      if (missingAlt) {
        findings.push({ check: 'gallery-alt-missing', severity: 'mittel', slug: r.slug, detail: `${missingAlt} Galerie-Bild${missingAlt === 1 ? '' : 'er'} ohne Alt-Text` })
      }
      if (missingCredit || missingCreditUrl) {
        findings.push({
          check: 'gallery-attribution-missing',
          severity: 'hoch',
          slug: r.slug,
          detail: `${missingCredit} ohne Credit, ${missingCreditUrl} ohne Credit-URL`,
        })
      }
    }
  }

  if (links) {
    const targets = restaurants.flatMap(r =>
      [
        r.website && { slug: r.slug, kind: 'website', url: r.website },
        r.menuUrl && { slug: r.slug, kind: 'menuUrl', url: r.menuUrl },
        r.reservationUrl && { slug: r.slug, kind: 'reservationUrl', url: r.reservationUrl },
      ].filter(Boolean) as { slug: string; kind: string; url: string }[],
    )
    // Begrenzte Parallelität, damit das kein unfreiwilliger Lasttest wird.
    const POOL = 8
    for (let i = 0; i < targets.length; i += POOL) {
      const batch = targets.slice(i, i + POOL)
      const results = await Promise.all(batch.map(async t => ({ t, result: await checkLink(t.url) })))
      for (const { t, result } of results) {
        if (result === 'dead') findings.push({ check: 'dead-link', severity: 'mittel', slug: t.slug, detail: `${t.kind} liefert 404/410: ${t.url}` })
        if (result === 'bot-blocked') findings.push({ check: 'link-bot-blocked', severity: 'info', slug: t.slug, detail: `${t.kind} blockt automatisierte Checks (403/429) — manuell prüfen: ${t.url}` })
        if (result === 'unreachable') findings.push({ check: 'link-unreachable', severity: 'info', slug: t.slug, detail: `${t.kind} technisch nicht prüfbar — manuell prüfen: ${t.url}` })
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
