/**
 * Import existing must-eat card images into Sanity.
 * Since cards currently only have images (no metadata), each card gets
 * placeholder dish/restaurant fields — fill them in via the Studio UI afterwards.
 *
 * Run from studio/ directory:
 *   node import-musteats.mjs
 */

import { createClient } from '@sanity/client'
import { createReadStream, readdirSync } from 'fs'
import { join, dirname, extname, basename } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const ROOT   = join(__dir, '..')
const IMGS   = join(ROOT, 'pics/musteats')

const client = createClient({
  projectId: 'ehwjnjr2',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_TOKEN,
})

// Sort images: Main.png first, then Main-1.png … Main-19.png
const files = readdirSync(IMGS)
  .filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f) && !f.startsWith('.'))
  .sort((a, b) => {
    const numA = a.match(/-(\d+)\./)?.[1] ?? -1
    const numB = b.match(/-(\d+)\./)?.[1] ?? -1
    return Number(numA) - Number(numB)
  })

console.log(`Importing ${files.length} must-eat cards…`)

for (let i = 0; i < files.length; i++) {
  const file = files[i]
  const filePath = join(IMGS, file)

  // Upload image
  let imageAsset
  try {
    imageAsset = await client.assets.upload('image', createReadStream(filePath), {
      filename: file,
    })
    console.log(`  ↑ Uploaded: ${file}`)
  } catch (e) {
    console.warn(`  ⚠ Could not upload ${file}: ${e.message}`)
    continue
  }

  const slug = basename(file, extname(file)).toLowerCase()
  const doc = {
    _type: 'mustEat',
    _id: 'mustead-' + slug,
    dish: `Dish ${i + 1}`,           // ← fill in via Studio
    restaurant: 'Restaurant Name',    // ← fill in via Studio
    district: '',
    price: '',
    order: i,
    image: { _type: 'image', asset: { _type: 'reference', _ref: imageAsset._id } },
  }

  await client.createOrReplace(doc)
  console.log(`  ✓ Card ${i + 1}/${files.length}`)
}

console.log(`✅ Done — ${files.length} must-eat cards imported.`)
console.log('📝 Open the Sanity Studio to fill in dish names and restaurants.')
