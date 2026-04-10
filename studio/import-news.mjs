/**
 * Import existing news articles + images into Sanity.
 * Run from studio/ directory:
 *   node import-news.mjs
 */

import { createClient } from '@sanity/client'
import { readFileSync, createReadStream } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const ROOT   = join(__dir, '..')

const client = createClient({
  projectId: 'ehwjnjr2',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: false,
  token: process.env.SANITY_TOKEN,
})

// Read articles from i18n.js
const i18nJs = readFileSync(join(ROOT, 'js/i18n.js'), 'utf8')
const articlesStart = i18nJs.indexOf('articles: [')
const articlesEnd   = i18nJs.indexOf('],', articlesStart) + 1
const articlesBlock = i18nJs.slice(articlesStart + 'articles: '.length, articlesEnd)

// Parse via temp ESM module
import { writeFileSync, unlinkSync } from 'fs'
const tmpPath = join(__dir, '_articles_tmp.mjs')
writeFileSync(tmpPath, 'export const articles = ' + articlesBlock)
const { articles } = await import(tmpPath + '?t=' + Date.now())
unlinkSync(tmpPath)

console.log(`Importing ${articles.length} articles…`)

for (const a of articles) {
  // Upload image
  const imgPath = join(ROOT, a.img)
  let imageAsset = null
  try {
    const stream = createReadStream(imgPath)
    imageAsset = await client.assets.upload('image', stream, {
      filename: a.img.split('/').pop(),
    })
    console.log(`  ↑ Uploaded image: ${a.img}`)
  } catch (e) {
    console.warn(`  ⚠ Could not upload image ${a.img}: ${e.message}`)
  }

  const doc = {
    _type: 'newsArticle',
    _id: 'news-' + a.id,
    title: a.title,
    slug: { _type: 'slug', current: a.id },
    language: 'en',
    category: a.category,
    categoryLabel: a.categoryLabel,
    date: a.dateISO,
    alt: a.alt,
    excerpt: a.excerpt,
    content: a.content,
  }

  if (imageAsset) {
    doc.image = { _type: 'image', asset: { _type: 'reference', _ref: imageAsset._id } }
  }

  await client.createOrReplace(doc)
  console.log(`  ✓ ${a.title}`)
}

console.log(`✅ Done — ${articles.length} articles imported.`)
