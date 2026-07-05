/**
 * LOCAL-ONLY restaurant import endpoint for the Sanity Studio
 * "Import Restaurant" tool. Takes a Maps URL, resolves it through Places,
 * uploads the photo asset, runs the three LLM generators (DE description,
 * EN translation, SEO meta), creates the published doc, and returns its id
 * so the tool can navigate to it.
 *
 * SECURITY MODEL — why this needs no bearer secret:
 * The previous `/api/admin/import-restaurant` route guarded itself with a
 * shared `IMPORT_SECRET` that had to be baked into the deployed Studio
 * browser bundle (`SANITY_STUDIO_IMPORT_SECRET`). That leaked an admin
 * write-token to anyone who loaded the public bundle, so it was removed in
 * the 2026-06-10 security hardening.
 *
 * This replacement is DEAD IN PRODUCTION: the guard below returns 404 unless
 * NODE_ENV === 'development'. It only ever runs on a developer's localhost,
 * where the Sanity write token + Google + Anthropic keys already live in
 * `nextjs/.env.local`. Nothing sensitive ships to any browser or server.
 * Because the only place it works is the machine that already holds every
 * secret, there is no privilege to protect with an auth token.
 *
 * Cost per call: ~$0.05 (Places + 3× LLM). Latency: ~25–45 s.
 */
import { NextRequest, NextResponse } from 'next/server'

// Allow long-running enrichment (Places + photo + 3× LLM ≈ 25–45 s).
export const maxDuration = 120

/** Hard kill-switch: this route must never function outside local dev. */
const IS_DEV = process.env.NODE_ENV === 'development'

/** Dev studio binds to localhost on assorted ports — allow any of them. */
function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !/^http:\/\/localhost:\d+$/.test(origin)) return {}
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

export async function OPTIONS(request: NextRequest) {
  if (!IS_DEV) return new NextResponse(null, { status: 404 })
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request.headers.get('origin')),
  })
}

export async function POST(request: NextRequest) {
  // Production: behave as if the route does not exist.
  if (!IS_DEV) return new NextResponse('Not found', { status: 404 })

  const cors = corsHeaders(request.headers.get('origin'))

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
    const [
      { createClient },
      { runImport },
      { fetchPlaceContext, generateRestaurant },
      { translateRestaurant },
      { generateRestaurantSeo },
    ] = await Promise.all([
      import('@sanity/client'),
      import('@/scripts/import-from-url'),
      import('@/scripts/generate-de-descriptions'),
      import('@/scripts/bootstrap-en-translations'),
      import('@/scripts/generate-seo-fields'),
    ])

    const sanity = createClient({
      projectId: 'ehwjnjr2',
      dataset: 'production',
      apiVersion: '2024-01-01',
      token: process.env.SANITY_API_WRITE_TOKEN,
      useCdn: false,
    })

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
    let placeContext: Awaited<ReturnType<typeof fetchPlaceContext>> | null = null
    try {
      placeContext = await fetchPlaceContext(generatorSource as unknown as Parameters<typeof fetchPlaceContext>[0])
    } catch (err) {
      console.warn('[dev/import-restaurant] places-context fetch failed:', (err as Error).message)
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

    // Assemble the final doc — runImport produced a `drafts.<uuid>` _id.
    // Auto-publish (strip the prefix) to match the prior Studio-tool behavior:
    // the restaurant appears on /restaurant/ immediately; further edits go
    // through Sanity's normal draft-of-published flow in Studio.
    //
    // tip / tipEn are deliberately NOT layered in: insider tips stay personally
    // curated, never LLM-derived. The tip generator still runs to feed the
    // shortDescription refinement, but its output is discarded here.
    const draftId = result.doc._id as string
    const publishedId = draftId.replace(/^drafts\./, '')
    const finalDoc = {
      ...result.doc,
      _id: publishedId,
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
    if (err instanceof Error && err.name === 'ImportError') {
      const importErr = err as Error & { hint?: string }
      return NextResponse.json(
        { error: importErr.message, hint: importErr.hint },
        { status: 400, headers: cors },
      )
    }
    console.error('[dev/import-restaurant]', err)
    return NextResponse.json(
      { error: (err as Error).message ?? 'Unknown error' },
      { status: 500, headers: cors },
    )
  }
}
