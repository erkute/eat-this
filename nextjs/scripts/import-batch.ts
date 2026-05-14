/**
 * Phase B batch importer — reads phase_b_ready.json (192 cremeguides-only
 * candidates, READY rows only) and pushes them as Sanity drafts via the
 * `runImportFromParsed` helper from `import-from-url.ts`. Idempotent via the
 * googlePlaceId dedupe inside runImport.
 *
 * Run from `nextjs/`:
 *   npx tsx scripts/import-batch.ts --dry-run --limit 3
 *   npx tsx scripts/import-batch.ts --limit 10
 *   npx tsx scripts/import-batch.ts --start 50 --limit 25
 *   npx tsx scripts/import-batch.ts   # all 184 READY
 *
 * Flags:
 *   --dry-run   don't write to Sanity, just print the resolved doc shape
 *   --limit N   process at most N candidates (default: all)
 *   --start N   skip the first N candidates (1-based, matches JSON order)
 *   --no-photo  skip photo upload (faster dry-runs)
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { ImportError, runImportFromParsed } from './import-from-url'
import { createClient } from '@sanity/client'
import { config as loadEnv } from 'dotenv'

loadEnv({ path: '.env.local' })

const sanity = createClient({
  projectId: 'ehwjnjr2',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
})

interface Candidate {
  nr: number
  title: string
  gmaps_url: string
  cg_url: string
  place_name: string
}

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const noPhoto = args.includes('--no-photo')
function flagInt(name: string, fallback: number): number {
  const idx = args.indexOf(name)
  if (idx < 0) return fallback
  const v = Number(args[idx + 1])
  return Number.isFinite(v) ? v : fallback
}
const limit = flagInt('--limit', Infinity)
const startFrom = flagInt('--start', 0)

// Parse `?query=lat,lng` from the cremeguides-scrape URLs. Falls back to
// `@lat,lng` if someone passes a canonical maps URL.
function parseQueryCoords(url: string): { lat: number; lng: number } | null {
  const m1 = url.match(/[?&]query=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
  if (m1) return { lat: Number(m1[1]), lng: Number(m1[2]) }
  const m2 = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
  if (m2) return { lat: Number(m2[1]), lng: Number(m2[2]) }
  return null
}

async function main() {
  const jsonPath = resolve(process.cwd(), '..', 'scripts/scraper/phase_b_ready.json')
  const all = JSON.parse(readFileSync(jsonPath, 'utf-8')) as Candidate[]

  const window = all.slice(startFrom, Number.isFinite(limit) ? startFrom + limit : undefined)
  console.log(
    `→ Phase B batch: ${window.length} candidate(s) (start=${startFrom}, limit=${limit === Infinity ? 'all' : limit}, dry-run=${dryRun})`,
  )

  let ok = 0
  let skipped = 0
  let failed = 0

  for (const [i, cand] of window.entries()) {
    const idx = startFrom + i + 1
    const label = `[${idx}/${all.length}] #${cand.nr} ${cand.title}`
    const coords = parseQueryCoords(cand.gmaps_url)
    if (!coords) {
      console.error(`  ✗ ${label} — no coords in URL: ${cand.gmaps_url}`)
      failed++
      continue
    }
    const parsed = { name: cand.place_name || cand.title, lat: coords.lat, lng: coords.lng }
    try {
      const result = await runImportFromParsed(parsed, cand.gmaps_url, {
        uploadPhoto: !noPhoto && !dryRun,
      })
      if (dryRun) {
        console.log(
          `  ✓ ${label} → ${result.matchedName} (ortsteil=${result.ortsteil ?? '?'}, place=${result.place.id})`,
        )
        ok++
        continue
      }
      const created = await sanity.create(result.doc)
      const publishedId = created._id.replace(/^drafts\./, '')
      console.log(`  ✓ ${label} → drafts.${publishedId}`)
      ok++
    } catch (err) {
      if (err instanceof ImportError) {
        const isDup = err.message.includes('already exists')
        if (isDup) {
          console.log(`  ↷ ${label} — already in Sanity, skipped`)
          skipped++
        } else {
          console.error(`  ✗ ${label} — ${err.message}`)
          failed++
        }
      } else {
        console.error(`  ✗ ${label} — ${(err as Error).message}`)
        failed++
      }
    }
  }

  console.log(`\n--- Summary: ${ok} ok / ${skipped} skipped / ${failed} failed (of ${window.length}) ---`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
