import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getRestaurantsByCategory: vi.fn(),
}))

vi.mock('next-intl/server', () => ({ setRequestLocale: vi.fn() }))
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))
vi.mock('@/lib/sanity.server', () => ({
  getRestaurantsByCategory: mocks.getRestaurantsByCategory,
}))
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))
vi.mock('next/image', () => ({
  default: () => null,
}))
vi.mock('@/app/components/SiteFooter', () => ({ default: () => null }))

import GuidePage from '@/app/[locale]/(spa)/guides/[slug]/page'

beforeEach(() => {
  mocks.getRestaurantsByCategory.mockReset()
})

describe('guide JSON-LD', () => {
  it('mirrors the rendered restaurant list in BreadcrumbList and ItemList data', async () => {
    mocks.getRestaurantsByCategory.mockResolvedValueOnce([
      {
        _id: 'restaurant-1',
        name: 'Gemello',
        slug: 'gemello',
        cuisineType: 'Pizza',
      },
    ])

    const element = await GuidePage({
      params: Promise.resolve({ locale: 'de', slug: 'beste-pizza-berlin' }),
    })
    const html = renderToStaticMarkup(element)

    expect(html).toContain('"@type":"BreadcrumbList"')
    expect(html).toContain('"@type":"ItemList"')
    expect(html).toContain('"numberOfItems":1')
    expect(html).toContain('https://www.eatthisdot.com/restaurant/gemello')
  })
})
