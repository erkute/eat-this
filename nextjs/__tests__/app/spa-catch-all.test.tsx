import { beforeEach, describe, expect, it, vi } from 'vitest'

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
})
