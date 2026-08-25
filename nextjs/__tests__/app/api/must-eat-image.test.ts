import { NextRequest } from 'next/server'
import sharp from 'sharp'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getPublicMustEatIds = vi.fn()
vi.mock('@/lib/map/server-initial-map-data', () => ({
  getPublicMustEatIds: () => getPublicMustEatIds(),
}))

const getPrivateMustEatContent = vi.fn()
vi.mock('@/lib/must-eat/private-store', () => ({
  getPrivateMustEatContent: (id: string) => getPrivateMustEatContent(id),
}))

const download = vi.fn()
const getMetadata = vi.fn()
const file = vi.fn(() => ({ download, getMetadata }))
vi.mock('@/lib/firebase/admin', () => ({
  getAdminStorage: () => ({ bucket: () => ({ file }) }),
}))

const { readPremiumSessionUid } = vi.hoisted(() => ({
  readPremiumSessionUid: vi.fn(),
}))
vi.mock('@/lib/must-eat/premium-session', () => ({
  premiumSessionCookieName: () => 'premium_session',
  readPremiumSessionUid: () => readPremiumSessionUid(),
}))

import { GET } from '@/app/api/must-eat-image/[id]/route'
import {
  createPremiumAccessToken,
  premiumAccessCookieName,
} from '@/lib/must-eat/premium-access'

const PUBLIC_CACHE = 'public, max-age=300, stale-while-revalidate=3600'
const PRIVATE_CACHE = 'private, no-store'

function request(cookie?: string, query = ''): NextRequest {
  return new NextRequest(`https://example.com/api/must-eat-image/m1${query}`, {
    headers: cookie ? { cookie } : undefined,
  })
}

/** A real 400x400 PNG, so the resize path runs sharp for real instead of
 *  falling into its own error branch. */
