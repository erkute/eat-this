import { describe, it, expect, afterEach, vi } from 'vitest'

describe('env helpers', () => {
  const ORIGINAL = process.env.NEXT_PUBLIC_ENV

  afterEach(() => {
    process.env.NEXT_PUBLIC_ENV = ORIGINAL
  })

  it('isStaging is true when NEXT_PUBLIC_ENV=staging', async () => {
    process.env.NEXT_PUBLIC_ENV = 'staging'
    vi.resetModules()
    const { isStaging, isProduction } = await import('@/lib/env')
    expect(isStaging).toBe(true)
    expect(isProduction).toBe(false)
  })

  it('isProduction is true when NEXT_PUBLIC_ENV is unset or "production"', async () => {
    process.env.NEXT_PUBLIC_ENV = 'production'
    vi.resetModules()
    const a = await import('@/lib/env')
    expect(a.isProduction).toBe(true)
    expect(a.isStaging).toBe(false)

    delete process.env.NEXT_PUBLIC_ENV
    vi.resetModules()
    const b = await import('@/lib/env')
    expect(b.isProduction).toBe(true)
    expect(b.isStaging).toBe(false)
  })
})
