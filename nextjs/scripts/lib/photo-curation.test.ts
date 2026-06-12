import { describe, it, expect } from 'vitest'
import { selectGalleryPhotos, parseJudgments, type PhotoJudgment } from './photo-curation'

const j = (index: number, score: number, category: PhotoJudgment['category'] = 'interior'): PhotoJudgment =>
  ({ index, score, category })

describe('selectGalleryPhotos', () => {
  it('picks top-scored photos above threshold, max 4, sorted by score', () => {
    const judgments = [j(0, 9), j(1, 5), j(2, 8), j(3, 7), j(4, 6.5), j(5, 10)]
    expect(selectGalleryPhotos(judgments, 6)).toEqual([5, 0, 2, 3])
  })

  it('drops unusable photos regardless of score', () => {
    const judgments = [j(0, 9, 'unusable'), j(1, 7), j(2, 8)]
    expect(selectGalleryPhotos(judgments, 3)).toEqual([2, 1])
  })

  it('guarantees the best food shot is included when one is usable', () => {
    const judgments = [j(0, 9), j(1, 8.5), j(2, 8), j(3, 7.5), j(4, 6, 'food')]
    expect(selectGalleryPhotos(judgments, 5)).toEqual([4, 0, 1, 2])
  })

  it('returns empty when nothing clears the threshold', () => {
    expect(selectGalleryPhotos([j(0, 3), j(1, 5.9)], 2)).toEqual([])
  })

  it('falls back to the first 3 candidates when judgments are null (Haiku down)', () => {
    expect(selectGalleryPhotos(null, 5)).toEqual([0, 1, 2])
    expect(selectGalleryPhotos(null, 2)).toEqual([0, 1])
  })

  it('ignores judgments with out-of-range indexes', () => {
    expect(selectGalleryPhotos([j(7, 9), j(0, 8)], 2)).toEqual([0])
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
