import { describe, it, expect } from 'vitest'
import { selectGalleryPhotos, isOwnerPhoto, parseJudgments, type PhotoJudgment } from './photo-curation'

const j = (index: number, score: number, category: PhotoJudgment['category'] = 'interior'): PhotoJudgment =>
  ({ index, score, category })

// Build an owners boolean array of length n with the given indexes flagged.
const owners = (ownerIdx: number[], n: number) =>
  Array.from({ length: n }, (_, i) => ownerIdx.includes(i))

describe('selectGalleryPhotos', () => {
  it('keeps only food + interior, dropping drink/menu/exterior/unusable', () => {
    const judgments = [
      j(0, 9, 'food'), j(1, 5, 'menu'), j(2, 8, 'interior'),
      j(3, 7, 'drink'), j(4, 6.5, 'food'), j(5, 10, 'exterior'),
    ]
    // eligible: 0(food,9), 2(interior,8), 4(food,6.5) — no owners → by score
    expect(selectGalleryPhotos(judgments, owners([], 6), 6)).toEqual([0, 2, 4])
  })

  it('puts owner photos first, then guest photos by score', () => {
    const judgments = [j(0, 9, 'food'), j(1, 8.5, 'interior'), j(2, 8, 'food'), j(3, 7.5, 'interior'), j(4, 6, 'food')]
    // index 4 is the owner → first despite the lowest score, then 0,1,2 by score
    expect(selectGalleryPhotos(judgments, owners([4], 5), 5)).toEqual([4, 0, 1, 2])
  })

  it('drops amateur photos below the score floor (5), even if it means fewer than 4', () => {
    const judgments = [j(0, 3, 'food'), j(1, 2, 'interior'), j(2, 9, 'food'), j(3, 6, 'interior')]
    // only 2 and 3 clear the floor; 0 and 3 are amateur (score < 5)
    expect(selectGalleryPhotos(judgments, owners([], 4), 4)).toEqual([2, 3])
  })

  it('returns fewer than 4 when too few food/interior photos exist', () => {
    const judgments = [j(0, 9, 'food'), j(1, 8, 'menu'), j(2, 7, 'exterior'), j(3, 6, 'drink')]
    expect(selectGalleryPhotos(judgments, owners([], 4), 4)).toEqual([0])
  })

  it('falls back to owner-first original order when judgments are null (Haiku down)', () => {
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
