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
    const res = middleware(makeReq('/'))
    expect(res.status).not.toBe(401)
    expect(res.headers.get('x-robots-tag')).toBeNull()
  })

  it('staging: 401 with WWW-Authenticate when no Basic Auth header', async () => {
    process.env.NEXT_PUBLIC_ENV = 'staging'
    process.env.STAGING_BASIC_AUTH_USER = 'tester'
    process.env.STAGING_BASIC_AUTH_PASS = 'secret'
    vi.resetModules()
    const { default: middleware } = await import('@/middleware')
    const res = middleware(makeReq('/'))
    expect(res.status).toBe(401)
    expect(res.headers.get('www-authenticate')).toMatch(/^Basic/i)
  })

  it('staging: passes through with valid Basic Auth, sets X-Robots-Tag', async () => {
    process.env.NEXT_PUBLIC_ENV = 'staging'
    process.env.STAGING_BASIC_AUTH_USER = 'tester'
    process.env.STAGING_BASIC_AUTH_PASS = 'secret'
    vi.resetModules()
    const { default: middleware } = await import('@/middleware')
    const credentials = Buffer.from('tester:secret').toString('base64')
    const res = middleware(makeReq('/', { authorization: `Basic ${credentials}` }))
    expect(res.status).not.toBe(401)
    expect(res.headers.get('x-robots-tag')).toBe('noindex, nofollow')
  })

  it('staging: 401 with wrong credentials', async () => {
    process.env.NEXT_PUBLIC_ENV = 'staging'
    process.env.STAGING_BASIC_AUTH_USER = 'tester'
    process.env.STAGING_BASIC_AUTH_PASS = 'secret'
    vi.resetModules()
    const { default: middleware } = await import('@/middleware')
    const credentials = Buffer.from('tester:wrong').toString('base64')
    const res = middleware(makeReq('/', { authorization: `Basic ${credentials}` }))
    expect(res.status).toBe(401)
  })

  it('staging: webhook path is exempt from Basic Auth', async () => {
    process.env.NEXT_PUBLIC_ENV = 'staging'
    process.env.STAGING_BASIC_AUTH_USER = 'tester'
    process.env.STAGING_BASIC_AUTH_PASS = 'secret'
    vi.resetModules()
    const { default: middleware } = await import('@/middleware')
    const res = middleware(makeReq('/api/stripe/webhook'))
    expect(res.status).not.toBe(401)
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
    const res = middleware(makeReq(`/?ref=${uid}`))
    expect(res.status).toBe(308)
    expect(res.headers.get('location')).not.toContain('ref=')
    expect(res.cookies.get('pending_referrer')?.value).toBe(uid)
    expect((res.headers.get('set-cookie') ?? '').toLowerCase()).toContain('httponly')
  })

  it('garbage ?ref → 308, strips param, sets NO cookie', async () => {
    process.env.NEXT_PUBLIC_ENV = 'production'
    vi.resetModules()
    const { default: middleware } = await import('@/middleware')
    const res = middleware(makeReq('/?ref=not-a-uid!!'))
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
    expect(middleware(makeReq('/restaurant/zeit-caf')).status).toBe(410)
    expect(middleware(makeReq('/en/restaurant/phantom-bar')).status).toBe(410)
  })

  it('removed news article → 308 to /news, locale preserved', async () => {
    const middleware = await mw()
    const de = middleware(makeReq('/news/bun-society'))
    expect(de.status).toBe(308)
    expect(new URL(de.headers.get('location')!).pathname).toBe('/news')
    const en = middleware(makeReq('/en/news/ramen-berlin'))
    expect(new URL(en.headers.get('location')!).pathname).toBe('/en/news')
  })

  it('File Asto article → 308 to its restaurant page', async () => {
    const middleware = await mw()
    const res = middleware(makeReq('/news/file-asto-brings-a-taste-of-athens-to-kreuzberg'))
    expect(res.status).toBe(308)
    expect(new URL(res.headers.get('location')!).pathname).toBe('/restaurant/file-asto')
  })

  it('living restaurant slug is not 410', async () => {
    const middleware = await mw()
    expect(middleware(makeReq('/restaurant/borchardt')).status).not.toBe(410)
  })
})
