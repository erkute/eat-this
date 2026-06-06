import { describe, it, expect, afterEach, vi } from 'vitest'

describe('robots.ts', () => {
  const ORIGINAL = process.env.NEXT_PUBLIC_ENV
  afterEach(() => { process.env.NEXT_PUBLIC_ENV = ORIGINAL })

  it('production: allow / and reference sitemap', async () => {
    process.env.NEXT_PUBLIC_ENV = 'production'
    vi.resetModules()
    const mod = await import('@/app/robots')
    const result = mod.default()
    expect(result.rules).toEqual({ userAgent: '*', allow: '/' })
    expect(result.sitemap).toMatch(/\/sitemap\.xml$/)
  })

  it('staging: disallow all, no sitemap reference', async () => {
    process.env.NEXT_PUBLIC_ENV = 'staging'
    vi.resetModules()
    const mod = await import('@/app/robots')
    const result = mod.default()
    expect(result.rules).toEqual({ userAgent: '*', disallow: '/' })
    expect(result.sitemap).toBeUndefined()
  })
})
