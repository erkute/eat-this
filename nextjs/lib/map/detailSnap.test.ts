import { describe, expect, it } from 'vitest'
import {
  DETAIL_HANDLE_PX,
  DETAIL_PEEK_BUFFER_PX,
  DETAIL_PAGER_ESTIMATE_PX,
  detailMidVisiblePx,
  estimateDetailMidVisiblePx,
} from './detailSnap'

describe('detailMidVisiblePx', () => {
  it('sums handle + hero + pager + buffer + safe area', () => {
    expect(detailMidVisiblePx(453, 41, 34)).toBe(DETAIL_HANDLE_PX + 453 + 41 + DETAIL_PEEK_BUFFER_PX + 34)
  })

  it('degrades to photo-only when no pager is rendered (pagerPx 0)', () => {
    expect(detailMidVisiblePx(453, 0, 0)).toBe(DETAIL_HANDLE_PX + 453 + DETAIL_PEEK_BUFFER_PX)
  })
})

describe('estimateDetailMidVisiblePx', () => {
  it('estimates the hero as a 4:5 photo with 14px side margins', () => {
    // 390px viewport: hero width 390-28=362 → height 362*5/4=452.5 → round 453
    const expected = detailMidVisiblePx(453, DETAIL_PAGER_ESTIMATE_PX, 34)
    expect(estimateDetailMidVisiblePx(390, true, 34)).toBe(expected)
  })

  it('omits the pager estimate when hasPager is false', () => {
    const expected = detailMidVisiblePx(453, 0, 0)
    expect(estimateDetailMidVisiblePx(390, false, 0)).toBe(expected)
  })
})
