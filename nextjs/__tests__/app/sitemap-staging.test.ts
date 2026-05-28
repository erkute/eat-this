import { describe, it, expect, afterEach, vi } from 'vitest'

describe('sitemap.ts staging gate', () => {
  const ORIGINAL = process.env.NEXT_PUBLIC_ENV
  afterEach(() => { process.env.NEXT_PUBLIC_ENV = ORIGINAL })

  it('staging: returns empty array without hitting Sanity', async () => {
    process.env.NEXT_PUBLIC_ENV = 'staging'
    vi.resetModules()
    // Mock the Sanity client so we'd notice if it were called
    vi.doMock('@/lib/sanity', () => ({
      client: { fetch: vi.fn().mockRejectedValue(new Error('should not call sanity')) },
    }))
    const mod = await import('@/app/sitemap')
    const result = await mod.default()
    expect(result).toEqual([])
  })
})
