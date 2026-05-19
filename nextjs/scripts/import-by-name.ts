/**
 * Imports a restaurant by name + lat/lng (skipping the Google-Maps URL parser
 * in import-from-url.ts). Useful when you have the canonical name and a
 * geocoded address but no shareable maps link — e.g. a Michelin Guide entry.
 *
 * Run from `nextjs/`:
 *   npx tsx scripts/import-by-name.ts "<name>" <lat> <lng>
 *   npx tsx scripts/import-by-name.ts "<name>" <lat> <lng> --dry-run
 */
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })

import { createClient } from '@sanity/client'
import { runImportFromParsed, ImportError } from './import-from-url'

const sanity = createClient({
  projectId: 'ehwjnjr2',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
})

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const positional = args.filter(a => !a.startsWith('--'))
  const [name, latStr, lngStr] = positional
  if (!name || !latStr || !lngStr) {
    console.error('Usage: npx tsx scripts/import-by-name.ts "<name>" <lat> <lng> [--dry-run]')
    process.exit(1)
  }
  const lat = Number(latStr)
  const lng = Number(lngStr)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error(`Invalid lat/lng: ${latStr},${lngStr}`)
  }

  const fakeUrl = `https://www.google.com/maps/place/${encodeURIComponent(name)}/@${lat},${lng},17z`
  console.log(`→ Search: "${name}" @ ${lat},${lng}`)
  let result
  try {
    result = await runImportFromParsed({ name, lat, lng }, fakeUrl, { uploadPhoto: !dryRun })
  } catch (err) {
    if (err instanceof ImportError) {
      console.error(`✗ ${err.message}`)
      if (err.hint) console.error(`  ${err.hint}`)
      process.exit(1)
    }
    throw err
  }

  console.log(`  matched: ${result.matchedName} (id=${result.place.id})`)
  if (result.place.types?.length) console.log(`  types:   ${result.place.types.slice(0, 4).join(', ')}`)
  if (result.ortsteil) {
    console.log(`  ortsteil: ${result.ortsteil}${result.bezirkRefId ? ` → ref ${result.bezirkRefId}` : ' (no bezirk doc)'}`)
  }
  if (result.photoAsset) console.log(`  photo:    uploaded ${result.photoAsset._id}`)
  else if (result.place.photos?.length) console.log(`  photo:    ${dryRun ? 'skipped (--dry-run)' : 'failed'}`)
  else console.log(`  photo:    none on Places`)

  console.log(`\n→ Draft preview:\n${JSON.stringify(result.doc, null, 2)}\n`)

  if (dryRun) {
    console.log('--dry-run: skipping Sanity write')
    return
  }

  const created = await sanity.create(result.doc)
  const publishedId = created._id.replace(/^drafts\./, '')
  console.log(`✓ Draft created: ${created._id}`)
  console.log(`  Studio: https://eat-this.sanity.studio/structure/restaurant;${publishedId}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
