import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

describe('StagingBanner', () => {
  const ORIGINAL = process.env.NEXT_PUBLIC_ENV
  afterEach(() => {
    process.env.NEXT_PUBLIC_ENV = ORIGINAL
    vi.resetModules()
  })

  it('renders nothing on production', async () => {
    process.env.NEXT_PUBLIC_ENV = 'production'
    vi.resetModules()
    const { StagingBanner } = await import('@/app/components/StagingBanner')
    const html = renderToStaticMarkup(<StagingBanner />)
    expect(html).toBe('')
  })

  it('renders a banner with "STAGING" text on staging', async () => {
    process.env.NEXT_PUBLIC_ENV = 'staging'
    vi.resetModules()
    const { StagingBanner } = await import('@/app/components/StagingBanner')
    const html = renderToStaticMarkup(<StagingBanner />)
    expect(html).toContain('STAGING')
    expect(html.toLowerCase()).toContain('not production')
  })
})
