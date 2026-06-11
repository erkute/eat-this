/* Height math for the mobile detail sheet's bottom anchor (the "middle
   stage"): handle pip + full hero photo + prev/next pager + buffer + iOS
   safe area. The measured path (useMapSheet's ResizeObservers) feeds real
   element heights into `detailMidVisiblePx`; `estimateDetailMidVisiblePx`
   approximates the same value BEFORE the detail has mounted — used as the
   pre-measurement fallback peek and for flyTo padding on pin-tap, where the
   hero of the newly selected restaurant doesn't exist in the DOM yet. */

/** Grab-handle zone height above the hero (matches HANDLE_PX in useMapSheet). */
export const DETAIL_HANDLE_PX = 44
/** Sub-pixel rounding buffer below the pager (matches the +4 in useMapSheet). */
export const DETAIL_PEEK_BUFFER_PX = 4
/** Pager row estimate: 2×10px padding + ~21px content line (map.module.css .rdPager). */
export const DETAIL_PAGER_ESTIMATE_PX = 41
/** Hero horizontal margins: 14px each side (map.module.css .rdHero). */
const HERO_SIDE_MARGINS_PX = 28
/** Hero aspect ratio is 4/5 (portrait) → height = width × 5/4. */
const HERO_HEIGHT_RATIO = 5 / 4

export function detailMidVisiblePx(heroPx: number, pagerPx: number, safeAreaBottom: number): number {
  return DETAIL_HANDLE_PX + heroPx + pagerPx + DETAIL_PEEK_BUFFER_PX + safeAreaBottom
}

export function estimateDetailMidVisiblePx(viewportW: number, hasPager: boolean, safeAreaBottom: number): number {
  const heroPx = Math.round((viewportW - HERO_SIDE_MARGINS_PX) * HERO_HEIGHT_RATIO)
  return detailMidVisiblePx(heroPx, hasPager ? DETAIL_PAGER_ESTIMATE_PX : 0, safeAreaBottom)
}
