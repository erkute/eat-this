import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/sanity.server', () => ({ getFeaturedSpots: vi.fn() }))
import { getFeaturedSpots } from '@/lib/sanity.server'
import { getEmailRestaurants } from '../emailRestaurants'

describe('getEmailRestaurants', () => {
  it('maps featured spots to the email shape with resized thumbs', async () => {
    vi.mocked(getFeaturedSpots).mockResolvedValueOnce([
      { name: 'A', photo: 'https://cdn/x.png?w=800&auto=format&q=80', cuisineType: 'Japanese', district: 'Mitte' },
      { name: 'B', photo: 'https://cdn/y.png?w=800&auto=format&q=80', cuisineType: '', district: 'Kreuzberg' },
    ] as never)
    const r = await getEmailRestaurants(4)
    expect(r).toHaveLength(2)
    expect(r[0]).toEqual({ name: 'A', photo: 'https://cdn/x.png?w=320&h=240&fit=crop&auto=format&q=70', meta: 'Japanese' })
    expect(r[1].meta).toBe('Kreuzberg')
  })

  it('returns [] when Sanity throws — the login flow never blocks', async () => {
    vi.mocked(getFeaturedSpots).mockRejectedValueOnce(new Error('sanity down'))
    expect(await getEmailRestaurants()).toEqual([])
  })
})
