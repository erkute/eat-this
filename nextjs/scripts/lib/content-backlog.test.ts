import { describe, expect, it } from 'vitest'
import {
  filterBySlugs,
  rankDescriptionBacklog,
  rankGalleryBacklog,
  type ContentRestaurant,
} from './content-backlog'

const restaurant = (
  slug: string,
  overrides: Partial<ContentRestaurant> = {},
): ContentRestaurant => ({
  slug,
  name: slug,
  isOpen: true,
  featured: false,
  tierAnon: false,
  tierSigned: false,
  hasImage: true,
  galleryCount: 0,
  hasGooglePlaceId: true,
  descriptionLength: 500,
  hasMenuUrl: false,
  hasExternalPresence: true,
  hasShortDescription: false,
  hasTip: false,
  ...overrides,
})

describe('rankGalleryBacklog', () => {
  it('keeps only open, gallery-less restaurants with a Place ID', () => {
    const result = rankGalleryBacklog([
      restaurant('ready'),
      restaurant('has-gallery', { galleryCount: 2 }),
      restaurant('no-place-id', { hasGooglePlaceId: false }),
      restaurant('closed', { isOpen: false }),
    ])
    expect(result.map((r) => r.slug)).toEqual(['ready'])
  })

  it('prioritises high-value surfaces', () => {
    const result = rankGalleryBacklog([
      restaurant('ordinary'),
      restaurant('featured', { featured: true }),
      restaurant('anon', { tierAnon: true }),
    ])
    expect(result.map((r) => r.slug)).toEqual(['anon', 'featured', 'ordinary'])
  })
})

describe('rankDescriptionBacklog', () => {
  it('keeps only open restaurants with thin long-form copy', () => {
    const result = rankDescriptionBacklog([
      restaurant('thin-copy', { descriptionLength: 100 }),
      restaurant('strong-copy'),
      restaurant('closed', { descriptionLength: 100, isOpen: false }),
    ])
    expect(result.map((r) => r.slug)).toEqual(['thin-copy'])
  })

  it('prioritises high-value surfaces and existing source material', () => {
    const result = rankDescriptionBacklog([
      restaurant('ordinary', { descriptionLength: 100 }),
      restaurant('editorial-ready', {
        descriptionLength: 300,
        featured: true,
        hasShortDescription: true,
        hasTip: true,
        hasMenuUrl: true,
        lastReviewed: '2026-06-01',
      }),
    ])
    expect(result.map((r) => r.slug)).toEqual(['editorial-ready', 'ordinary'])
    expect(result[0].reasons).toContain('Kurzbeschreibung als Quelle')
    expect(result[0].reasons).toContain('Tipp als Quelle')
  })
})

describe('filterBySlugs', () => {
  it('keeps source order and only exact requested slugs', () => {
    const items = [{ slug: 'a' }, { slug: 'b' }, { slug: 'c' }]
    expect(filterBySlugs(items, ['c', 'a'])).toEqual([{ slug: 'a' }, { slug: 'c' }])
  })

  it('returns all items when no slug filter is provided', () => {
    const items = [{ slug: 'a' }]
    expect(filterBySlugs(items, [])).toBe(items)
  })
})
