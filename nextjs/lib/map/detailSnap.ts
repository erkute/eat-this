/* Height math for the mobile detail sheet's bottom anchor (the "middle stage"):
   everything from the sheet's top edge down to the bottom of the hero photo (a
   restaurant has no pager; the must-eat detail's measured kicker row stands in
   for it there), plus a small buffer and the iOS safe area.

   The measured path (useMapSheet) feeds the live bottom-edge offset of the last
   visible element into `detailMidVisiblePx`; measuring the offset instead of
   summing element heights keeps margins and gaps included.

   `estimateDetailMidVisiblePx` approximates the same value before the detail
   has mounted: the pre-measurement fallback peek and the flyTo padding on
   pin-tap, where the hero of the newly selected restaurant isn't in the DOM
   yet. */

/**
 * Sheet top edge → hero top: handle pip zone + the hero's top margin
 * (RestaurantDetail.module.css .rdHero). Calibrated against the rendered
 * layout.
 */
export const DETAIL_SHEET_TOP_TO_HERO_PX = 50;
/** Sub-pixel rounding buffer below the last visible element. */
export const DETAIL_PEEK_BUFFER_PX = 4;
/** Hero horizontal margins, both sides (RestaurantDetail.module.css .rdHero). */
const HERO_SIDE_MARGINS_PX = 28;
/** Hero aspect ratio is 4/5 (portrait) → height = width × 5/4. */
const HERO_HEIGHT_RATIO = 5 / 4;

/** Visible sheet height at the middle stage, from the measured offset of
 *  the last visible element's bottom edge relative to the sheet's top. */
export function detailMidVisiblePx(contentBottomPx: number, safeAreaBottom: number): number {
  return contentBottomPx + DETAIL_PEEK_BUFFER_PX + safeAreaBottom;
}

export function estimateDetailMidVisiblePx(viewportW: number, safeAreaBottom: number): number {
  const heroPx = Math.round((viewportW - HERO_SIDE_MARGINS_PX) * HERO_HEIGHT_RATIO);
  return detailMidVisiblePx(DETAIL_SHEET_TOP_TO_HERO_PX + heroPx, safeAreaBottom);
}
