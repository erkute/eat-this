import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@sanity/client'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const token = process.env.SANITY_API_WRITE_TOKEN

if (!token) {
  throw new Error('Missing SANITY_API_WRITE_TOKEN in nextjs/.env.local')
}

const client = createClient({
  projectId: 'ehwjnjr2',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token,
  useCdn: false,
})

const ROOT = process.cwd()
const DISH_DIR = path.join(ROOT, 'public', 'pics', 'home-dishes')

const CATEGORY_IMAGES: Record<string, string[]> = {
  breakfast: ['bubar-galette-print.webp', 'sofi-morning-bun.webp'],
  coffee: ['jules-cappuccino.webp'],
  dinner: ['rinderschaufel-print.webp', 'barbasta-sausage.webp'],
  'fast-food': ['allin-single-burger-print.webp', 'uludag-doener-print.webp', 'el-ray-tacos.webp'],
  'fine-dining': ['sardinen-print.webp', 'gazzo-aubergine-print.webp'],
  lunch: ['grilled-cheese-print.webp'],
  pizza: ['the-grain-pizza-print.webp'],
  sweets: ['sofi-morning-bun.webp'],
}

type CategoryDoc = {
  _id: string
  name?: string
  slug: string
  hasHomeImage: boolean
  homeImageCount: number
}

async function uploadImage(filename: string, categorySlug: string) {
  const filePath = path.join(DISH_DIR, filename)
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing local image: ${filePath}`)
  }
  const stream = fs.createReadStream(filePath)
  return client.assets.upload('image', stream, {
    filename,
    contentType: 'image/webp',
    title: `Home category ${categorySlug}: ${filename}`,
  })
}

async function main() {
  const docs = await client.fetch<CategoryDoc[]>(`*[_type == "category" && defined(slug.current)]{
    _id,
    name,
    "slug": slug.current,
    "hasHomeImage": defined(homeImage.asset),
    "homeImageCount": count(homeImages[defined(asset)])
  }`)
  const bySlug = new Map(docs.map((doc) => [doc.slug, doc]))

  for (const [slug, filenames] of Object.entries(CATEGORY_IMAGES)) {
    const doc = bySlug.get(slug)
    if (!doc) {
      console.warn(`Skipping ${slug}: category document not found`)
      continue
    }
    const existingHomeImageCount = doc.homeImageCount ?? 0
    if (doc.hasHomeImage && existingHomeImageCount > 0) {
      console.log(`Skipping ${slug}: Sanity images already exist`)
      continue
    }

    const assets = []
    for (const filename of filenames) {
      const asset = await uploadImage(filename, slug)
      assets.push(asset)
    }

    const images = assets.map((asset, index) => ({
      _key: `${slug.replace(/[^a-z0-9]/g, '')}${index}`,
      _type: 'image',
      asset: { _type: 'reference', _ref: asset._id },
      alt: `${doc.name ?? slug} Food`,
    }))

    const patch = client.patch(doc._id).setIfMissing({
      homeImage: {
        _type: 'image',
        asset: { _type: 'reference', _ref: assets[0]._id },
      },
    })

    if (existingHomeImageCount === 0) {
      patch.set({ homeImages: images })
    }

    await patch.commit()
    console.log(`Imported ${assets.length} image(s) for ${slug}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
