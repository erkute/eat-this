/**
 * Pulling the phone list off the map and back — the Google Maps / Airbnb
 * gesture, built on a window-scrolled page.
 *
 * The phone list is a window-scrolled document with the map as a sticky layer
 * behind it (see phoneSheetSnaps.ts). Deep in the list, the way back to the map
 * is the grabber in the sticky filter bar: pull it down and the list follows
 * the finger off the screen, let go and it drops away; the map is what stays.
 * Pull the bar up from the map again and the list comes back exactly where you
 * left it.
 *
 * Under the hood the list never scrolls through its rows on the way. The slab
 * on screen is moved by a transform, and the scroll position changes only
 * while none of the list is visible. Going back to the top by scrolling was
 * the old route, and iOS Safari runs a programmatic smooth scroll in a fixed
 * short time whatever the distance — from three thousand pixels down it read
 * as a jump.
 *
 * The document itself is never frozen, fixed or overflow-locked: it stays the
 * window-scrolled page it always was, which keeps it flowing behind Safari's
 * and Chrome's toolbars (and lets them collapse). The transform exists for the
 * length of a gesture only.
 */

/* Out: accelerates away, like a sheet let go of. */
const EXIT_MS = 300;
const EXIT_EASING = 'cubic-bezier(0.45, 0, 0.8, 0.4)';
/* In / back: decelerates into its stop. */
const SETTLE_MS = 360;
const SETTLE_EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

/**
 * Fired on window once the sheet rests again after a gesture. The sheet moves
 * without a single scroll event, so anything that tracks its edge from scroll
 * events (the locate button) re-measures on this instead.
 */
export const SHEET_SETTLED_EVENT = 'et:map-sheet-settled';

/* Where the list was when it was pulled off the map; null = nothing to return
   to. Module state, because there is one map page and the filter effect in
   MapSection has to be able to drop it (forgetListPosition). */
let rememberedListY: number | null = null;

export function rememberedListPosition(): number | null {
  return rememberedListY;
}

/** A different result set: an offset into the old list means nothing. */
export function forgetListPosition(): void {
  rememberedListY = null;
}

function reducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Sheet content above the viewport top. It would slide INTO view as the
 *  sheet moves down, so it is clipped away while the sheet is moved.
 *  clip-path lives in the element's own coordinates and travels with it.
 *  Measured with the transform off, so it reads the scroll position alone. */
function clipAbove(sheet: HTMLElement) {
  const held = sheet.style.transform;
  sheet.style.transform = '';
  const hidden = Math.max(0, -sheet.getBoundingClientRect().top);
  sheet.style.transform = held;
  /* The cut edge becomes the slab's top edge on screen — round it like the
     sheet's own top so the pulled list still reads as the sheet. */
  const radius = getComputedStyle(sheet).borderTopLeftRadius || '0px';
  sheet.style.clipPath =
    hidden > 0 ? `inset(${Math.round(hidden)}px 0 0 0 round ${radius} ${radius} 0 0)` : '';
}

/** Put the sheet at an offset below its scroll position. */
export function holdSheetAt(sheet: HTMLElement, offsetPx: number): void {
  sheet.style.transform = offsetPx > 0 ? `translateY(${Math.round(offsetPx)}px)` : '';
}

function release(sheet: HTMLElement) {
  sheet.style.transform = '';
  sheet.style.clipPath = '';
  window.dispatchEvent(new Event(SHEET_SETTLED_EVENT));
}

function animate(
  sheet: HTMLElement,
  fromPx: number,
  toPx: number,
  duration: number,
  easing: string
): Promise<void> {
  holdSheetAt(sheet, toPx);
  if (reducedMotion() || typeof sheet.animate !== 'function' || fromPx === toPx) {
    return Promise.resolve();
  }
  const anim = sheet.animate(
    [{ transform: `translateY(${fromPx}px)` }, { transform: `translateY(${toPx}px)` }],
    { duration, easing }
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
 * Grab the resting sheet on the map while a list position is remembered: the
 * page jumps to that position with the slab held down where the sheet's top
 * edge was, so the pull brings up the rows you left, not the list top.
 * Returns the offset the drag starts from, or null with nothing to return to.
 */
export function grabFromMap(sheet: HTMLElement): number | null {
  const back = rememberedListY;
  if (back == null) return null;
  const edge = Math.max(0, sheet.getBoundingClientRect().top);
  /* The document can be shorter than when we left — clamp inside it. */
  const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  window.scrollTo({ top: Math.min(back, maxY), behavior: 'instant' });
  holdSheetAt(sheet, edge);
  clipAbove(sheet);
  return edge;
}

/** Let go towards the map: the slab drops out, and the sheet rises back in
 *  from below at the map stop. */
export async function dropToMap(sheet: HTMLElement, fromPx: number, mapY: number): Promise<void> {
  rememberedListY = window.scrollY;
  await animate(sheet, fromPx, window.innerHeight, EXIT_MS, EXIT_EASING);
  /* `instant`, not `auto`: html carries scroll-behavior: smooth. The hold
     below runs in the same task as the jump, so no frame shows the sheet
     unmoved at its new stop. */
  window.scrollTo({ top: mapY, behavior: 'instant' });
  holdSheetAt(sheet, 0);
  clipAbove(sheet);
  const top = Math.max(0, sheet.getBoundingClientRect().top);
  await animate(sheet, window.innerHeight - top, 0, SETTLE_MS, SETTLE_EASING);
  release(sheet);
}

/** Let go towards the list: the slab rises until it covers the map. */
export async function raiseToList(sheet: HTMLElement, fromPx: number): Promise<void> {
  await animate(sheet, fromPx, 0, SETTLE_MS, SETTLE_EASING);
  release(sheet);
}

/** A pull from the map that was not meant: the slab sinks back to where the
 *  sheet's edge was, and the page returns to the map stop underneath it. */
export async function sinkBackToMap(
  sheet: HTMLElement,
  fromPx: number,
  restPx: number,
  mapY: number
): Promise<void> {
  await animate(sheet, fromPx, restPx, SETTLE_MS, SETTLE_EASING);
  window.scrollTo({ top: mapY, behavior: 'instant' });
  release(sheet);
}
