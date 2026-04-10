/**
 * Import restaurants from the existing app.js spots array into Sanity.
 * Run from the studio/ directory:
 *   node import-restaurants.mjs
 */

import { createClient } from '@sanity/client'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))

const client = createClient({
  projectId: 'ehwjnjr2',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_TOKEN,
})

// Parse spots by importing the data file directly.
// We extract the raw array as a JS module-compatible string.
const appJs = readFileSync(join(__dir, '../js/app.js'), 'utf8')
const startIdx = appJs.indexOf('const spots = [')
const endIdx   = appJs.indexOf('];', startIdx) + 2
const spotsLiteral = appJs.slice(startIdx, endIdx)

// Write a tiny temp ESM file so Node can parse it natively
import { writeFileSync, unlinkSync } from 'fs'
const tmpPath = join(__dir, '_spots_tmp.mjs')
writeFileSync(tmpPath, spotsLiteral + '\nexport { spots }')
const { spots } = await import(tmpPath + '?t=' + Date.now())
unlinkSync(tmpPath)

console.log(`Importing ${spots.length} restaurants…`)

// Split into batches of 50 (Sanity transaction limit)
function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

function toId(name) {
  return 'restaurant-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

let total = 0
for (const batch of chunk(spots, 50)) {
  const tx = client.transaction()
  for (const s of batch) {
    tx.createOrReplace({
      _type: 'restaurant',
      _id: toId(s.name),
      name: s.name,
      district: s.district || '',
      address: s.address || '',
      categories: s.categories || [],
      price: s.price || '',
      lat: s.lat,
      lng: s.lng,
      mapsUrl: s.mapsUrl || '',
      website: s.website || '',
    })
  }
  await tx.commit()
  total += batch.length
  console.log(`  ✓ ${total}/${spots.length}`)
}

console.log(`✅ Done — ${total} restaurants imported.`)
