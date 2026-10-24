import { describe, expect, it } from 'vitest';
import {
  DETAIL_SHEET_TOP_TO_HERO_PX,
  DETAIL_PEEK_BUFFER_PX,
  detailMidVisiblePx,
  estimateDetailMidVisiblePx,
} from './detailSnap';

describe('detailMidVisiblePx', () => {
  it('adds buffer + safe area to the measured content bottom offset', () => {
    expect(detailMidVisiblePx(558, 34)).toBe(558 + DETAIL_PEEK_BUFFER_PX + 34);
  });

  it('works without a safe area', () => {
    expect(detailMidVisiblePx(500, 0)).toBe(500 + DETAIL_PEEK_BUFFER_PX);
  });
});

describe('estimateDetailMidVisiblePx', () => {
  it('estimates handle zone + 4:5 hero, ending at the hero bottom', () => {
    // 390px viewport: hero width 390-28=362 → height 362*5/4=452.5 → round 453
    const contentBottom = DETAIL_SHEET_TOP_TO_HERO_PX + 453;
    expect(estimateDetailMidVisiblePx(390, 34)).toBe(detailMidVisiblePx(contentBottom, 34));
    expect(estimateDetailMidVisiblePx(390, 0)).toBe(detailMidVisiblePx(contentBottom, 0));
  });
});
