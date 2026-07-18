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
import { importRestaurant } from '@/lib/admin/import-restaurant.server'
import { client as baseSanityClient } from '@/lib/sanity'

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
    const sanity = baseSanityClient.withConfig({
      token: process.env.SANITY_API_WRITE_TOKEN,
      useCdn: false,
      perspective: 'raw',
    })
    const result = await importRestaurant(url, sanity)

    return NextResponse.json(
      result,
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
