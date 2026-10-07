import { describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/sanity.server', () => ({
  getAllBezirkeWithStats: vi.fn(async () => [
    { slug: 'mitte', restaurantCount: 54 },
    { slug: 'tiergarten', restaurantCount: 0 },
  ]),
  getBezirkBySlug: vi.fn(),
  getRestaurantsByBezirk: vi.fn(),
  getGuideTeaser: vi.fn(),
}))

import { generateStaticParams } from '@/app/[locale]/bezirk/[slug]/page'

describe('bezirk generateStaticParams', () => {
  it('prerenders empty districts in both locales, so their redirect is a cache hit', async () => {
    const params = await generateStaticParams()
    expect(params).toContainEqual({ locale: 'en', slug: 'tiergarten' })
    expect(params).toContainEqual({ locale: 'de', slug: 'tiergarten' })
    expect(params).toContainEqual({ locale: 'en', slug: 'mitte' })
  })
})
