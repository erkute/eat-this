import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
  getAllNewsArticles: vi.fn(),
  getStaticPage: vi.fn(),
}))

vi.mock('next/navigation', () => ({ notFound: mocks.notFound }))
vi.mock('next-intl/server', () => ({ setRequestLocale: vi.fn() }))
vi.mock('@/lib/sanity.server', () => ({
  getAllNewsArticles: mocks.getAllNewsArticles,
  getStaticPage: mocks.getStaticPage,
}))
vi.mock('@/app/components/NewsSection', () => ({
  default: () => <main>News</main>,
}))

import SPACatchAllPage, {
  generateMetadata,
} from '@/app/[locale]/(spa)/[...slug]/page'

beforeEach(() => {
  mocks.notFound.mockClear()
  mocks.getAllNewsArticles.mockReset()
  mocks.getStaticPage.mockReset()
})

describe('SPA catch-all exact path matching', () => {
  it('returns 404 metadata for an extra segment below a whitelisted page', async () => {
    const metadata = await generateMetadata({
      params: Promise.resolve({ locale: 'de', slug: ['about', 'duplicate'] }),
    })

    expect(metadata).toEqual({
      title: '404 — Eat This',
      robots: { index: false, follow: false },
    })
  })

  it('404s before loading content for an extra segment', async () => {
    await expect(
      SPACatchAllPage({
        params: Promise.resolve({ locale: 'de', slug: ['news', 'duplicate'] }),
      }),
    ).rejects.toThrow('NEXT_NOT_FOUND')

    expect(mocks.notFound).toHaveBeenCalledOnce()
    expect(mocks.getAllNewsArticles).not.toHaveBeenCalled()
    expect(mocks.getStaticPage).not.toHaveBeenCalled()
  })

  it('emits BreadcrumbList and ItemList data for the news index', async () => {
    mocks.getAllNewsArticles.mockResolvedValueOnce([
      {
        _id: 'news-1',
        slug: 'pizza-in-berlin',
        title: 'Pizza in Berlin',
        titleDe: 'Pizza in Berlin',
        date: '2026-07-14',
      },
    ])

    const element = await SPACatchAllPage({
      params: Promise.resolve({ locale: 'de', slug: ['news'] }),
    })
    const html = renderToStaticMarkup(element)

    expect(html).toContain('"@type":"BreadcrumbList"')
    expect(html).toContain('"@type":"ItemList"')
    expect(html).toContain('https://www.eatthisdot.com/news/pizza-in-berlin')
  })
})
