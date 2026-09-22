/**
 * Moves the phone list to another scroll stop by SLIDING it, not scrolling it.
 *
 * The phone list is a window-scrolled document with the map as a sticky layer
 * behind it (see phoneSheetSnaps.ts). Going back to the map used to be a smooth
 * `window.scrollTo` to the top — and iOS Safari runs that animation in a fixed,
 * short time whatever the distance. From three thousand pixels down the list,
 * fifteen cards raced past in a blink and it read as a jump.
 *
 * So the list now leaves the way a bottom sheet does in Google Maps: the slab
 * you are looking at drops out of the viewport, the scroll position changes
 * while nothing of the list is on screen, and the sheet rises back in at its
 * new stop. Only a transform moves, so it runs on the compositor.
 *
 * The document itself is never frozen, fixed or overflow-locked: it stays the
 * window-scrolled page it always was, which is what keeps it flowing behind
 * Safari's and Chrome's toolbars (and lets the toolbars collapse). The
 * transform exists for the length of the flight only.
 */

/* Out: accelerates away, like a sheet let go of. */
const EXIT_MS = 340;
const EXIT_EASING = 'cubic-bezier(0.45, 0, 0.8, 0.4)';
/* In: decelerates into its stop. */
const ENTER_MS = 380;
const ENTER_EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

/**
 * The part of the sheet currently on screen: how far down the viewport its
 * visible slab starts, and how much of the sheet lies above the viewport top.
 */
function visibleSlab(sheet: HTMLElement) {
  const top = sheet.getBoundingClientRect().top;
  return {
    /* Distance the slab has to travel to be fully below the viewport. */
    travel: Math.max(0, window.innerHeight - Math.max(0, top)),
    /* Sheet content above the viewport. It would slide INTO view as the sheet
       moves down, so it is clipped away for the flight. clip-path lives in the
       element's own coordinates and travels with the transform. */
    hiddenAbove: Math.max(0, -top),
  };
}

/**
 * Fired on window once the sheet rests at its new stop. A slide moves the
 * sheet without a single scroll event, so anything that tracks the sheet's
 * edge from scroll events (the locate button) re-measures on this instead.
 */
export const SHEET_SETTLED_EVENT = 'et:map-sheet-settled';

function settled(sheet: HTMLElement) {
  clipAbove(sheet, 0);
  window.dispatchEvent(new Event(SHEET_SETTLED_EVENT));
}

function clipAbove(sheet: HTMLElement, px: number) {
  sheet.style.clipPath = px > 0 ? `inset(${Math.round(px)}px 0 0 0)` : '';
}

export function slideSheetTo(sheet: HTMLElement, targetY: number): Promise<void> {
  const out = visibleSlab(sheet);
  clipAbove(sheet, out.hiddenAbove);
  const exit = sheet.animate(
    [{ transform: 'translateY(0)' }, { transform: `translateY(${out.travel}px)` }],
    { duration: EXIT_MS, easing: EXIT_EASING, fill: 'forwards' }
  );

  return exit.finished.then(
    () => {
      /* Jump while no part of the list is on screen. `instant`, not `auto`:
         html carries scroll-behavior: smooth. Everything below runs in the
         same task as the jump, so no frame shows the sheet unmoved at its
         new stop. */
      window.scrollTo({ top: targetY, behavior: 'instant' });
      /* Drop the exit's held end frame BEFORE measuring — the rect would still
         carry its transform and put the sheet a viewport too low. */
      exit.cancel();
      const back = visibleSlab(sheet);
      clipAbove(sheet, back.hiddenAbove);
      const enter = sheet.animate(
        [{ transform: `translateY(${back.travel}px)` }, { transform: 'translateY(0)' }],
        { duration: ENTER_MS, easing: ENTER_EASING }
      );
      return enter.finished.then(
        () => settled(sheet),
        () => settled(sheet)
      );
    },
    () => {
      /* Cancelled from outside (unmount, view switch): leave the page as it is,
         without a clip. */
      clipAbove(sheet, 0);
    }
  );
}
