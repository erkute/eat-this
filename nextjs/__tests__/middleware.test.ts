import { describe, it, expect, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

function makeReq(pathname: string, headers: Record<string, string> = {}): NextRequest {
  const url = `https://staging.example.com${pathname}`
  return new NextRequest(url, { headers })
}

describe('middleware: Basic Auth + X-Robots-Tag', () => {
  const ORIGINAL_ENV = process.env.NEXT_PUBLIC_ENV
  const ORIGINAL_USER = process.env.STAGING_BASIC_AUTH_USER
  const ORIGINAL_PASS = process.env.STAGING_BASIC_AUTH_PASS

  afterEach(() => {
    process.env.NEXT_PUBLIC_ENV = ORIGINAL_ENV
    process.env.STAGING_BASIC_AUTH_USER = ORIGINAL_USER
    process.env.STAGING_BASIC_AUTH_PASS = ORIGINAL_PASS
    vi.resetModules()
  })

  it('production: no Basic Auth challenge, no X-Robots-Tag', async () => {
    process.env.NEXT_PUBLIC_ENV = 'production'
    vi.resetModules()
    const { default: middleware } = await import('@/middleware')
    const res = await middleware(makeReq('/'))
    expect(res.status).not.toBe(401)
    expect(res.headers.get('x-robots-tag')).toBeNull()
  })

  it('staging: 401 with WWW-Authenticate when no Basic Auth header', async () => {
    process.env.NEXT_PUBLIC_ENV = 'staging'
    process.env.STAGING_BASIC_AUTH_USER = 'tester'
    process.env.STAGING_BASIC_AUTH_PASS = 'secret'
    vi.resetModules()
    const { default: middleware } = await import('@/middleware')
    const res = await middleware(makeReq('/'))
    expect(res.status).toBe(401)
    expect(res.headers.get('www-authenticate')).toMatch(/^Basic/i)
    expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow')
  })

  it('staging: passes through with valid Basic Auth, sets X-Robots-Tag', async () => {
    process.env.NEXT_PUBLIC_ENV = 'staging'
    process.env.STAGING_BASIC_AUTH_USER = 'tester'
    process.env.STAGING_BASIC_AUTH_PASS = 'secret'
    vi.resetModules()
    const { default: middleware } = await import('@/middleware')
    const credentials = Buffer.from('tester:secret').toString('base64')
    const res = await middleware(makeReq('/', { authorization: `Basic ${credentials}` }))
    expect(res.status).not.toBe(401)
    expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow')
    expect(res.cookies.get('__Host-eatthis_staging_auth')?.value).toBeTruthy()
    expect((res.headers.get('set-cookie') ?? '').toLowerCase()).toContain('httponly')
  })

  it('staging: 401 with wrong credentials', async () => {
    process.env.NEXT_PUBLIC_ENV = 'staging'
    process.env.STAGING_BASIC_AUTH_USER = 'tester'
    process.env.STAGING_BASIC_AUTH_PASS = 'secret'
    vi.resetModules()
    const { default: middleware } = await import('@/middleware')
    const credentials = Buffer.from('tester:wrong').toString('base64')
    const res = await middleware(makeReq('/', { authorization: `Basic ${credentials}` }))
    expect(res.status).toBe(401)
  })

  it('staging: API routes require Basic Auth or its signed session cookie', async () => {
    process.env.NEXT_PUBLIC_ENV = 'staging'
    process.env.STAGING_BASIC_AUTH_USER = 'tester'
    process.env.STAGING_BASIC_AUTH_PASS = 'secret'
    vi.resetModules()
    const { default: middleware } = await import('@/middleware')

    const denied = await middleware(makeReq('/api/map-data'))
    expect(denied.status).toBe(401)

    const credentials = Buffer.from('tester:secret').toString('base64')
    const pageResponse = await middleware(makeReq('/', { authorization: `Basic ${credentials}` }))
    const session = pageResponse.cookies.get('__Host-eatthis_staging_auth')?.value
    expect(session).toBeTruthy()

    const apiResponse = await middleware(
      makeReq('/api/map-data', {
        authorization: 'Bearer firebase-id-token',
        cookie: `__Host-eatthis_staging_auth=${session}`,
      }),
    )
    expect(apiResponse.status).not.toBe(401)
    expect(apiResponse.headers.get('x-middleware-next')).toBe('1')
    expect(apiResponse.headers.get('x-robots-tag')).toBe('noindex, nofollow')
  })

  it('staging: signed webhook paths are exempt from Basic Auth', async () => {
    process.env.NEXT_PUBLIC_ENV = 'staging'
    process.env.STAGING_BASIC_AUTH_USER = 'tester'
    process.env.STAGING_BASIC_AUTH_PASS = 'secret'
    vi.resetModules()
    const { default: middleware } = await import('@/middleware')
    const stripe = await middleware(makeReq('/api/stripe/webhook'))
    const sanity = await middleware(makeReq('/api/revalidate'))
    expect(stripe.status).not.toBe(401)
    expect(sanity.status).not.toBe(401)
  })

  it('matcher includes APIs so the staging gate executes for them', async () => {
    process.env.NEXT_PUBLIC_ENV = 'staging'
    vi.resetModules()
    const { config } = await import('@/middleware')
    expect(config.matcher[0]).not.toContain('?!api|')
  })
})

describe('middleware: referral ?ref capture', () => {
  const ORIGINAL_ENV = process.env.NEXT_PUBLIC_ENV
  afterEach(() => {
    process.env.NEXT_PUBLIC_ENV = ORIGINAL_ENV
    vi.resetModules()
  })

  it('valid ?ref → 308, strips param, sets HttpOnly pending_referrer cookie', async () => {
    process.env.NEXT_PUBLIC_ENV = 'production'
    vi.resetModules()
    const { default: middleware } = await import('@/middleware')
    const uid = 'a'.repeat(28)
    const res = await middleware(makeReq(`/?ref=${uid}`))
    expect(res.status).toBe(308)
    expect(res.headers.get('location')).not.toContain('ref=')
    expect(res.cookies.get('pending_referrer')?.value).toBe(uid)
    expect((res.headers.get('set-cookie') ?? '').toLowerCase()).toContain('httponly')
  })

  it('garbage ?ref → 308, strips param, sets NO cookie', async () => {
    process.env.NEXT_PUBLIC_ENV = 'production'
    vi.resetModules()
    const { default: middleware } = await import('@/middleware')
    const res = await middleware(makeReq('/?ref=not-a-uid!!'))
    expect(res.status).toBe(308)
    expect(res.cookies.get('pending_referrer')).toBeUndefined()
  })
})

describe('middleware: legacy 404 cleanup (post-rebuild re-slug)', () => {
  const ORIGINAL_ENV = process.env.NEXT_PUBLIC_ENV
  afterEach(() => {
    process.env.NEXT_PUBLIC_ENV = ORIGINAL_ENV
    vi.resetModules()
  })

  async function mw() {
    process.env.NEXT_PUBLIC_ENV = 'production'
    vi.resetModules()
    return (await import('@/middleware')).default
  }

  it('permanently closed spot → 410 Gone (DE + EN)', async () => {
    const middleware = await mw()
    expect((await middleware(makeReq('/restaurant/zeit-caf'))).status).toBe(410)
    expect((await middleware(makeReq('/en/restaurant/phantom-bar'))).status).toBe(410)
  })

  it('removed news article → 308 to /news, locale preserved', async () => {
    const middleware = await mw()
    const de = await middleware(makeReq('/news/bun-society'))
    expect(de.status).toBe(308)
    expect(new URL(de.headers.get('location')!).pathname).toBe('/news')
    const en = await middleware(makeReq('/en/news/ramen-berlin'))
    expect(new URL(en.headers.get('location')!).pathname).toBe('/en/news')
  })

  it('File Asto article → 308 to its restaurant page', async () => {
    const middleware = await mw()
    const res = await middleware(makeReq('/news/file-asto-brings-a-taste-of-athens-to-kreuzberg'))
    expect(res.status).toBe(308)
    expect(new URL(res.headers.get('location')!).pathname).toBe('/restaurant/file-asto')
  })

  it('living restaurant slug is not 410', async () => {
    const middleware = await mw()
    expect((await middleware(makeReq('/restaurant/borchardt'))).status).not.toBe(410)
  })
})

describe('middleware: fremden Lighthouse-Verkehr abweisen', () => {
  const ORIGINAL_ENV = process.env.NEXT_PUBLIC_ENV
  const ORIGINAL_SECRET = process.env.LHCI_BYPASS_SECRET

  // Exakt der UA, den Lighthouse in der Mobile-Emulation sendet — und den
  // der fremde Crawler seit dem 16.08.2026 mitbringt.
  const LIGHTHOUSE_UA =
    'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36 Chrome-Lighthouse'

  afterEach(() => {
    process.env.NEXT_PUBLIC_ENV = ORIGINAL_ENV
    if (ORIGINAL_SECRET === undefined) delete process.env.LHCI_BYPASS_SECRET
    else process.env.LHCI_BYPASS_SECRET = ORIGINAL_SECRET
    vi.resetModules()
  })

  async function load() {
    process.env.NEXT_PUBLIC_ENV = 'production'
    vi.resetModules()
    return (await import('@/middleware')).default
  }

  it('blockt den Lighthouse-UA mit 429', async () => {
    delete process.env.LHCI_BYPASS_SECRET
    const middleware = await load()
    const res = await middleware(makeReq('/kategorie/lunch', { 'user-agent': LIGHTHOUSE_UA }))
    expect(res.status).toBe(429)
    expect(res.headers.get('retry-after')).toBe('86400')
  })

  it('antwortet unkachebar, damit der CDN die Absage nicht an echte Besucher ausliefert', async () => {
    delete process.env.LHCI_BYPASS_SECRET
    const middleware = await load()
    const res = await middleware(makeReq('/kategorie/lunch', { 'user-agent': LIGHTHOUSE_UA }))
    expect(res.headers.get('cache-control')).toBe('no-store')
  })

  it('blockt auch API-Routen — der Crawler fuehrt JS aus und ruft /api/count auf', async () => {
    delete process.env.LHCI_BYPASS_SECRET
    const middleware = await load()
    const res = await middleware(makeReq('/api/count', { 'user-agent': LIGHTHOUSE_UA }))
    expect(res.status).toBe(429)
  })

  it('fail-closed: ohne gesetztes Secret faellt auch die eigene CI durch', async () => {
    delete process.env.LHCI_BYPASS_SECRET
    const middleware = await load()
    const res = await middleware(
      makeReq('/', { 'user-agent': LIGHTHOUSE_UA, 'x-eat-this-lhci': 'irgendwas' })
    )
    expect(res.status).toBe(429)
  })

  it('laesst die eigene CI mit passendem Header durch', async () => {
    process.env.LHCI_BYPASS_SECRET = 'korrektes-secret'
    const middleware = await load()
    const res = await middleware(
      makeReq('/', { 'user-agent': LIGHTHOUSE_UA, 'x-eat-this-lhci': 'korrektes-secret' })
    )
    expect(res.status).not.toBe(429)
  })

  it('weist den falschen Header ab, auch bei gleicher Laenge', async () => {
    process.env.LHCI_BYPASS_SECRET = 'korrektes-secret'
    const middleware = await load()
    const res = await middleware(
      makeReq('/', { 'user-agent': LIGHTHOUSE_UA, 'x-eat-this-lhci': 'falsches--secret' })
    )
    expect(res.status).toBe(429)
  })

  it('laesst gewoehnliche Besucher unberuehrt', async () => {
    delete process.env.LHCI_BYPASS_SECRET
    const middleware = await load()
    const res = await middleware(
      makeReq('/kategorie/lunch', {
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
      })
    )
    expect(res.status).not.toBe(429)
  })

  it('laesst Googlebot unberuehrt', async () => {
    delete process.env.LHCI_BYPASS_SECRET
    const middleware = await load()
    const res = await middleware(
      makeReq('/kategorie/lunch', {
        'user-agent':
          'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      })
    )
    expect(res.status).not.toBe(429)
  })
})
