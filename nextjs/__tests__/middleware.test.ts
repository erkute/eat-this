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
