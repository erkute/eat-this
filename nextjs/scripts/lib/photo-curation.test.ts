import { describe, it, expect } from 'vitest'
import { selectGalleryPhotos, type PhotoJudgment } from './photo-curation'

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
