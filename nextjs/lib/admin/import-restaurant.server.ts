import 'server-only'

import type { SanityClient } from '@sanity/client'

export interface RestaurantImportResult {
  docId: string
  name: string
}

/**
 * Runs the shared enrichment pipeline with the caller's authenticated Sanity
 * client. The client is deliberately injected so the live route never needs a
 * server-side Sanity write token and cannot grant more access than the current
 * Studio user already has.
 */
export async function importRestaurant(
  url: string,
  sanity: SanityClient,
): Promise<RestaurantImportResult> {
  const [
    { runImport },
    { fetchPlaceContext, generateRestaurant },
    { translateRestaurant },
    { generateRestaurantSeo },
  ] = await Promise.all([
    import('@/scripts/import-from-url'),
    import('@/scripts/generate-de-descriptions'),
    import('@/scripts/bootstrap-en-translations'),
    import('@/scripts/generate-seo-fields'),
  ])

  // Places lookup + owner-photo uploads + base document shape.
  const result = await runImport(url, { sanityClient: sanity })

  // Each generator consumes a subset of this shared source projection.
  const generatorSource = {
    _id: result.doc._id,
    name: result.matchedName,
    cuisineType: result.doc.cuisineType as string | undefined,
    shortDescription: result.doc.shortDescription as string | undefined,
    description: result.doc.description as string | undefined,
    district: result.doc.district as string | undefined,
    address: result.doc.address as string | undefined,
    categories: result.categoryNames,
    priceRange: result.doc.priceRange as
      | { min?: number; max?: number; currency?: string }
      | undefined,
    lat: result.doc.lat as number,
    lng: result.doc.lng as number,
    website: result.doc.website as string | undefined,
  }

  let placeContext: Awaited<ReturnType<typeof fetchPlaceContext>> | null = null
  try {
    placeContext = await fetchPlaceContext(
      generatorSource as Parameters<typeof fetchPlaceContext>[0],
    )
  } catch {
    // The description generator has an explicit Sanity-facts-only fallback.
  }

  const description = await generateRestaurant(
    generatorSource as Parameters<typeof generateRestaurant>[0],
    placeContext,
  )

  const sourceWithDescription = {
    ...generatorSource,
    description: description.description,
    shortDescription: description.shortDescription ?? generatorSource.shortDescription,
    tip: description.tip ?? undefined,
  }
  const translation = await translateRestaurant(
    sourceWithDescription as Parameters<typeof translateRestaurant>[0],
  )
  const seo = await generateRestaurantSeo({
    ...sourceWithDescription,
    descriptionEn: translation.descriptionEn ?? undefined,
  } as Parameters<typeof generateRestaurantSeo>[0])

  // Keep the established importer behavior: create the published document so
  // it appears on the site immediately. Personally curated tips stay manual.
  const publishedId = result.doc._id.replace(/^drafts\./, '')
  const finalDoc = {
    ...result.doc,
    _id: publishedId,
    ...(description.description ? { description: description.description } : {}),
    ...(description.shortDescription
      ? { shortDescription: description.shortDescription }
      : {}),
    ...(translation.shortDescriptionEn
      ? { shortDescriptionEn: translation.shortDescriptionEn }
      : {}),
    ...(translation.descriptionEn ? { descriptionEn: translation.descriptionEn } : {}),
    seo: {
      metaTitle: seo.metaTitle,
      metaTitleEn: seo.metaTitleEn,
      metaDescription: seo.metaDescription,
      metaDescriptionEn: seo.metaDescriptionEn,
    },
  }

  const created = await sanity.create(finalDoc)
  return { docId: created._id, name: result.matchedName }
}
