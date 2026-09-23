// @vitest-environment jsdom

import { useRef } from 'react';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));

import { useHandleScrollDrag } from './useHandleScrollDrag';
import {
  forgetSheetPosition,
  MAP_STRIP_PX,
  rememberedSheetPosition,
  SHEET_COLLAPSE_EVENT,
} from './sheetSlide';

const forgetListPosition = () => forgetSheetPosition('list');
const rememberedListPosition = () => rememberedSheetPosition('list');

/**
 * The phone list's grabber — pull the list off the map and back.
 *
 * Geometry: an 800px viewport, the sheet's top edge at document offset 600.
 * All the way up, the sheet leaves the 72px map strip showing, so the stops
 * are 0 (map), ~147 (split) and 528 (sheet up to the strip); anything past
 * that is "deep in the list". jsdom has no Web Animations, so every slide
 * lands instantly — these cases are about where things END.
 */

const SHEET_DOC_TOP = 600;
const DEEP = 2600;

function Harness({
  view = 'list',
  detailKind,
}: {
  view?: 'list' | 'detail';
  detailKind?: 'restaurant' | 'must-eat';
}) {
  const handleRef = useRef<HTMLDivElement | null>(null);
  useHandleScrollDrag(handleRef, view);
  return (
    <div data-map-body="">
      <aside data-map-sheet="" data-detail-kind={detailKind}>
        <div ref={handleRef} data-sheet-handle="" />
      </aside>
    </div>
  );
}

/* Where the bar stands at the map stop, as a slab offset from the strip line. */
const REST_OFFSET = SHEET_DOC_TOP - MAP_STRIP_PX;

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
  forgetSheetPosition('list');
  forgetSheetPosition('detail');
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
});

describe('in the list', () => {
  beforeEach(() => {
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

      expect(sheet().style.transform).toBe(`translateY(${REST_OFFSET}px)`);
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

    it('lifts the sheet over the map strip for the gesture, and only then', async () => {
      /* A transform makes the sheet a stacking context, which put its bar
       under the strip — and the strip reaches past its line, so the top of
       the bar and its grip vanished while being pulled. */
      window.scrollY = DEEP;
      const handle = document.querySelector('[data-sheet-handle]')!;
      handle.dispatchEvent(pointer('pointerdown', 100, 0));
      handle.dispatchEvent(pointer('pointermove', 105, 16));
      expect(sheet().style.zIndex).toBe('7');

      handle.dispatchEvent(pointer('pointerup', 105, 32));
      await settle();
      expect(sheet().style.zIndex).toBe('');
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
});

describe('the map strip', () => {
  beforeEach(() => {
    render(<Harness />);
  });

  it('leaves the strip uncovered at the last stop', async () => {
    /* A plain drag between the stops, released near the top: it settles on
       the strip line, not on the viewport's top edge. */
    window.scrollY = 500;
    drag(-10, { steps: 2, msPerStep: 200 });
    await settle();

    expect(window.scrollY).toBe(SHEET_DOC_TOP - MAP_STRIP_PX);
  });

  it('takes a tap on the strip to the map, like a tap on the grabber', async () => {
    window.scrollY = DEEP;
    window.dispatchEvent(new Event(SHEET_COLLAPSE_EVENT));
    await settle();

    expect(window.scrollY).toBe(0);
    expect(rememberedListPosition()).toBe(DEEP);
  });
});

describe('in a detail', () => {
  it('pulls a restaurant detail off the map and back, remembered apart from the list', async () => {
    render(<Harness view="detail" detailKind="restaurant" />);
    window.scrollY = DEEP;
    drag(120);
    await settle();

    expect(window.scrollY).toBe(0);
    expect(rememberedSheetPosition('detail')).toBe(DEEP);
    expect(rememberedListPosition()).toBeNull();

    drag(-120);
    await settle();
    expect(window.scrollY).toBe(DEEP);
  });

  it('leaves the must-eat takeover alone — there is no map behind it', async () => {
    render(<Harness view="detail" detailKind="must-eat" />);
    window.scrollY = DEEP;
    drag(120);
    await settle();

    /* Plain 1:1 scroll drag: 120px back up the page, no trip to the map. */
    expect(window.scrollY).toBe(DEEP - 120);
    expect(rememberedSheetPosition('detail')).toBeNull();
  });
});
