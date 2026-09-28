/**
 * Pulling the phone list off the map and back — the Google Maps / Airbnb
 * gesture, built on a window-scrolled page.
 *
 * The phone list is a window-scrolled document with the map as a sticky layer
 * behind it (see phoneSheetSnaps.ts). Deep in the list, the way back to the map
 * is the grabber in the sticky filter bar: pull it down and the list follows
 * the finger, let go and it stays where the finger left it — over the map,
 * or below its resting place, down to where only the bar is left above the
 * bottom. Nothing snaps (user, 28.09.2026). Back over the map the list
 * starts at its top again. Remembering the row it was pulled from and
 * keeping it in the peek left a cut-off or empty sheet over the map (user,
 * 27.09.2026).
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
 * the bar for that reason, measured from clearBottom().
 *
 * The document itself is never frozen, fixed or overflow-locked: it stays the
 * window-scrolled page it always was, which keeps it flowing behind Safari's
 * and Chrome's toolbars (and lets them collapse). The transform exists for the
 * length of a gesture, and while the sheet is held below the map stop
 * (scroll 0), where no scroll position can put it.
 */

import { safeAreaInsetTop } from './safeArea';

/** Map left showing above the sheet when it is all the way up — the bar
 *  sticks below it, and nothing of the sheet shows above the bar
 *  (MapSheet.module.css, "The map strip"). Mirrors `--map-strip` in
 *  MapLayout.module.css (minus the safe-area term, which mapStripLine adds). */
export const MAP_STRIP_PX = 72;

/** Where the strip ends on screen: the line the sticky bar rests on. */
export function mapStripLine(): number {
  return safeAreaInsetTop() + MAP_STRIP_PX;
}

/** Fired on window when a grip gesture has come to rest — below the map
 *  stop, over the map or back on the list. Below the map stop the sheet
 *  moves by transform, which no scroll event reports (useMapCamera
 *  listens). */
export const SHEET_SETTLED_EVENT = 'et:map-sheet-settled';
const announceSettled = () => window.dispatchEvent(new Event(SHEET_SETTLED_EVENT));

/* Decelerates into its stop. */
const SETTLE_MS = 360;
const SETTLE_EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

/** Sheet left on screen below the bar at the lowest stop — a sliver of rows.
 *  It keeps the sticky bar clear of the bottom edge, where iOS Safari samples
 *  4px in and would tint its URL bar after it (see above). */
export const LOWERED_GAP_PX = 24;

let svhCache: { width: number; px: number } | null = null;

/* 100svh in px: the viewport with every browser bar unfolded. Probing forces
   a style resolve, so it is cached; only the width (rotation) changes it. */
function smallViewportHeight(): number {
  if (svhCache && svhCache.width === window.innerWidth) return svhCache.px;
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;left:0;top:0;width:0;height:100svh;visibility:hidden;pointer-events:none;';
  document.body.appendChild(probe);
  const px = probe.offsetHeight;
  probe.remove();
  /* Nothing measured (no layout, no svh support): no bound from here. */
  svhCache = { width: window.innerWidth, px: px > 0 ? px : Infinity };
  return svhCache.px;
}

/**
 * The lowest line on screen the sheet's bar may reach: the bottom of the
 * viewport as it is with Safari's bars unfolded, whatever they do right now.
 *
 * `innerHeight` alone let the bar slip under the URL bar "sometimes" (user,
 * 28.09.2026): a pull that starts deep in the sheet starts with the toolbar
 * folded away and a taller viewport, and the scroll back to the map unfolds
 * it — over the bar. So the smallest of the three: the layout viewport, the
 * visual one (pinch zoom, keyboard) and 100svh, the viewport with every bar
 * shown.
 */
export function clearBottom(): number {
  const vv = window.visualViewport;
  const visual = vv ? vv.height + vv.offsetTop : Infinity;
  return Math.min(window.innerHeight, visual, smallViewportHeight());
}

/* The sheet currently held below the map stop, if any. Module state for the
   same reason the strip line is: there is one map page. */
let lowered: HTMLElement | null = null;

/* How far a gesture has moved things: `sheet` is the sheet's own transform,
   `edge` how far its top edge stands below where it rests over the map. They
   differ deep in the list, where the slab moves but its edge is far above. */
type Shift = { sheet: number; edge: number };

/* What stands on the sheet's resting edge over the map, and goes along with
   the edge: the locate button's dock and the map credit (ODbL wants it on the
   map) — its control, since the credit's container carries the scroll ride on
   the same property. */
const FOLLOWERS = '[data-locate-dock], .maplibregl-ctrl-bottom-left > .maplibregl-ctrl';
let followed: Shift = { sheet: 0, edge: 0 };
/* From the grab deep in the list until the release: the sheet carries a
   clip, which makes it a stacking context — its bars then stack inside it,
   and the frame (7) would cover their top 12px, the grip's line with them. */
let grabbed = false;

