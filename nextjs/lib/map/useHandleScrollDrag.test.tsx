// @vitest-environment jsdom

import { useRef } from 'react';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));

import { useHandleScrollDrag } from './useHandleScrollDrag';
import { forgetListPosition, rememberedListPosition } from './sheetSlide';

/**
 * The phone list's grabber — pull the list off the map and back.
 *
 * Geometry: an 800px viewport, the sheet's top edge at document offset 600.
 * The list stops are then 0 (map), 183 (split) and 600 (sheet fully up);
 * anything past 600 is "deep in the list". jsdom has no Web Animations, so
 * every slide lands instantly — these cases are about where things END.
 */

const SHEET_DOC_TOP = 600;
const DEEP = 2600;

function Harness() {
  const handleRef = useRef<HTMLDivElement | null>(null);
  useHandleScrollDrag(handleRef, 'list');
  return (
    <aside data-map-sheet="">
      <div ref={handleRef} data-sheet-handle="" />
    </aside>
  );
}

function pointer(type: string, clientY: number, timeStamp = 0) {
  const e = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(e, { pointerId: 1, clientY });
  Object.defineProperty(e, 'timeStamp', { value: timeStamp });
  return e;
}

/** Drag the handle by `dy` in `steps` moves, `msPerStep` apart. */
function drag(dy: number, { steps = 4, msPerStep = 40 } = {}) {
  const handle = document.querySelector('[data-sheet-handle]')!;
  const start = 100;
  handle.dispatchEvent(pointer('pointerdown', start, 0));
  for (let i = 1; i <= steps; i += 1) {
    handle.dispatchEvent(pointer('pointermove', start + (dy * i) / steps, i * msPerStep));
  }
  handle.dispatchEvent(pointer('pointerup', start + dy, steps * msPerStep + msPerStep));
}

const settle = () => new Promise((r) => setTimeout(r, 0));
const sheet = () => document.querySelector<HTMLElement>('[data-map-sheet]')!;

beforeEach(() => {
  forgetListPosition();
  window.matchMedia = ((query: string) => ({
    matches: query.includes('max-width: 767.98px'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
  Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    value: 6000,
    configurable: true,
  });
  window.scrollY = 0;
  vi.spyOn(window, 'scrollTo').mockImplementation(((opts: ScrollToOptions) => {
    window.scrollY = opts.top ?? 0;
  }) as typeof window.scrollTo);
  HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
    const top = this.hasAttribute('data-map-sheet') ? SHEET_DOC_TOP - window.scrollY : 0;
    return { top, bottom: top, left: 0, right: 0, width: 0, height: 0 } as DOMRect;
  };
  render(<Harness />);
});

afterEach(() => vi.restoreAllMocks());

describe('pulling the list off the map', () => {
  it('drops the list to the map on a deliberate pull, and remembers where it was', async () => {
    window.scrollY = DEEP;
    drag(120);
    await settle();

    expect(window.scrollY).toBe(0);
    expect(rememberedListPosition()).toBe(DEEP);
    expect(sheet().style.transform).toBe('');
    expect(sheet().style.clipPath).toBe('');
  });

  it('never takes the bar below its resting line over the map', () => {
    /* Past that line the sticky bar would reach the bottom edge, and iOS
       Safari tints its URL bar after it — black, and it stays black. */
    window.scrollY = DEEP;
    const handle = document.querySelector('[data-sheet-handle]')!;
    handle.dispatchEvent(pointer('pointerdown', 100, 0));
    handle.dispatchEvent(pointer('pointermove', 1500, 40));

    expect(sheet().style.transform).toBe(`translateY(${SHEET_DOC_TOP}px)`);
    handle.dispatchEvent(pointer('pointerup', 1500, 80));
  });

  it('springs back on a short, slow pull — the list stays where it was', async () => {
    window.scrollY = DEEP;
    drag(30, { steps: 6, msPerStep: 80 });
    await settle();

    expect(window.scrollY).toBe(DEEP);
    expect(rememberedListPosition()).toBeNull();
    expect(sheet().style.transform).toBe('');
  });

  it('takes a short but fast flick as a decision', async () => {
    window.scrollY = DEEP;
    drag(40, { steps: 2, msPerStep: 16 });
    await settle();

    expect(window.scrollY).toBe(0);
  });

  it('drops to the map on a tap of the bar', async () => {
    window.scrollY = DEEP;
    drag(0, { steps: 0 });
    await settle();

    expect(window.scrollY).toBe(0);
  });
});

describe('pulling the list back up from the map', () => {
  beforeEach(async () => {
    window.scrollY = DEEP;
    drag(120);
    await settle();
  });

  it('brings the list back to the remembered row', async () => {
    drag(-120);
    await settle();

    expect(window.scrollY).toBe(DEEP);
    expect(sheet().style.transform).toBe('');
  });

  it('brings it back on a tap as well', async () => {
    drag(0, { steps: 0 });
    await settle();

    expect(window.scrollY).toBe(DEEP);
  });

  it('returns to the map when the pull was not meant', async () => {
    drag(-20, { steps: 4, msPerStep: 80 });
    await settle();

    expect(window.scrollY).toBe(0);
    expect(sheet().style.transform).toBe('');
  });

  it('forgets the row once you scroll back into the list yourself', () => {
    window.scrollY = 1400;
    window.dispatchEvent(new Event('scroll'));

    expect(rememberedListPosition()).toBeNull();
  });

  it('falls back to plain dragging once the position is forgotten (new filter)', async () => {
    forgetListPosition();
    drag(-40, { steps: 4, msPerStep: 80 });
    await settle();

    /* Native 1:1 drag from the map stop, then snapped to the next stop up. */
    expect(window.scrollY).not.toBe(DEEP);
    expect(window.scrollY).toBeGreaterThan(0);
  });
});
