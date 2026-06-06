import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the Sanity client BEFORE importing the module under test.
// sanity.server.ts imports { client } from './sanity' which resolves to @/lib/sanity.
vi.mock('@/lib/sanity', () => ({
  client: {
    fetch: vi.fn(),
  },
}))

import { client } from '@/lib/sanity'
import { getLatestNewsArticles } from '@/lib/sanity.server'

describe('getLatestNewsArticles', () => {
  beforeEach(() => {
    vi.mocked(client.fetch).mockReset()
  })

  it('returns up to `limit` articles ordered newest-first', async () => {
    const sample = [
      { _id: '1', title: 'Newest', titleDe: 'Neuester', date: '2026-05-01' },
      { _id: '2', title: 'Older', titleDe: 'Älterer', date: '2026-04-15' },
    ]
    vi.mocked(client.fetch).mockResolvedValueOnce(sample as never)
    const result = await getLatestNewsArticles(2)
    expect(result).toEqual(sample)
    // Confirm the GROQ query asks for the newest first and slices to limit.
    const callArgs = vi.mocked(client.fetch).mock.calls[0]
    expect(callArgs[0]).toMatch(/order\(date desc\)/)
    expect(callArgs[0]).toMatch(/\[0\.\.\.\$limit\]/)
    expect(callArgs[1]).toEqual({ limit: 2 })
  })

  it('passes ISR tags so the news revalidate hook hits this query too', async () => {
    vi.mocked(client.fetch).mockResolvedValueOnce([] as never)
    await getLatestNewsArticles(2)
    const callArgs = vi.mocked(client.fetch).mock.calls[0]
    // Third arg is the fetch options object.
    expect(callArgs[2]).toMatchObject({
      next: { revalidate: 3600, tags: ['news'] },
    })
  })
})
