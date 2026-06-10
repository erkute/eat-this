/**
 * Full local restaurant import: Places lookup + photo upload + DE/EN/SEO
 * generation + publish. Secrets stay in nextjs/.env.local and never enter a
 * browser bundle.
 *
 * Run from nextjs/:
 *   npm run import:restaurant -- <google-maps-url>
 */
import { config as loadEnv } from 'dotenv'
import { createClient } from '@sanity/client'
import { runImport, ImportError } from './import-from-url'
import {
  fetchPlaceContext,
  generateRestaurant,
  type PlaceContext,
} from './generate-de-descriptions'
import { translateRestaurant } from './bootstrap-en-translations'
import { generateRestaurantSeo } from './generate-seo-fields'

loadEnv({ path: '.env.local' })

const sanity = createClient({
  projectId: 'ehwjnjr2',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
})

async function main() {
  const url = process.argv.slice(2).find((arg) => !arg.startsWith('--'))
  if (!url) {
    console.error('Usage: npm run import:restaurant -- <google-maps-url>')
    process.exit(1)
  }

  const result = await runImport(url)
  const source = {
    _id: result.doc._id,
    name: result.matchedName,
    cuisineType: result.doc.cuisineType as string | undefined,
    shortDescription: result.doc.shortDescription as string | undefined,
    description: result.doc.description as string | undefined,
    district: result.doc.district as string | undefined,
    address: result.doc.address as string | undefined,
    categories: result.categoryNames,
    priceRange: result.doc.priceRange as { min?: number; max?: number; currency?: string } | undefined,
    lat: result.doc.lat as number,
    lng: result.doc.lng as number,
    website: result.doc.website as string | undefined,
  }

  let placeContext: PlaceContext | null = null
  try {
    placeContext = await fetchPlaceContext(source as Parameters<typeof fetchPlaceContext>[0])
  } catch (err) {
    console.warn(`Places context unavailable: ${(err as Error).message}`)
  }

  const de = await generateRestaurant(
    source as Parameters<typeof generateRestaurant>[0],
    placeContext,
  )
  const withDe = {
    ...source,
    description: de.description,
    shortDescription: de.shortDescription ?? source.shortDescription,
    tip: de.tip ?? undefined,
  }
  const en = await translateRestaurant(withDe as Parameters<typeof translateRestaurant>[0])
  const seo = await generateRestaurantSeo({
    ...withDe,
    descriptionEn: en.descriptionEn ?? undefined,
  } as Parameters<typeof generateRestaurantSeo>[0])

  const publishedId = String(result.doc._id).replace(/^drafts\./, '')
  // Insider tips remain personally curated. The generator's tip may inform
  // the refined short description, but it is deliberately not published.
  const finalDoc = {
    ...result.doc,
    _id: publishedId,
    ...(de.description ? { description: de.description } : {}),
    ...(de.shortDescription ? { shortDescription: de.shortDescription } : {}),
    ...(en.shortDescriptionEn ? { shortDescriptionEn: en.shortDescriptionEn } : {}),
    ...(en.descriptionEn ? { descriptionEn: en.descriptionEn } : {}),
    seo: {
      metaTitle: seo.metaTitle,
      metaTitleEn: seo.metaTitleEn,
      metaDescription: seo.metaDescription,
      metaDescriptionEn: seo.metaDescriptionEn,
    },
  }

  const created = await sanity.create(finalDoc)
  console.log(`Published ${result.matchedName}: ${created._id}`)
  console.log(`Studio: https://eat-this.sanity.studio/structure/restaurant;${created._id}`)
}

main().catch((err) => {
  if (err instanceof ImportError) {
    console.error(err.message)
    if (err.hint) console.error(err.hint)
  } else {
    console.error(err)
  }
  process.exit(1)
})
