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
    // all owners; products first by score: food0(8), food2(7), drink3(7); then interior1
    expect(selectGalleryPhotos(judgments, owners([0, 1, 2, 3], 4), 4)).toEqual([0, 2, 3, 1])
  })

  it('uses only original (owner) photos, never guests', () => {
    const judgments = [j(0, 9, 'food'), j(1, 9, 'food')]
    // index 1 is a guest → excluded even at the same score
    expect(selectGalleryPhotos(judgments, owners([0], 2), 2)).toEqual([0])
  })

  it('returns nothing when a spot has no usable originals', () => {
    const judgments = [j(0, 9, 'food'), j(1, 8, 'food')]
    expect(selectGalleryPhotos(judgments, owners([], 2), 2)).toEqual([])
  })

  it('drops menu/exterior and a bad original below the floor', () => {
    const judgments = [j(0, 9, 'food'), j(1, 8, 'menu'), j(2, 7, 'exterior'), j(3, 4, 'food')]
    expect(selectGalleryPhotos(judgments, owners([0, 1, 2, 3], 4), 4)).toEqual([0])
  })

  it('never returns an all-interior ("just the shop") gallery', () => {
    expect(selectGalleryPhotos([j(0, 9, 'interior'), j(1, 8, 'interior')], owners([0, 1], 2), 2)).toEqual([])
  })

  it('fills up to 4 from originals, product-first', () => {
    const judgments = [j(0, 8, 'food'), j(1, 7, 'interior'), j(2, 9, 'food'), j(3, 7, 'drink'), j(4, 9, 'food')]
    // 0-3 are owners (guest 4 excluded): products food2(9), food0(8), drink3(7), then interior1
    expect(selectGalleryPhotos(judgments, owners([0, 1, 2, 3], 5), 5)).toEqual([2, 0, 3, 1])
  })

  it('falls back to original photos in candidate order when judgments are null', () => {
    expect(selectGalleryPhotos(null, owners([1, 3], 4), 4)).toEqual([1, 3])
    expect(selectGalleryPhotos(null, owners([], 2), 2)).toEqual([])
  })

  it('ignores out-of-range indexes', () => {
    expect(selectGalleryPhotos([j(7, 9, 'food'), j(0, 8, 'food')], owners([0, 7], 2), 2)).toEqual([0])
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

  it('matches owners across name variants (English/German, dropped suffix)', () => {
    expect(isOwnerPhoto('Albatross Bakery', 'Albatross Bäckerei')).toBe(true)
    expect(isOwnerPhoto('Five Elephant Kreuzberg', 'Five Elephant Kreuzberg')).toBe(true)
    expect(isOwnerPhoto('Albert Rossi', 'Albatross Bäckerei')).toBe(false)
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
