import { describe, it, expect } from 'vitest'
import { selectGalleryPhotos, isOwnerPhoto, parseJudgments, type PhotoJudgment } from './photo-curation'

const j = (index: number, score: number, category: PhotoJudgment['category'] = 'interior'): PhotoJudgment =>
  ({ index, score, category })

// Build an owners boolean array of length n with the given indexes flagged.
const owners = (ownerIdx: number[], n: number) =>
  Array.from({ length: n }, (_, i) => ownerIdx.includes(i))

describe('selectGalleryPhotos', () => {
  it('puts product (food + drink) before interior, then by score', () => {
    const judgments = [j(0, 8, 'food'), j(1, 9, 'interior'), j(2, 7, 'food'), j(3, 7, 'drink')]
    // products first by score: food0(8), food2(7), drink3(7); then interior1
    expect(selectGalleryPhotos(judgments, owners([], 4), 4)).toEqual([0, 2, 3, 1])
  })

  it('only keeps top-tier photos (floor is 7 across categories)', () => {
    const judgments = [j(0, 7, 'food'), j(1, 8, 'drink'), j(2, 6, 'drink'), j(3, 6, 'food')]
    // drink2 (6) and food3 (6) fail the floor; eligible drink1(8) + food0(7)
    expect(selectGalleryPhotos(judgments, owners([], 4), 4)).toEqual([1, 0])
  })

  it('drops drink/menu/exterior and amateur food below floor', () => {
    const judgments = [j(0, 9, 'food'), j(1, 8, 'menu'), j(2, 7, 'exterior'), j(3, 4, 'food')]
    expect(selectGalleryPhotos(judgments, owners([], 4), 4)).toEqual([0])
  })

  it('never returns an all-interior ("just the shop") gallery', () => {
    expect(selectGalleryPhotos([j(0, 9, 'interior'), j(1, 8, 'interior')], owners([], 2), 2)).toEqual([])
    // amateur food fails the floor, leaving only shop interiors → nothing
    expect(selectGalleryPhotos([j(0, 4, 'food'), j(1, 5, 'interior')], owners([], 2), 2)).toEqual([])
  })

  it('puts originals (owner photos) first, even an owner interior before a guest product', () => {
    const judgments = [j(0, 9, 'food'), j(1, 7, 'interior')]
    expect(selectGalleryPhotos(judgments, owners([1], 2), 2)).toEqual([1, 0])
  })

  it('fills all 4 with originals when 4 owner photos exist', () => {
    const judgments = [j(0, 8, 'food'), j(1, 7, 'interior'), j(2, 9, 'food'), j(3, 7, 'drink'), j(4, 9, 'food')]
    // 0-3 are owners → fill the gallery (product-first), guest 4 excluded
    expect(selectGalleryPhotos(judgments, owners([0, 1, 2, 3], 5), 5)).toEqual([2, 0, 3, 1])
  })

  it('falls back to owner-first original order when judgments are null (model down)', () => {
    expect(selectGalleryPhotos(null, owners([2, 4], 5), 5)).toEqual([2, 4, 0, 1])
    expect(selectGalleryPhotos(null, owners([], 2), 2)).toEqual([0, 1])
  })

  it('ignores judgments with out-of-range indexes', () => {
    expect(selectGalleryPhotos([j(7, 9, 'food'), j(0, 8, 'food')], owners([], 2), 2)).toEqual([0])
  })
})

describe('isOwnerPhoto', () => {
  it('flags photos whose attribution contains the restaurant name', () => {
    expect(isOwnerPhoto('136 Berlin Restaurant', '136 Berlin Restaurant')).toBe(true)
    expect(isOwnerPhoto('Hafenküche Berlin - Hafenjungs Berlin GmbH', 'Hafenküche')).toBe(true)
    expect(isOwnerPhoto('ZOLA - Paul-Lincke-Ufer - Kreuzberg', 'ZOLA')).toBe(true)
  })

  it('treats guest names as non-owner', () => {
    expect(isOwnerPhoto('Nico Scheiffert', '136 Berlin Restaurant')).toBe(false)
    expect(isOwnerPhoto('Sonja Egger', 'Ristorante Osteria Centrale')).toBe(false)
    expect(isOwnerPhoto(undefined, 'Whatever')).toBe(false)
  })

  it('requires an exact match for very short restaurant names', () => {
    expect(isOwnerPhoto('963', '963')).toBe(true)
    expect(isOwnerPhoto('Bob 963 fan', '963')).toBe(false)
  })
})

describe('parseJudgments', () => {
  it('parses a clean JSON array', () => {
    const text = '[{"index":0,"category":"food","score":8.5},{"index":1,"category":"unusable","score":2}]'
    expect(parseJudgments(text, 2)).toEqual([
      { index: 0, category: 'food', score: 8.5 },
      { index: 1, category: 'unusable', score: 2 },
    ])
  })

  it('extracts the array from surrounding prose / code fences', () => {
    const text = 'Here you go:\n```json\n[{"index":0,"category":"interior","score":7}]\n```'
    expect(parseJudgments(text, 1)).toEqual([{ index: 0, category: 'interior', score: 7 }])
  })

  it('returns null on garbage or wrong shapes', () => {
    expect(parseJudgments('not json', 2)).toBeNull()
    expect(parseJudgments('[{"index":"a"}]', 2)).toBeNull()
    expect(parseJudgments('[{"index":0,"category":"selfie","score":5}]', 1)).toBeNull()
  })
})
