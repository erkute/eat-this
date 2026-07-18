import { createHash } from 'node:crypto'
import * as Sentry from '@sentry/nextjs'
import type { CurrentSanityUser } from '@sanity/client'
import { NextResponse } from 'next/server'
import { importRestaurant } from '@/lib/admin/import-restaurant.server'
import { isStaging } from '@/lib/env'
import { checkRateLimitFailClosed } from '@/lib/rateLimit'
import { client as baseSanityClient } from '@/lib/sanity'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const maxDuration = 120

const LIVE_STUDIO_ORIGINS = new Set([
  'https://eat-this.sanity.studio',
  'https://www.sanity.io',
])
const IMPORT_ROLES = new Set(['administrator', 'developer', 'editor'])
const MAPS_HOSTS = new Set([
  'maps.app.goo.gl',
  'google.com',
  'www.google.com',
  'maps.google.com',
  'google.de',
  'www.google.de',
  'maps.google.de',
])

interface ImportBody {
  url?: unknown
}

function corsHeaders(origin: string | null): Record<string, string> | null {
  const isLocalStudio =
    process.env.NODE_ENV === 'development' &&
    typeof origin === 'string' &&
    /^http:\/\/localhost:\d+$/.test(origin)
  if (!origin || (!LIVE_STUDIO_ORIGINS.has(origin) && !isLocalStudio)) return null

  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '600',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  }
}

function isGoogleMapsUrl(value: string): boolean {
  if (value.length > 2048) return false
  try {
    const url = new URL(value)
    const hostname = url.hostname.toLowerCase()
    if (url.protocol !== 'https:' || !MAPS_HOSTS.has(hostname)) return false
    if (hostname === 'maps.app.goo.gl' || hostname.startsWith('maps.google.')) return true
    return url.pathname === '/maps' || url.pathname.startsWith('/maps/')
  } catch {
    return false
  }
}

function json(
  body: unknown,
  status: number,
  headers: Record<string, string>,
) {
  return NextResponse.json(body, { status, headers })
}

export async function OPTIONS(request: Request) {
  if (isStaging) return new NextResponse(null, { status: 404 })
  const cors = corsHeaders(request.headers.get('origin'))
  if (!cors) return new NextResponse(null, { status: 403 })
  return new NextResponse(null, { status: 204, headers: cors })
}

export async function POST(request: Request) {
  // Production imports are intentionally unavailable on the isolated staging
  // backend until it has its own Google provider secret and Studio deployment.
  if (isStaging) return new NextResponse('Not found', { status: 404 })

  const cors = corsHeaders(request.headers.get('origin'))
  if (!cors) return NextResponse.json({ error: 'origin_forbidden' }, { status: 403 })

  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (!token) {
    return json(
      { error: 'missing_token', message: 'Reload Sanity Studio and sign in again.' },
      401,
      cors,
    )
  }

  const sanity = baseSanityClient.withConfig({
    token,
    useCdn: false,
    perspective: 'raw',
  })

  let user: CurrentSanityUser
  try {
    user = await sanity.users.getById('me')
  } catch {
    return json(
      { error: 'invalid_token', message: 'Your Sanity session is no longer valid.' },
      401,
      cors,
    )
  }

  if (!IMPORT_ROLES.has(user.role)) {
    return json(
      { error: 'insufficient_role', message: 'Your Sanity role cannot publish restaurants.' },
      403,
      cors,
    )
  }

  if (!process.env.GOOGLE_API_KEY || !process.env.ANTHROPIC_API_KEY) {
    Sentry.captureMessage('Live restaurant importer is missing provider configuration', 'error')
    return json(
      { error: 'import_unavailable', message: 'The live importer is not configured yet.' },
      503,
      cors,
    )
  }

  let body: ImportBody
  try {
    body = (await request.json()) as ImportBody
  } catch {
    return json({ error: 'invalid_json', message: 'Invalid JSON body.' }, 400, cors)
  }

  const url = typeof body.url === 'string' ? body.url.trim() : ''
  if (!url || !isGoogleMapsUrl(url)) {
    return json(
      { error: 'invalid_url', message: 'Paste a valid HTTPS Google Maps URL.' },
      400,
      cors,
    )
  }

  const userKey = createHash('sha256').update(user.id).digest('hex').slice(0, 32)
  if (!(await checkRateLimitFailClosed(`sanity-import:${userKey}`, 30, 60 * 60 * 1000))) {
    return json(
      { error: 'rate_limited', message: 'Import limit reached. Try again later.' },
      429,
      cors,
    )
  }

  try {
    const result = await importRestaurant(url, sanity)
    return json(result, 200, cors)
  } catch (error) {
    if (error instanceof Error && error.name === 'ImportError') {
      const importError = error as Error & { hint?: string }
      return json(
        {
          error: 'import_failed',
          message: importError.message,
          ...(importError.hint ? { hint: importError.hint } : {}),
        },
        400,
        cors,
      )
    }

    const statusCode =
      typeof error === 'object' && error !== null && 'statusCode' in error
        ? (error as { statusCode?: unknown }).statusCode
        : null
    if (statusCode === 401 || statusCode === 403) {
      return json(
        { error: 'write_forbidden', message: 'Sanity rejected this write for your account.' },
        403,
        cors,
      )
    }

    Sentry.captureException(error, { extra: { source: 'admin-import-restaurant' } })
    return json(
      { error: 'import_failed', message: 'The import failed. Please try again.' },
      500,
      cors,
    )
  }
}
