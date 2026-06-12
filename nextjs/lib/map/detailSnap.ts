/* Height math for the mobile detail sheet's bottom anchor (the "middle
   stage"): everything from the sheet's top edge down to the bottom of the
   prev/next pager (or the hero photo when no pager is rendered), plus a
   small buffer and the iOS safe area.

   The measured path (useMapSheet) feeds the live bottom-edge offset of the
   last visible element into `detailMidVisiblePx` — measuring the offset
   instead of summing element heights keeps margins and gaps between the
   handle, hero and pager included automatically.

   `estimateDetailMidVisiblePx` approximates the same value BEFORE the
   detail has mounted — used as the pre-measurement fallback peek and for
   flyTo padding on pin-tap, where the hero of the newly selected
   restaurant doesn't exist in the DOM yet. */

/** Sheet top edge → hero top: handle pip zone + the hero's 14px top margin
 *  (map.module.css .rdHero). Calibrated against the rendered layout. */
export const DETAIL_SHEET_TOP_TO_HERO_PX = 50
/** Gap between hero bottom and pager top = the hero's 14px bottom margin. */
export const DETAIL_HERO_MARGIN_BOTTOM_PX = 14
/** Pager row estimate: 2×10px padding + ~21px content line (map.module.css .rdPager). */
export const DETAIL_PAGER_ESTIMATE_PX = 41
/** Sub-pixel rounding buffer below the last visible element. */
export const DETAIL_PEEK_BUFFER_PX = 4
/** Hero horizontal margins: 14px each side (map.module.css .rdHero). */
const HERO_SIDE_MARGINS_PX = 28
/** Hero aspect ratio is 4/5 (portrait) → height = width × 5/4. */
const HERO_HEIGHT_RATIO = 5 / 4

/** Visible sheet height at the middle stage, from the measured offset of
 *  the last visible element's bottom edge relative to the sheet's top. */
export function detailMidVisiblePx(contentBottomPx: number, safeAreaBottom: number): number {
  return contentBottomPx + DETAIL_PEEK_BUFFER_PX + safeAreaBottom
}

export function estimateDetailMidVisiblePx(viewportW: number, hasPager: boolean, safeAreaBottom: number): number {
  const heroPx = Math.round((viewportW - HERO_SIDE_MARGINS_PX) * HERO_HEIGHT_RATIO)
  const contentBottom = DETAIL_SHEET_TOP_TO_HERO_PX + heroPx
    + (hasPager ? DETAIL_HERO_MARGIN_BOTTOM_PX + DETAIL_PAGER_ESTIMATE_PX : 0)
  return detailMidVisiblePx(contentBottom, safeAreaBottom)
}
