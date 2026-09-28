/**
 * Pulling the phone list off the map and back — the Google Maps / Airbnb
 * gesture, built on a window-scrolled page.
 *
 * The phone list is a window-scrolled document with the map as a sticky layer
 * behind it (see phoneSheetSnaps.ts). Deep in the list, the way back to the map
 * is the grabber in the sticky filter bar: pull it down and the list follows
 * the finger, let go and it glides down to its resting place above the map —
 * or further, to the lowest stop, where only the bar is left above the bottom.
 * Back on the map the list starts at its top again. Remembering the row it
 * was pulled from and keeping it in the peek left a cut-off or empty sheet
 * over the map (user, 27.09.2026).
 *
 * Under the hood the list never scrolls through its rows on the way. The slab
 * on screen is moved by a transform, and the scroll position changes only at
 * the resting line, where the bar sits in the same place before and after.
 * Going back to the top by scrolling was the old route, and iOS Safari runs a
 * programmatic smooth scroll in a fixed short time whatever the distance —
 * from three thousand pixels down it read as a jump.
 *
 * The bar never reaches the bottom edge. The first version let the slab drop
 * out through the bottom of the screen, and on the way the sticky filter bar
 * crossed that edge: iOS Safari tints its URL bar after a sticky container
 * there and keeps the colour afterwards, so the translucent bar turned black
 * (user, 22.09.2026). At the lowest stop LOWERED_GAP_PX of rows stay below
 * the bar for that reason.
 *
 * The document itself is never frozen, fixed or overflow-locked: it stays the
 * window-scrolled page it always was, which keeps it flowing behind Safari's
 * and Chrome's toolbars (and lets them collapse). The transform exists for the
 * length of a gesture, and at the lowest stop, which lies below scroll 0.
 */

import { safeAreaInsetTop } from './safeArea';

/** Map left showing above the sheet when it is all the way up — the bar
 *  sticks below it and the sheet cuts itself off there (MapSheet.module.css,
 *  `stripCut`). Mirrors `--map-strip` in MapLayout.module.css (minus the
 *  safe-area term, which mapStripLine adds). */
export const MAP_STRIP_PX = 72;

/** Where the strip ends on screen: the line the sticky bar rests on. */
export function mapStripLine(): number {
  return safeAreaInsetTop() + MAP_STRIP_PX;
}

/** Fired on window when a grip gesture has come to rest — at the lowest stop,
 *  the map stop or back on the list. The lowest stop moves the sheet by
 *  transform, which no scroll event reports (useMapCamera listens). */
export const SHEET_SETTLED_EVENT = 'et:map-sheet-settled';
const announceSettled = () => window.dispatchEvent(new Event(SHEET_SETTLED_EVENT));

/* Decelerates into its stop. */
const SETTLE_MS = 360;
const SETTLE_EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

/** Sheet left on screen below the bar at the lowest stop — a sliver of rows.
 *  It keeps the sticky bar clear of the bottom edge, where iOS Safari samples
 *  4px in and would tint its URL bar after it (see above). */
export const LOWERED_GAP_PX = 24;

/* The sheet currently held at the lowest stop, if any. Module state for the
   same reason the strip line is: there is one map page. */
let lowered: HTMLElement | null = null;

/* What stands on the sheet's resting edge over the map: the locate button's
   dock and the map credit (ODbL wants it on the map) — its control, since the
   credit's container carries the scroll ride on the same property. */
const FOLLOWERS = '[data-locate-dock], .maplibregl-ctrl-bottom-left > .maplibregl-ctrl';
let followed = 0;

/** How far the sheet stands below its resting edge; the followers go along.
 *  Set on the elements themselves in the same frame as the sheet's transform
 *  — never from the scroll position, which made the button jitter on iOS when
 *  it rode the list, and never through a variable on <html>, which restyles
 *  the whole page every frame and let the button trail the finger. */
export function followSheet(px: number): void {
  followed = Math.max(0, Math.round(px));
  document.querySelectorAll<HTMLElement>(FOLLOWERS).forEach((el) => {
    el.style.translate = followed ? `0 ${followed}px` : '';
  });
}

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Sheet content above the strip line — cut off while the sheet rests at the
 *  top. It would slide INTO view as the sheet moves down, so it stays clipped
 *  while the sheet is moved. clip-path lives in the element's own coordinates
 *  and travels with it. Measured with the transform off, so it reads the
 *  scroll position alone. Where the browser runs scroll timelines, the
 *  sheet's own `stripCut` (MapSheet.module.css) already cuts at the same line
 *  and wins over this inline value; this one covers the rest. */
