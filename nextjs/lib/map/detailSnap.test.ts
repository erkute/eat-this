import { describe, expect, it } from 'vitest'
import {
  DETAIL_SHEET_TOP_TO_HERO_PX,
  DETAIL_HERO_MARGIN_BOTTOM_PX,
  DETAIL_PAGER_ESTIMATE_PX,
  DETAIL_PEEK_BUFFER_PX,
  detailMidVisiblePx,
  estimateDetailMidVisiblePx,
} from './detailSnap'

describe('detailMidVisiblePx', () => {
  it('adds buffer + safe area to the measured content bottom offset', () => {
    expect(detailMidVisiblePx(558, 34)).toBe(558 + DETAIL_PEEK_BUFFER_PX + 34)
  })

  it('works without a safe area', () => {
    expect(detailMidVisiblePx(500, 0)).toBe(500 + DETAIL_PEEK_BUFFER_PX)
  })
})

describe('estimateDetailMidVisiblePx', () => {
  it('estimates handle zone + 4:5 hero + hero bottom margin + pager', () => {
    // 390px viewport: hero width 390-28=362 → height 362*5/4=452.5 → round 453
    const contentBottom = DETAIL_SHEET_TOP_TO_HERO_PX + 453
      + DETAIL_HERO_MARGIN_BOTTOM_PX + DETAIL_PAGER_ESTIMATE_PX
    expect(estimateDetailMidVisiblePx(390, true, 34)).toBe(detailMidVisiblePx(contentBottom, 34))
  })

  it('ends at the hero bottom when hasPager is false', () => {
    const contentBottom = DETAIL_SHEET_TOP_TO_HERO_PX + 453
    expect(estimateDetailMidVisiblePx(390, false, 0)).toBe(detailMidVisiblePx(contentBottom, 0))
  })
})
