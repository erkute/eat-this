/**
 * Pulling the phone list off the map and back — the Google Maps / Airbnb
 * gesture, built on a window-scrolled page.
 *
 * The phone list is a window-scrolled document with the map as a sticky layer
 * behind it (see phoneSheetSnaps.ts). Deep in the list, the way back to the map
 * is the grabber in the sticky filter bar: pull it down and the list follows
 * the finger, let go and it glides down to its resting place above the map.
 * Pull the bar up from the map again and the list comes back exactly where you
 * left it.
 *
 * Under the hood the list never scrolls through its rows on the way. The slab
 * on screen is moved by a transform, and the scroll position changes only at
 * the resting line, where the bar sits in the same place before and after.
 * Going back to the top by scrolling was the old route, and iOS Safari runs a
 * programmatic smooth scroll in a fixed short time whatever the distance —
 * from three thousand pixels down it read as a jump.
 *
 * The bar never travels below its resting line. The first version let the
 * slab drop out through the bottom of the screen, and on the way the sticky
 * filter bar crossed the bottom edge: iOS Safari tints its URL bar after a
 * sticky container at that edge and keeps the colour afterwards, so the
 * translucent bar turned black (user, 22.09.2026).
 *
 * The document itself is never frozen, fixed or overflow-locked: it stays the
 * window-scrolled page it always was, which keeps it flowing behind Safari's
 * and Chrome's toolbars (and lets them collapse). The transform exists for the
 * length of a gesture only.
 */

/* Decelerates into its stop. */
const SETTLE_MS = 360;
const SETTLE_EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

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
}

function glide(sheet: HTMLElement, fromPx: number, toPx: number): Promise<void> {
  holdSheetAt(sheet, toPx);
  if (reducedMotion() || typeof sheet.animate !== 'function' || fromPx === toPx) {
    return Promise.resolve();
  }
  const anim = sheet.animate(
    [{ transform: `translateY(${fromPx}px)` }, { transform: `translateY(${toPx}px)` }],
    { duration: SETTLE_MS, easing: SETTLE_EASING }
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
 * page jumps to that position with the slab held down at the resting line, so
 * the pull brings up the rows you left, not the list top. The bar itself does
 * not move — it is at the top of the slab either way.
 */
export function grabFromMap(sheet: HTMLElement, restLinePx: number): boolean {
  const back = rememberedListY;
  if (back == null) return false;
  /* The document can be shorter than when we left — clamp inside it. */
  const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  window.scrollTo({ top: Math.min(back, maxY), behavior: 'instant' });
  holdSheetAt(sheet, restLinePx);
  clipAbove(sheet);
  return true;
}

/**
 * Let go towards the map: the slab glides down to the resting line, and the
 * page returns to the map stop underneath it — the bar stands in the same place
 * before and after, only the rows below it change back to the list top.
 */
export async function settleOnMap(
  sheet: HTMLElement,
  fromPx: number,
  restLinePx: number,
  mapY: number,
  { remember }: { remember: boolean }
): Promise<void> {
  if (remember) rememberedListY = window.scrollY;
  await glide(sheet, fromPx, restLinePx);
  /* `instant`, not `auto`: html carries scroll-behavior: smooth. The release
     runs in the same task as the jump, so no frame shows the sheet twice. */
  window.scrollTo({ top: mapY, behavior: 'instant' });
  release(sheet);
}

/** Let go towards the list: the slab rises until it covers the map. */
export async function raiseToList(sheet: HTMLElement, fromPx: number): Promise<void> {
  await glide(sheet, fromPx, 0);
  release(sheet);
}
