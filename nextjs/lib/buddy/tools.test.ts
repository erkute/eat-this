// nextjs/lib/buddy/tools.test.ts
import { describe, it, expect } from 'vitest'
import { BUDDY_TOOLS } from './tools'

describe('BUDDY_TOOLS', () => {
  it('defines search_spots and search_articles', () => {
    const names = BUDDY_TOOLS.map((t) => t.name)
    expect(names).toEqual(['search_spots', 'search_articles'])
  })

  it('search_spots requires vibe_query and exposes optional filters', () => {
    const spots = BUDDY_TOOLS.find((t) => t.name === 'search_spots')!
    expect(spots.input_schema.required).toEqual(['vibe_query'])
    expect(Object.keys(spots.input_schema.properties as object)).toEqual(
      expect.arrayContaining(['cuisine', 'bezirk', 'price_range', 'vibe_query']),
    )
  })

  it('search_articles requires query', () => {
    const arts = BUDDY_TOOLS.find((t) => t.name === 'search_articles')!
    expect(arts.input_schema.required).toEqual(['query'])
  })
})
