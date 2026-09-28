/**
 * The phone sheet's three stops, mirroring Google Maps' bottom sheet.
 *
 * Both phone views are window-scrolled in-flow documents (see
 * useHandleScrollDrag for why), so a "stop" is nothing but a scroll offset.
 * Each stop is defined by how much MAP is left uncovered there, which keeps
 * the two views comparable even though their map layers differ:
 *
 * - list:   the map is a sticky 100lvh layer and the list slides over it.
 * - detail: the same sticky 100lvh map; the detail sheet rests lower in it
 *           (its margin, MapSheet.module.css), so its stops differ.
 *
 * The grip no longer snaps to them: it leaves the sheet wherever it is let
 * go (user, 28.09.2026, useHandleScrollDrag). The first and last stop are
 * its bounds and the targets of a tap on it; the middle one is where
 * filters and the camera put the list.
 */

/* Map left uncovered at each stop, in dvh. Index order: map, split, sheet. */
const LIST_MAP_DVH = [72, 50, 0];
const DETAIL_MAP_DVH = [50, 27, 0];

/** List rest state: 100dvh − 72dvh of map ⇒ this much list is visible. */
export const LIST_REST_VISIBLE_DVH = 100 - LIST_MAP_DVH[0];
/** Total height of the detail's map strip — its widest stop. */
export const DETAIL_PEEK_DVH = DETAIL_MAP_DVH[0];

/** Filters leave half the phone plus a 16px gutter for the map, including short screens. */
export function phoneListMidVisiblePx(viewportHeight: number): number {
  return Math.min(440, Math.max(0, Math.round(viewportHeight / 2) - 16));
}

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
 * Document offset of the sheet's top edge — exactly how far to scroll for it
 * to sit flush with the viewport top, i.e. the LAST stop.
 *
 * Measured rather than derived: on iOS the CSS sizes the map in `dvh` while JS
 * reads `window.innerHeight`, and the two disagree while the URL bar collapses.
 * Deriving the stop from the dvh estimate stranded the sheet roughly a
 * safe-area below the top.
 */
export function measureSheetTop(): number | undefined {
  const sheet = document.querySelector('[data-map-sheet]');
  if (!sheet) return undefined;
  return Math.round(sheet.getBoundingClientRect().top + window.scrollY);
}

/** What the map/list toggle offers at a given scroll position, or nothing. */
export type ToggleMode = 'toMap' | 'toList' | null;

/* Slack around a stop. Rounded stop offsets and iOS rubber-banding both land a
   few px off the exact value. */
const AT_STOP_PX = 24;

/**
 * Which way the map/list toggle points at `scrollY` — the pill's whole
 * visibility rule.
 *
 * - Past the LAST stop the map is fully covered: offer the way back to it.
 * - At or above the MIDDLE stop, with a remembered list position: offer the way
 *   back down. Without a remembered position there is nothing to return to and
 *   the pill stays away.
 * - In the stretch between, the map is half on screen anyway and the pill would
 *   be noise.
 *
 * The middle stop — not the top — is what bounds the 'toList' half. Keying it
 * to the map stop meant a 24px nudge made the pill vanish, which reads as it
 * flinching away from the finger.
 */
export function resolveToggleMode(
  offsets: number[],
  scrollY: number,
  hasRememberedListY: boolean
): ToggleMode {
  const sheetStop = offsets[offsets.length - 1];
  /* Second-to-last stop: the middle one of the three, and still meaningful if
     a view ever declares only two. */
  const splitStop = offsets[Math.max(0, offsets.length - 2)];
  if (scrollY >= sheetStop - AT_STOP_PX) return 'toMap';
  if (hasRememberedListY && scrollY <= splitStop + AT_STOP_PX) return 'toList';
  return null;
}

/** What the phone list does with its scroll position when a detail closes. */
export type ListReturn = 'restore' | 'toList' | 'toMap' | 'stay';

/** Where a detail was opened from — decides where closing it lands. */
export type DetailOrigin = 'list' | 'map';

/**
 * Where the phone list lands when a detail hands the view back.
 *
 * Both phone views are window-scrolled documents, so "which view you get back"
 * is nothing but a scroll offset — and closing a detail leaves the window
 * wherever the article happened to be, which in list geometry is the MAP stop.
 *
 * - `restore`: a remembered position means the detail was opened from the list.
 *   Put the user back on the row they left; that is the only place they expect.
 * - `toMap`: the detail was opened from a marker on the map. The map is where
 *   the user was, so the map is where closing puts them back — list peeking at
 *   the bottom, camera where they left it (user decision 03.09.2026).
 * - `toList`: no remembered position and not a marker tap means a deep link.
 *   Leaving the scroll alone dropped the user on the bare map — from a button
 *   that says "Liste". Scroll to the TOP of the list — not to the spot's row,
 *   which was never on screen and, aimed at, left the visitor deep in the list
 *   with everything else above them (user, 04.09.2026).
 * - `stay`: not a return from a detail at all (first paint of the map, a filter
 *   change). Nothing here may move the list.
 *
 * Deliberately the same answer for every way out of a detail — the X, a
 * swipe-down dismiss and the back gesture all land in the same place, because
 * the detail is a place you leave TO somewhere, not a step you undo.
 */
export function resolveListReturn(
  rememberedY: number,
  cameFromDetail: boolean,
  origin: DetailOrigin = 'list'
): ListReturn {
  if (!cameFromDetail) return 'stay';
  if (origin === 'map') return 'toMap';
  return rememberedY > 0 ? 'restore' : 'toList';
}

/**
 * Scroll offset that puts a list row on screen when a detail closes.
 *
 * Landing on "the list" is not the same as landing on the spot you were just
 * reading: a marker tap can open the 40th row, and a list scrolled to its top
 * has that row nowhere near the screen. So the row itself is the target.
 *
 * It lands a little above the middle — with list above it and list below it,
 * which is what says "you are back in the list AT this spot" rather than "here
 * is a spot". `minY` keeps the list from sliding back under the map for the
 * first few rows: their natural position would be a scroll of almost nothing,
 * i.e. the map stop again.
 */
export function rowRevealOffset(
  rowTopDoc: number,
  viewportH: number,
  minY: number,
  rememberedTop?: number | null
): number {
  return Math.max(0, minY, Math.round(rowTopDoc - rowRevealTop(viewportH, rememberedTop)));
}

/* Upper bound for where a returning row may sit: its top at 62% of the height
   leaves the whole card on screen. A row tapped at the very bottom edge would
   otherwise come back at the very bottom edge — technically "where you left
   it", but it reads as the list having lost your place (user, 03.09.2026). */
export const ROW_RETURN_MAX_TOP_RATIO = 0.62;
/* Where a row lands when nothing is remembered: a little above the middle. */
const ROW_REVEAL_TOP_RATIO = 0.38;

/**
 * How far from the top of the viewport (or the panel's port) the returning row
 * should sit. A remembered offset — the row's own position when it was tapped —
 * wins, clamped so the row is always fully on screen; without one the row
 * lands a little above the middle.
 */
export function rowRevealTop(viewportH: number, rememberedTop?: number | null): number {
  if (rememberedTop == null || !Number.isFinite(rememberedTop)) {
    return viewportH * ROW_REVEAL_TOP_RATIO;
  }
  return Math.min(Math.max(0, rememberedTop), viewportH * ROW_RETURN_MAX_TOP_RATIO);
}
