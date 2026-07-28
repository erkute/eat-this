/**
 * The phone sheet's three stops, mirroring Google Maps' bottom sheet.
 *
 * Both phone views are window-scrolled in-flow documents (see
 * useHandleScrollDrag for why), so a "stop" is nothing but a scroll offset.
 * Each stop is defined by how much MAP is left uncovered there, which keeps
 * the two views comparable even though their map layers differ:
 *
 * - list:   the map is a sticky 100dvh layer and the list slides over it.
 * - detail: the map is a bounded strip in normal flow that scrolls away. It
 *           must never become a full-viewport compositor — that is what broke
 *           Safari's URL-bar backdrop (bisected on-device 2026-07-06).
 */
export type PhoneSnap = 'map' | 'split' | 'sheet';

export const PHONE_SNAPS: PhoneSnap[] = ['map', 'split', 'sheet'];

/* Map left uncovered at each stop, in dvh. Index matches PHONE_SNAPS. */
const LIST_MAP_DVH = [72, 50, 0];
const DETAIL_MAP_DVH = [50, 27, 0];

/** List rest state: 100dvh − 72dvh of map ⇒ this much list is visible. */
export const LIST_REST_VISIBLE_DVH = 100 - LIST_MAP_DVH[0];
/** Total height of the detail's map strip — its widest stop. */
export const DETAIL_PEEK_DVH = DETAIL_MAP_DVH[0];

/**
 * Scroll offsets of the three stops, largest map first.
 *
 * The map shrinks as the document scrolls, so a stop's offset is simply how
 * far the map has to travel from its resting size down to that stop's size.
 */
export function snapOffsets(
  view: 'list' | 'detail',
  viewportH: number,
  /**
   * Measured document offset of the sheet's top edge — exactly how far to
   * scroll for it to sit flush with the viewport top.
   *
   * Strongly preferred over the dvh estimate: on iOS the CSS sizes the map in
   * `dvh` while JS reads `window.innerHeight`, and the two disagree while the
   * URL bar collapses. Deriving the last stop from the estimate stranded the
   * sheet — and with it the handle — roughly a safe-area below the top, so it
   * never travelled under the status bar.
   */
  sheetTopPx?: number
): number[] {
  const map = view === 'list' ? LIST_MAP_DVH : DETAIL_MAP_DVH;
  const rest = map[0];
  const full = sheetTopPx ?? Math.round((rest / 100) * viewportH);
  return map.map((dvh) => Math.round((1 - dvh / rest) * full));
}

/**
 * Which stop a released drag should settle on.
 *
 * Intent beats proximity: any deliberate movement carries you to the next stop
 * even if you did not drag all the way there, which is what makes the gesture
 * feel light. Below that threshold the nearest stop wins, so a stray tap or a
 * tiny wobble parks you where you already were rather than jumping.
 */
export function resolveSnap(
  offsets: number[],
  scrollY: number,
  startScrollY: number,
  intentPx = 24
): number {
  const delta = scrollY - startScrollY;
  const nearestTo = (y: number) =>
    offsets.reduce((best, o) => (Math.abs(o - y) < Math.abs(best - y) ? o : best), offsets[0]);

  if (Math.abs(delta) < intentPx) return nearestTo(scrollY);

  // Past the last stop the sheet is fully up and the list scrolls freely —
  // snapping back there would fight the user mid-read.
  const last = offsets[offsets.length - 1];
  if (scrollY > last) return scrollY;

  const startIndex = offsets.indexOf(nearestTo(startScrollY));
  const step = delta > 0 ? 1 : -1;
  const target = Math.min(offsets.length - 1, Math.max(0, startIndex + step));
  // Distance fallback: a long drag may cross more than one stop, and stopping
  // one short of where the finger clearly went reads as the sheet fighting back.
  const nearest = nearestTo(scrollY);
  return step > 0 ? Math.max(offsets[target], nearest) : Math.min(offsets[target], nearest);
}