function clipAbove(sheet: HTMLElement) {
  const held = sheet.style.transform;
  sheet.style.transform = '';
  const hidden = Math.max(0, mapStripLine() - sheet.getBoundingClientRect().top);
  const content = sheet.querySelector<HTMLElement>('[data-sheet-content]');
  const bar = sheet.querySelector<HTMLElement>('[data-sheet-grab-zone]') ??
    sheet.querySelector<HTMLElement>('[data-sheet-handle]');
  if (content && bar) {
    // The outer rounded cut alone leaves rows painted behind the sticky bar.
    // Clip the content at the bar's actual bottom as well, including fractional
    // pixels, so no image/text can peek over the grip while it is moving.
    const covered = Math.max(0, bar.getBoundingClientRect().bottom - content.getBoundingClientRect().top);
    content.style.clipPath = `inset(${Math.ceil(covered)}px 0 0)`;
  }
  sheet.style.transform = held;
  /* The cut edge becomes the slab's top edge on screen — round it like the
     sheet's own top so the pulled list still reads as the sheet. */
  const radius = getComputedStyle(sheet).borderTopLeftRadius || '0px';
  sheet.style.clipPath =
    hidden > 0 ? `inset(${Math.round(hidden)}px 0 0 0 round ${radius} ${radius} 0 0)` : '';
}

/** Put the sheet at an offset below its scroll position. */
export function holdSheetAt(sheet: HTMLElement, offsetPx: number): void {
  sheet.style.transform = offsetPx !== 0 ? `translateY(${Math.round(offsetPx)}px)` : '';
}

/** End a gesture: the transform and the clip come off in the same task as
 *  the jump that ends it, so no frame shows the sheet twice. */
function release(sheet: HTMLElement): void {
  sheet.style.transform = '';
  sheet.style.clipPath = '';
  sheet.querySelector<HTMLElement>('[data-sheet-content]')?.style.removeProperty('clip-path');
  if (lowered === sheet) lowered = null;
  delete sheet.dataset.sheetLowered;
  followSheet(0);
}

/** Leave the sheet held at the lowest stop. `data-sheet-lowered` hands every touch on it to the grip
 *  (MapSheet.module.css, useHandleScrollDrag). */
function hold(sheet: HTMLElement, offsetPx: number): void {
  release(sheet);
  if (offsetPx <= 0) return;
  holdSheetAt(sheet, offsetPx);
  followSheet(offsetPx);
  sheet.dataset.sheetLowered = '';
  lowered = sheet;
}

/** The offset a sheet is currently held at (0 without a transform). */
export function heldOffset(sheet: HTMLElement): number {
  const m = /translateY\((-?[\d.]+)px\)/.exec(sheet.style.transform);
  return m ? Number(m[1]) : 0;
}

/** Something else moved the page (a filter, a detail, a programmatic
 *  scroll): the lowered sheet goes back to the map stop at once. */
export function dropLowered(): void {
  if (lowered) release(lowered);
}

/** Glide the sheet — and, from where they stand to `followTo`, its
 *  followers, on the same keyframe timing, so nothing trails behind. */
function glide(
  sheet: HTMLElement,
  fromPx: number,
  toPx: number,
  followTo: number
): Promise<void> {
  const followFrom = followed;
  holdSheetAt(sheet, toPx);
  followSheet(followTo);
  if (reducedMotion() || typeof sheet.animate !== 'function' || fromPx === toPx) {
    return Promise.resolve();
  }
  const timing = { duration: SETTLE_MS, easing: SETTLE_EASING };
  if (followFrom !== followed) {
    document.querySelectorAll<HTMLElement>(FOLLOWERS).forEach((el) =>
      el.animate(
        [{ translate: `0 ${followFrom}px` }, { translate: `0 ${followed}px` }],
        timing
      )
    );
  }
  const anim = sheet.animate(
    [{ transform: `translateY(${fromPx}px)` }, { transform: `translateY(${toPx}px)` }],
    timing
  );
  return anim.finished.then(
    () => undefined,
    () => undefined
  );
}

/**
 * Grab the list from deep inside it: from here on the finger moves the slab
 * on screen. Returns the offset the drag starts from.
 */
export function grabFromList(sheet: HTMLElement): number {
  clipAbove(sheet);
  return 0;
}

/**
 * Let go towards the map: the slab glides down to `toPx` — the resting line,
 * or past it to the lowest stop — and the page returns to the map stop
 * underneath it, so the bar stands in the same place before and after. The
 * sheet comes back at its top: the rows it was pulled from are not where the
 * map picks up (user, 27.09.2026).
 */
export async function settleOnMap(
  sheet: HTMLElement,
  fromPx: number,
  toPx: number,
  { restLinePx, mapY }: { restLinePx: number; mapY: number }
): Promise<void> {
  await glide(sheet, fromPx, toPx, toPx - restLinePx);
  /* `instant`, not `auto`: html carries scroll-behavior: smooth. The release
     runs in the same task as the jump, so no frame shows the sheet twice. */
  window.scrollTo({ top: mapY, behavior: 'instant' });
  hold(sheet, toPx - restLinePx);
  announceSettled();
}

/** Let go towards the list, or back onto the map stop from below it: the
 *  slab rises to where the page itself puts it. */
export async function raiseToList(sheet: HTMLElement, fromPx: number): Promise<void> {
  await glide(sheet, fromPx, 0, 0);
  release(sheet);
  announceSettled();
}