async function pngFixture(): Promise<Buffer> {
  return sharp({
    create: { width: 400, height: 400, channels: 3, background: { r: 200, g: 40, b: 10 } },
  })
    .png()
    .toBuffer()
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('PREMIUM_ACCESS_SIGNING_KEY', 'test-signing-key-with-enough-entropy')
  getPublicMustEatIds.mockResolvedValue(new Set())
  readPremiumSessionUid.mockResolvedValue(null)
  getPrivateMustEatContent.mockResolvedValue({
    imageObjectPath: 'premium/must-eats/m1/hash.webp',
    imageContentType: 'image/webp',
  })
  download.mockResolvedValue([Buffer.from('private-image')])
  getMetadata.mockResolvedValue([{ contentType: 'image/webp', etag: 'etag-1' }])
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('/api/must-eat-image/[id]', () => {
  it('denies an anonymous request for a premium image before touching Storage', async () => {
    const response = await GET(request(), { params: Promise.resolve({ id: 'm1' }) })

    expect(response.status).toBe(403)
    expect(getPrivateMustEatContent).not.toHaveBeenCalled()
    expect(file).not.toHaveBeenCalled()
  })

  it('serves an explicitly public demo image through the app proxy', async () => {
    getPublicMustEatIds.mockResolvedValueOnce(new Set(['m1']))
    const response = await GET(request(), { params: Promise.resolve({ id: 'm1' }) })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/webp')
    // Aufgedeckt geht das Bild ohnehin an jeden anonymen Besucher — es zu
    // verstecken kostete nur sechs Bucket-Runden pro Startseiten-Aufruf.
    expect(response.headers.get('cache-control')).toBe(PUBLIC_CACHE)
    expect(file).toHaveBeenCalledWith('premium/must-eats/m1/hash.webp')
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe('private-image')
  })

  it('keeps a covered image out of every cache', async () => {
    readPremiumSessionUid.mockResolvedValue('user-1')
    const token = createPremiumAccessToken(['m1'], 'user-1')
    const response = await GET(request(`${premiumAccessCookieName()}=${token}`), {
      params: Promise.resolve({ id: 'm1' }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe(PRIVATE_CACHE)
  })

  /* Die Reihenfolge, für die es diesen Test gibt: eine Karte, die zugleich
     aufgedeckt und in der Capability des Aufrufers ist, muss öffentlich
     antworten. Mit der Cookie-Prüfung zuerst landete sie im no-store-Zweig —
     und damit hing die Cachebarkeit derselben URL am Aufrufer. */
  it('answers public for a card that is both revealed and in the capability', async () => {
    getPublicMustEatIds.mockResolvedValue(new Set(['m1']))
    readPremiumSessionUid.mockResolvedValue('user-1')
    const token = createPremiumAccessToken(['m1'], 'user-1')

    const response = await GET(request(`${premiumAccessCookieName()}=${token}`), {
      params: Promise.resolve({ id: 'm1' }),
    })

    expect(response.headers.get('cache-control')).toBe(PUBLIC_CACHE)
  })

  /* Dieselbe Reihenfolge von der Kostenseite: ein aufgedecktes Bild ist ohne
     Cookie erlaubt, also darf es nicht für verifySessionCookie zahlen. */
  it('skips the session round-trip for a revealed image', async () => {
    getPublicMustEatIds.mockResolvedValue(new Set(['m1']))
    const token = createPremiumAccessToken(['m1'], 'user-1')

    await GET(request(`${premiumAccessCookieName()}=${token}`), {
      params: Promise.resolve({ id: 'm1' }),
    })

    expect(readPremiumSessionUid).not.toHaveBeenCalled()
  })

  it('does not let a failed asset fetch into a cache', async () => {
    getPublicMustEatIds.mockResolvedValue(new Set(['m1']))
    download.mockRejectedValue(new Error('bucket unreachable'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await GET(request(), { params: Promise.resolve({ id: 'm1' }) })

    expect(response.status).toBe(503)
    expect(response.headers.get('cache-control')).toBe(PRIVATE_CACHE)
  })

  it('accepts a valid HttpOnly capability and rejects a tampered one', async () => {
    readPremiumSessionUid.mockResolvedValue('user-1')
    const token = createPremiumAccessToken(['m1'], 'user-1')
    const cookieName = premiumAccessCookieName()
    const allowed = await GET(request(`${cookieName}=${token}`), {
      params: Promise.resolve({ id: 'm1' }),
    })
    expect(allowed.status).toBe(200)

    readPremiumSessionUid.mockResolvedValueOnce('user-2')
    const wrongIdentity = await GET(request(`${cookieName}=${token}`), {
      params: Promise.resolve({ id: 'm1' }),
    })
    expect(wrongIdentity.status).toBe(403)

    const denied = await GET(request(`${cookieName}=${token}x`), {
      params: Promise.resolve({ id: 'm1' }),
    })
    expect(denied.status).toBe(403)
  })

  // Die Aufrufer hängen über sanityImageLoader ein `?w=…&auto=format&q=…` an.
  // Ignorierte die Route das, lud ein 69x90-Daumennagel die Originaldatei.
  it('resizes to the requested width and converts to WebP', async () => {
    const original = await pngFixture()
    download.mockResolvedValue([original])
    getMetadata.mockResolvedValue([{ contentType: 'image/png', etag: 'etag-1' }])
    getPublicMustEatIds.mockResolvedValue(new Set(['m1']))

    const response = await GET(request(undefined, '?w=180&auto=format&q=80'), {
      params: Promise.resolve({ id: 'm1' }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('image/webp')
    const body = Buffer.from(await response.arrayBuffer())
    expect((await sharp(body).metadata()).width).toBe(180)
    expect(body.byteLength).toBeLessThan(original.byteLength)
    // Das Bucket-ETag beschreibt das Original — die Variante braucht ihr eigenes.
    expect(response.headers.get('etag')).toBe('"etag-1-w180-q80-webp"')
  })

  it('snaps the width to the allowed ladder and leaves oversized requests alone', async () => {
    const original = await pngFixture()
    download.mockResolvedValue([original])
    getMetadata.mockResolvedValue([{ contentType: 'image/png', etag: 'etag-1' }])
    getPublicMustEatIds.mockResolvedValue(new Set(['m1']))

    const snapped = await GET(request(undefined, '?w=100&auto=format'), {
      params: Promise.resolve({ id: 'm1' }),
    })
    expect((await sharp(Buffer.from(await snapped.arrayBuffer())).metadata()).width).toBe(180)

    // Über der Leiter (und damit als Umgehung des Rasters) bleibt das Original.
    const huge = await GET(request(undefined, '?w=5000&auto=format'), {
      params: Promise.resolve({ id: 'm1' }),
    })
    expect(Buffer.from(await huge.arrayBuffer()).byteLength).toBe(original.byteLength)
    expect(huge.headers.get('content-type')).toBe('image/png')
  })

  it('serves the original when the bytes are something sharp cannot read', async () => {
    getPublicMustEatIds.mockResolvedValue(new Set(['m1']))

    const response = await GET(request(undefined, '?w=180&auto=format'), {
      params: Promise.resolve({ id: 'm1' }),
    })

    expect(response.status).toBe(200)
    expect(Buffer.from(await response.arrayBuffer()).toString()).toBe('private-image')
    expect(response.headers.get('content-type')).toBe('image/webp')
  })
})
