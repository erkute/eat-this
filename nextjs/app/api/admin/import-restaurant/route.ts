/**
 * One-shot restaurant import endpoint for the Sanity Studio
 * "Import Restaurant" tool. Takes a maps URL, resolves it through Places,
 * uploads the photo asset, runs the three LLM generators (DE description,
 * EN translation, SEO meta), creates the Sanity draft, and returns the
 * draft id so the tool can navigate to it.
 *
 * Auth: shared `IMPORT_SECRET` env var, sent by Studio as
 * `Authorization: Bearer <secret>`. Studio reads the same secret from
 * `SANITY_STUDIO_IMPORT_SECRET`. Without a matching secret the route
 * returns 401, no exceptions.
 *
 * Cost per call: ~$0.05 (Places + 3× Sonnet). Latency: ~25–45 s.
 */
import { createClient } from '@sanity/client'
import { NextRequest, NextResponse } from 'next/server'
import { runImport, ImportError } from '@/scripts/import-from-url'
import {
  fetchPlaceContext,
  generateRestaurant,
  type PlaceContext,
} from '@/scripts/generate-de-descriptions'
import { translateRestaurant } from '@/scripts/bootstrap-en-translations'
import { generateRestaurantSeo } from '@/scripts/generate-seo-fields'

// Allow long-running enrichment (Places + photo + 3× Sonnet ≈ 25–45 s on a
// good day). Default Vercel/Firebase serverless timeouts vary; the explicit
// hint surfaces in build output and avoids silent 504s on slow LLM calls.
export const maxDuration = 120

const IMPORT_SECRET = process.env.IMPORT_SECRET

const sanity = createClient({
  projectId: 'ehwjnjr2',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
})

const ALLOWED_STUDIO_ORIGINS = new Set([
  'https://eat-this.sanity.studio',
  'http://localhost:3333',
])

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false
  if (ALLOWED_STUDIO_ORIGINS.has(origin)) return true
  // Sanity dev sometimes binds to other localhost ports.
  return /^http:\/\/localhost:\d+$/.test(origin)
}

function corsHeaders(origin: string | null): Record<string, string> {
  if (!isAllowedOrigin(origin)) return {}
  return {
    'Access-Control-Allow-Origin': origin!,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request.headers.get('origin')),
  })
}

export async function POST(request: NextRequest) {
  const cors = corsHeaders(request.headers.get('origin'))

  if (!IMPORT_SECRET) {
    return NextResponse.json(
      { error: 'IMPORT_SECRET is not configured on the server.' },
      { status: 500, headers: cors },
    )
  }

  if (request.headers.get('authorization') !== `Bearer ${IMPORT_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401, headers: cors })
  }

  let body: { url?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400, headers: cors })
  }
  const url = body.url?.trim()
  if (!url) {
    return NextResponse.json({ error: 'Field `url` is required.' }, { status: 400, headers: cors })
  }

  try {
    // Step 1 — Places lookup + photo asset upload + base doc shape
    const result = await runImport(url)

    // Build a generator-source view over the in-memory doc. Each LLM script
    // declares its own RestaurantSource shape (subset of the full doc); a
    // single typed projection covers all three.
    const generatorSource = {
      _id: result.doc._id,
      name: result.matchedName,
      cuisineType: result.doc.cuisineType as string | undefined,
      shortDescription: result.doc.shortDescription as string | undefined,
      description: result.doc.description as string | undefined,
      district: result.doc.district as string | undefined,
      address: result.doc.address as string | undefined,
      // LLM prompts read category *names* (e.g. "Coffee, Pizza") for tone/context.
      // The doc itself carries the matching references.
      categories: result.categoryNames,
      priceRange: result.doc.priceRange as { min?: number; max?: number; currency?: string } | undefined,
      lat: result.doc.lat as number,
      lng: result.doc.lng as number,
      website: result.doc.website as string | undefined,
    }

    // Step 2 — DE description (+ tip + refined shortDescription).
    // Re-fetch place context with the full FieldMask the descriptions prompt
    // expects (rating, reviews, etc) — runImport's mask is leaner.
    let placeContext: PlaceContext | null = null
    try {
      placeContext = await fetchPlaceContext(generatorSource as unknown as Parameters<typeof fetchPlaceContext>[0])
    } catch (err) {
      console.warn('[import-restaurant] places-context fetch failed:', (err as Error).message)
    }
    const descGen = await generateRestaurant(generatorSource as unknown as Parameters<typeof generateRestaurant>[0], placeContext)

    const sourceWithDesc = {
      ...generatorSource,
      description: descGen.description,
      shortDescription: descGen.shortDescription ?? generatorSource.shortDescription,
      tip: descGen.tip ?? undefined,
    }

    // Step 3 — EN translations
    const transGen = await translateRestaurant(sourceWithDesc as unknown as Parameters<typeof translateRestaurant>[0])

    // Step 4 — SEO meta (DE + EN)
    const sourceForSeo = {
      ...sourceWithDesc,
      descriptionEn: transGen.descriptionEn ?? undefined,
    }
    const seoGen = await generateRestaurantSeo(sourceForSeo as unknown as Parameters<typeof generateRestaurantSeo>[0])

    // Assemble the final doc — runImport already produced a `drafts.<uuid>`
    // _id; layer the LLM additions on top and create the draft directly.
    //
    // tip / tipEn are deliberately NOT layered in: the brand position is that
    // insider tips are personally curated, not LLM-derived. The tip generator
    // still runs (to feed shortDescription refinement) but its output is
    // discarded here. Same logic for the API path that user-facing imports
    // hit; the CLI path can still call generateRestaurant directly if needed.
    const finalDoc = {
      ...result.doc,
      ...(descGen.description ? { description: descGen.description } : {}),
      ...(descGen.shortDescription ? { shortDescription: descGen.shortDescription } : {}),
      ...(transGen.shortDescriptionEn ? { shortDescriptionEn: transGen.shortDescriptionEn } : {}),
      ...(transGen.descriptionEn ? { descriptionEn: transGen.descriptionEn } : {}),
      seo: {
        metaTitle: seoGen.metaTitle,
        metaTitleEn: seoGen.metaTitleEn,
        metaDescription: seoGen.metaDescription,
        metaDescriptionEn: seoGen.metaDescriptionEn,
      },
    }

    const created = await sanity.create(finalDoc)

    return NextResponse.json(
      { docId: created._id, name: result.matchedName },
      { headers: cors },
    )
  } catch (err) {
    if (err instanceof ImportError) {
      return NextResponse.json(
        { error: err.message, hint: err.hint },
        { status: 400, headers: cors },
      )
    }
    console.error('[import-restaurant]', err)
    return NextResponse.json(
      { error: (err as Error).message ?? 'Unknown error' },
      { status: 500, headers: cors },
    )
  }
}