function place(shift: Shift): void {
  document.querySelectorAll<HTMLElement>(FOLLOWERS).forEach((el) => {
    el.style.translate = shift.edge ? `0 ${shift.edge}px` : '';
  });
  /* While a gesture moves the sheet, the map's frame steps behind it and
     stops cutting at the sheet's top edge (MapLayout.module.css, "The map
     frame"): the sheet moved by a transform uncovers map the frame would
     have cut off. The sheet cuts itself instead (clipAbove). */
  document.querySelectorAll<HTMLElement>('[data-map-frame]').forEach((el) => {
    el.toggleAttribute('data-following', shift.sheet > 0 || grabbed);
  });
}

/** How far the sheet is moved down (`sheetPx`), and its top edge below its
 *  resting place over the map (`edgePx`, the same unless the slab is moved
 *  deep in the list); the followers go along. Set on the elements themselves
 *  in the same frame as the sheet's transform — never from the scroll
 *  position, which made the button jitter on iOS when it rode the list, and
 *  never through a variable on <html>, which restyles the whole page every
 *  frame and let the button trail the finger. */
export function followSheet(sheetPx: number, edgePx: number = sheetPx): void {
  followed = {
    sheet: Math.max(0, Math.round(sheetPx)),
    edge: Math.max(0, Math.round(edgePx)),
  };
  place(followed);
}

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Sheet content above the strip line — cut off while the sheet rests at the
 *  top, where the map's frame covers it. It would slide INTO view as the
 *  sheet moves down, and the frame steps back while it moves, so the sheet
 *  cuts itself. clip-path lives in the element's own coordinates and travels
 *  with it. Measured with the transform off, so it reads the scroll position
 *  alone. */
function clipAbove(sheet: HTMLElement) {
  const held = sheet.style.transform;
  sheet.style.transform = '';
  const hidden = Math.max(0, mapStripLine() - sheet.getBoundingClientRect().top);
  const content = sheet.querySelector<HTMLElement>('[data-sheet-content]');
  const bar =
    sheet.querySelector<HTMLElement>('[data-sheet-grab-zone]') ??
    sheet.querySelector<HTMLElement>('[data-sheet-handle]');
  if (content && bar) {
    // The outer rounded cut alone leaves rows painted behind the sticky bar.
    // Clip the content at the bar's actual bottom as well, including fractional
    // pixels, so no image/text can peek over the grip while it is moving.
    const covered = Math.max(
      0,
      bar.getBoundingClientRect().bottom - content.getBoundingClientRect().top
    );
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
  grabbed = false;
  if (lowered === sheet) lowered = null;
  delete sheet.dataset.sheetLowered;
  followSheet(0);
}

/** Leave the sheet held below the map stop. `data-sheet-lowered` hands
 *  every touch on it to the grip (MapSheet.module.css, useHandleScrollDrag). */
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

/** Glide the sheet from `fromPx` to `toPx` — and its followers from where
 *  they stand to where `edgeTo` puts them, on the same keyframe timing, so
 *  nothing trails behind. */
function glide(
  sheet: HTMLElement,
  fromPx: number,
  toPx: number,
  edgeTo: number
): Promise<void> {
  const from = followed;
  holdSheetAt(sheet, toPx);
  followSheet(toPx, edgeTo);
  if (reducedMotion() || typeof sheet.animate !== 'function' || fromPx === toPx) {
    return Promise.resolve();
  }
  const timing = { duration: SETTLE_MS, easing: SETTLE_EASING };
  if (from.edge !== followed.edge) {
    document.querySelectorAll<HTMLElement>(FOLLOWERS).forEach((el) =>
      el.animate(
        [{ translate: `0 ${from.edge}px` }, { translate: `0 ${followed.edge}px` }],
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
 * A tap on the bar deep in the sheet: the slab glides down to `toPx`, the
 * resting line, and the page returns to the map stop underneath it, so the
 * bar stands in the same place before and after. The sheet comes back at
 * its top: the rows it was pulled from are not where the map picks up
 * (user, 27.09.2026).
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

/**
 * Grab the list from deep inside it: from here on the finger moves the slab
 * on screen. Returns the offset the drag starts from.
 */
export function grabFromList(sheet: HTMLElement): number {
  clipAbove(sheet);
  grabbed = true;
  followSheet(0);
  return 0;
}

/**
 * Let go of the slab where the finger left it: the bar stays on that line,
 * and the page underneath comes back at the sheet's top — scrolled so its
 * bar lies there, or at the map stop with the sheet held below it. One task,
 * so no frame shows the sheet twice.
 */
export function leaveSlabAt(
  sheet: HTMLElement,
  offsetPx: number,
  { restLinePx, mapY }: { restLinePx: number; mapY: number }
): void {
  window.scrollTo({ top: mapY + Math.max(0, restLinePx - offsetPx), behavior: 'instant' });
  hold(sheet, offsetPx - restLinePx);
  announceSettled();
}

/** Let go of a sheet pulled at and below the map stop: held `loweredPx`
 *  below it, or (0) on the page as it is. */
export function restAt(sheet: HTMLElement, loweredPx: number): void {
  hold(sheet, loweredPx);
  announceSettled();
}

/** Let go towards the list, or back onto the map stop from below it: the
 *  slab rises to where the page itself puts it. */
export async function raiseToList(sheet: HTMLElement, fromPx: number): Promise<void> {
  await glide(sheet, fromPx, 0, 0);
  release(sheet);
  announceSettled();
}
