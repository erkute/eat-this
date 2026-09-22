// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { slideSheetTo } from './sheetSlide';

/* A controllable stand-in for Element.animate: each call is recorded and
   finishes when the test says so. */
let heldOffset = 0;

function fakeAnimations(sheet: HTMLElement) {
  const calls: { keyframes: Keyframe[]; finish: () => void; cancelled: boolean }[] = [];
  sheet.animate = ((keyframes: Keyframe[]) => {
    let finish!: () => void;
    const finished = new Promise<void>((r) => (finish = r));
    const entry = { keyframes, finish, cancelled: false };
    calls.push(entry);
    /* fill: 'forwards' holds the end frame once finished — like the real
       thing, the rect then carries that offset until the animation is cancelled. */
    const end = String(keyframes.at(-1)?.transform ?? '');
    void finished.then(() => {
      if (!entry.cancelled) heldOffset = Number(end.match(/-?\d+/)?.[0] ?? 0);
    });
    return {
      finished,
      cancel: () => {
        entry.cancelled = true;
        heldOffset = 0;
      },
    } as unknown as Animation;
  }) as HTMLElement['animate'];
  return calls;
}

let sheetTop = 0;
let sheet: HTMLElement;

beforeEach(() => {
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
  sheet = document.createElement('aside');
  heldOffset = 0;
  sheet.getBoundingClientRect = () => ({ top: sheetTop + heldOffset }) as DOMRect;
  /* Sheet sits at document offset 600: scrolling to y puts its top at 600 - y. */
  vi.spyOn(window, 'scrollTo').mockImplementation(((opts: ScrollToOptions) => {
    sheetTop = 600 - (opts.top ?? 0);
  }) as typeof window.scrollTo);
});

afterEach(() => vi.restoreAllMocks());

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('slideSheetTo', () => {
  it('drops the visible slab out, jumps, and raises the sheet in at its new stop', async () => {
    sheetTop = -2400; // deep in the list: 2400px of sheet above the viewport
    const calls = fakeAnimations(sheet);

    const done = slideSheetTo(sheet, 0);

    /* Out: only what is on screen travels, the rest is clipped away so no
       earlier card slides into view from above. */
    expect(sheet.style.clipPath).toBe('inset(2400px 0 0 0)');
    expect(calls[0].keyframes.at(-1)).toEqual({ transform: 'translateY(800px)' });
    expect(window.scrollTo).not.toHaveBeenCalled();

    calls[0].finish();
    await flush();

    /* The jump happens only once the list is off screen, and bypasses the
       global smooth scroll-behavior. */
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
    expect(calls[0].cancelled).toBe(true);
    /* In: at the map stop 200px of sheet show, so it rises by exactly that. */
    expect(calls[1].keyframes[0]).toEqual({ transform: 'translateY(200px)' });
    expect(sheet.style.clipPath).toBe('');

    calls[1].finish();
    await done;
    expect(sheet.style.clipPath).toBe('');
  });

  it('clips the sheet above the viewport on the way back into the list', async () => {
    sheetTop = 600; // map stop: sheet peeks at the bottom
    const calls = fakeAnimations(sheet);

    const done = slideSheetTo(sheet, 3000);
    expect(sheet.style.clipPath).toBe('');
    expect(calls[0].keyframes.at(-1)).toEqual({ transform: 'translateY(200px)' });

    calls[0].finish();
    await flush();
    expect(sheet.style.clipPath).toBe('inset(2400px 0 0 0)');
    expect(calls[1].keyframes[0]).toEqual({ transform: 'translateY(800px)' });

    calls[1].finish();
    await done;
    expect(sheet.style.clipPath).toBe('');
  });
});
