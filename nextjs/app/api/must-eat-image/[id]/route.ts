import { NextRequest, NextResponse } from 'next/server'

import { getAdminStorage } from '@/lib/firebase/admin'
import { getPublicMustEatIds } from '@/lib/map/server-initial-map-data'
import { getPrivateMustEatContent } from '@/lib/must-eat/private-store'
import {
  premiumAccessCookieName,
  readPremiumAccessToken,
} from '@/lib/must-eat/premium-access'
import {
  premiumSessionCookieName,
  readPremiumSessionUid,
} from '@/lib/must-eat/premium-session'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const SAFE_ID = /^[A-Za-z0-9._-]{1,128}$/

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!SAFE_ID.test(id)) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const capability = request.cookies.get(premiumAccessCookieName())?.value
  const sessionUid = await readPremiumSessionUid(
    request.cookies.get(premiumSessionCookieName())?.value,
  )
  const cookieIds = sessionUid
    ? readPremiumAccessToken(capability, sessionUid)
    : process.env.NODE_ENV !== 'production'
      ? readPremiumAccessToken(capability, 'development')
      : new Set<string>()
  let allowed = cookieIds.has(id)
  if (!allowed) {
    const publicIds = await getPublicMustEatIds()
    allowed = publicIds.has(id)
  }
  if (!allowed) {
    const response = NextResponse.json({ error: 'forbidden' }, { status: 403 })
    response.headers.set('Cache-Control', 'private, no-store')
    return response
  }

  try {
    const content = await getPrivateMustEatContent(id)
    const file = getAdminStorage().bucket().file(content.imageObjectPath)
    const [[buffer], [metadata]] = await Promise.all([
      file.download(),
      file.getMetadata(),
    ])
    const contentType = metadata.contentType ?? content.imageContentType
    if (!contentType.startsWith('image/')) {
      throw new Error('Private Must-Eat object is not an image')
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        // A shared browser must not keep premium bytes after logout. The
        // short-lived HttpOnly capability is checked on every image request.
        'Cache-Control': 'private, no-store',
        'Content-Type': contentType,
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff',
        ...(metadata.etag ? { ETag: metadata.etag } : {}),
      },
    })
  } catch (error) {
    console.error(
      '[must-eat-image] private asset unavailable',
      error instanceof Error ? error.name : 'UnknownError',
    )
    const response = NextResponse.json(
      { error: 'asset unavailable' },
      { status: 503 },
    )
    response.headers.set('Cache-Control', 'private, no-store')
    return response
  }
}

export const HEAD = GET
