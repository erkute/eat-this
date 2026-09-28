// @vitest-environment jsdom

import { useRef } from 'react';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));

import { useHandleScrollDrag } from './useHandleScrollDrag';
import { snapOffsets } from './phoneSheetSnaps';
import { LOWERED_GAP_PX, MAP_STRIP_PX, SHEET_COLLAPSE_EVENT } from './sheetSlide';

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
        <div data-sheet-content="" />
      </aside>
    </div>
  );
}

/* Where the bar stands at the map stop, as a slab offset from the strip line. */
const REST_OFFSET = SHEET_DOC_TOP - MAP_STRIP_PX;
/* How far the lowest stop lies below the map stop: the bar (0px tall in
   jsdom) and the gap left above the bottom of the 800px viewport. */
const LOW_BY = 800 - LOWERED_GAP_PX - SHEET_DOC_TOP;
const splitStop = (view: 'list' | 'detail') => snapOffsets(view, 800, REST_OFFSET)[1];

function pointer(type: string, clientY: number, timeStamp = 0, pointerType = 'mouse') {
  const e = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(e, { pointerId: 1, clientX: 0, clientY, pointerType });
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
/* The hook moves the sheet once per frame; this runs the frame by hand. */
let frames: FrameRequestCallback[] = [];
function nextFrame() {
  const due = frames;
  frames = [];
  due.forEach((cb) => cb(0));
}
const sheet = () => document.querySelector<HTMLElement>('[data-map-sheet]')!;

beforeEach(() => {
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
  frames = [];
  window.requestAnimationFrame = (cb: FrameRequestCallback) => frames.push(cb);
  window.cancelAnimationFrame = (id: number) => {
    delete frames[id - 1];
  };
  vi.spyOn(window, 'scrollTo').mockImplementation(((opts: ScrollToOptions) => {
    window.scrollY = opts.top ?? 0;
  }) as typeof window.scrollTo);
  HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
    /* Like a browser: the rect includes the sheet's transform. */
    const held = Number(/translateY\((-?[\d.]+)px\)/.exec(this.style.transform)?.[1] ?? 0);
    const top = this.hasAttribute('data-map-sheet') ? SHEET_DOC_TOP - window.scrollY + held : 0;
    return { top, bottom: top, left: 0, right: 0, width: 0, height: 0 } as DOMRect;
  };
});

afterEach(() => vi.restoreAllMocks());

const lowered = () => sheet().dataset.sheetLowered !== undefined;
/* Nothing of the deep rows is kept over the map: the sheet shows its top. */
function expectRestingAtTop() {
  expect(window.scrollY).toBe(0);
  expect(sheet().style.transform).toBe('');
  expect(sheet().style.clipPath).toBe('');
  expect(sheet().getAttribute('style') ?? '').not.toContain('--sheet-reading-offset');
  expect(lowered()).toBe(false);
}

describe('in the list', () => {
  beforeEach(() => {
    render(<Harness />);
  });

  describe('pulling the list off the map', () => {
    it('drops the list to the map on a deliberate pull, back at its top', async () => {
      window.scrollY = DEEP;
      drag(120);
      await settle();

      expectRestingAtTop();
    });

    it('clips moving content below the grip and clears the temporary cut on release', async () => {
      window.scrollY = DEEP;
      const handle = document.querySelector<HTMLElement>('[data-sheet-handle]')!;
      const content = sheet().querySelector<HTMLElement>('[data-sheet-content]')!;
      vi.spyOn(handle, 'getBoundingClientRect').mockReturnValue({ bottom: 162.5 } as DOMRect);
      vi.spyOn(content, 'getBoundingClientRect').mockReturnValue({ top: -500.25 } as DOMRect);
      handle.dispatchEvent(pointer('pointerdown', 100));
      expect(content.style.clipPath).toBe('inset(663px 0 0)');
      handle.dispatchEvent(pointer('pointerup', 100));
      await settle();
      expect(content.style.clipPath).toBe('');
    });

    it('never takes the bar below the lowest stop', () => {
      /* Past it the sticky bar would reach the bottom edge, and iOS Safari
       tints its URL bar after it — black, and it stays black. */
      window.scrollY = DEEP;
      const handle = document.querySelector('[data-sheet-handle]')!;
      handle.dispatchEvent(pointer('pointerdown', 100, 0));
      handle.dispatchEvent(pointer('pointermove', 1500, 40));
      nextFrame();

      expect(sheet().style.transform).toBe(`translateY(${REST_OFFSET + LOW_BY}px)`);
      handle.dispatchEvent(pointer('pointerup', 1500, 80));
    });

    it('goes on to the lowest stop when pulled past the resting line', async () => {
      window.scrollY = DEEP;
      drag(REST_OFFSET + 100);
      await settle();

      expect(window.scrollY).toBe(0);
      expect(sheet().style.transform).toBe(`translateY(${LOW_BY}px)`);
      expect(sheet().style.clipPath).toBe('');
      expect(lowered()).toBe(true);
    });

    it('springs back on a short, slow pull — the list stays where it was', async () => {
      window.scrollY = DEEP;
      drag(30, { steps: 6, msPerStep: 80 });
      await settle();

      expect(window.scrollY).toBe(DEEP);
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

      expectRestingAtTop();
    });
  });

  describe('pulling the list back up from the map', () => {
    beforeEach(async () => {
      window.scrollY = DEEP;
      drag(120);
      await settle();
    });

    it('drags from the top of the list, not back to the row it left', async () => {
      drag(-120);
      await settle();

      expect(window.scrollY).toBe(splitStop('list'));
      expect(sheet().style.transform).toBe('');
    });

    it('opens the whole sheet on a tap', async () => {
      drag(0, { steps: 0 });
      await settle();

      expect(window.scrollY).toBe(REST_OFFSET);
    });
  });

  describe('the lowest stop', () => {
    beforeEach(async () => {
      drag(100);
      await settle();
    });

    it('is reached from the map stop by pulling the bar down', () => {
      expect(window.scrollY).toBe(0);
      expect(sheet().style.transform).toBe(`translateY(${LOW_BY}px)`);
      expect(lowered()).toBe(true);
    });

    it('goes back onto the map stop on a tap of the grip', async () => {
      drag(0, { steps: 0 });
      await settle();

      expectRestingAtTop();
    });

    it('swallows the click after a grip tap — it lands on whatever rose under the finger', async () => {
      const content = sheet().querySelector<HTMLElement>('[data-sheet-content]')!;
      const onClick = vi.fn();
      content.addEventListener('click', onClick);
      const handle = document.querySelector('[data-sheet-handle]')!;
      handle.dispatchEvent(pointer('pointerdown', 780, 0, 'touch'));
      handle.dispatchEvent(pointer('pointerup', 780, 60, 'touch'));
      const click = new MouseEvent('click', { bubbles: true, cancelable: true });
      Object.defineProperty(click, 'timeStamp', { value: 100 });
      content.dispatchEvent(click);
      await settle();

      expect(onClick).not.toHaveBeenCalled();
      expectRestingAtTop();
    });

    it('takes a press anywhere on the sheet as the grip, and swallows its click', async () => {
      const content = sheet().querySelector<HTMLElement>('[data-sheet-content]')!;
      const onClick = vi.fn();
      content.addEventListener('click', onClick);
      content.dispatchEvent(pointer('pointerdown', 780, 0, 'touch'));
      content.dispatchEvent(pointer('pointerup', 780, 60, 'touch'));
      const click = new MouseEvent('click', { bubbles: true, cancelable: true });
      Object.defineProperty(click, 'timeStamp', { value: 100 });
      content.dispatchEvent(click);
      await settle();

      expect(onClick).not.toHaveBeenCalled();
      expectRestingAtTop();
    });

    it('goes straight on into the list on a long pull up', async () => {
      drag(-(LOW_BY + 200));
      await settle();

      expect(window.scrollY).toBe(splitStop('list'));
      expect(sheet().style.transform).toBe('');
      expect(lowered()).toBe(false);
    });

    it('never scrolls the page above the map stop', () => {
      const handle = document.querySelector('[data-sheet-handle]')!;
      handle.dispatchEvent(pointer('pointerdown', 100, 0));
      handle.dispatchEvent(pointer('pointermove', 900, 40));
      nextFrame();

      expect(window.scrollY).toBe(0);
      expect(sheet().style.transform).toBe(`translateY(${LOW_BY}px)`);
      handle.dispatchEvent(pointer('pointerup', 900, 80));
    });

    it('lets go of the sheet when something else scrolls the page', () => {
      window.scrollY = 300;
      window.dispatchEvent(new Event('scroll'));

      expect(sheet().style.transform).toBe('');
      expect(lowered()).toBe(false);
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

  it('takes a tap on the strip to the map, with the list at its top', async () => {
    window.scrollY = DEEP;
    window.dispatchEvent(new Event(SHEET_COLLAPSE_EVENT));
    await settle();

    expectRestingAtTop();
  });

  /* Hochgeschoben bis zum letzten Stopp, aber nicht hineingescrollt: der
     Balken steht auf der Strip-Linie, der Strip nimmt den Tipp an — und er
     muss dann auch zur Karte führen, nicht ins Leere (Nutzer, 28.09.2026). */
  it('takes a tap on the strip to the map from the last stop too', async () => {
    window.scrollY = SHEET_DOC_TOP - MAP_STRIP_PX;
    window.dispatchEvent(new Event(SHEET_COLLAPSE_EVENT));
    await settle();

    expectRestingAtTop();
  });
});

describe('in a detail', () => {
  it('pulls a restaurant detail off the map, back at its top', async () => {
    render(<Harness view="detail" detailKind="restaurant" />);
    window.scrollY = DEEP;
    drag(120);
    await settle();

    expectRestingAtTop();

    drag(-120);
    await settle();
    expect(window.scrollY).toBe(splitStop('detail'));
  });

  it('brings a pushed-up restaurant detail down to the map on a strip tap', async () => {
    render(<Harness view="detail" detailKind="restaurant" />);
    for (const top of [SHEET_DOC_TOP - MAP_STRIP_PX, DEEP]) {
      window.scrollY = top;
      window.dispatchEvent(new Event(SHEET_COLLAPSE_EVENT));
      await settle();

      expectRestingAtTop();
    }
  });

  it('lowers a restaurant detail as well, and lets go when the view changes', async () => {
    const { rerender } = render(<Harness view="detail" detailKind="restaurant" />);
    drag(100);
    await settle();
    expect(lowered()).toBe(true);

    rerender(<Harness view="list" />);
    expect(sheet().style.transform).toBe('');
    expect(lowered()).toBe(false);
  });

  it('leaves the must-eat takeover alone — there is no map behind it', async () => {
    render(<Harness view="detail" detailKind="must-eat" />);
    window.scrollY = DEEP;
    drag(120);
    await settle();

    /* Plain 1:1 scroll drag: 120px back up the page, no trip to the map. */
    expect(window.scrollY).toBe(DEEP - 120);

    window.scrollY = 0;
    drag(100);
    await settle();
    expect(sheet().style.transform).toBe('');
    expect(lowered()).toBe(false);
  });
});

describe.each(['list', 'detail'] as const)('phone touch grip gestures in a %s', (view) => {
  it('collapses a scrolled sheet with a touch grip drag', async () => {
    render(<Harness view={view} detailKind={view === 'detail' ? 'restaurant' : undefined} />);
    window.scrollY = DEEP;
    const handle = document.querySelector('[data-sheet-handle]')!;
    handle.dispatchEvent(pointer('pointerdown', 100, 0, 'touch'));
    handle.dispatchEvent(pointer('pointermove', 220, 80, 'touch'));
    nextFrame();
    expect(sheet().style.transform).toBe('translateY(120px)');
    // No document scroll or layout changes while the grip is moving.
    expect(window.scrollTo).not.toHaveBeenCalled();
    handle.dispatchEvent(pointer('pointerup', 220, 160, 'touch'));
    await settle();
    expectRestingAtTop();
  });

  it('keeps the touch tap shortcut', async () => {
    render(<Harness view={view} detailKind={view === 'detail' ? 'restaurant' : undefined} />);
    window.scrollY = DEEP;
    const handle = document.querySelector('[data-sheet-handle]')!;
    const tap = () => {
      handle.dispatchEvent(pointer('pointerdown', 100, 0, 'touch'));
      handle.dispatchEvent(pointer('pointerup', 100, 80, 'touch'));
    };
    tap();
    await settle();
    expectRestingAtTop();
    tap();
    await settle();
    expect(window.scrollY).toBe(REST_OFFSET);
  });
});

describe.each(['touch', 'mouse'])('phone handle %s taps', (pointerType) => {
  it.each(['list', 'detail'] as const)('opens a fresh %s and closes it again at the top', async (view) => {
    render(<Harness view={view} detailKind={view === 'detail' ? 'restaurant' : undefined} />);
    const handle = document.querySelector('[data-sheet-handle]')!;
    const tap = () => {
      handle.dispatchEvent(pointer('pointerdown', 100, 0, pointerType));
      handle.dispatchEvent(pointer('pointerup', 100, 80, pointerType));
    };
    tap();
    await settle();
    expect(window.scrollY).toBe(REST_OFFSET);
    tap();
    await settle();
    expect(window.scrollY).toBe(0);
    tap();
    await settle();
    expect(window.scrollY).toBe(REST_OFFSET);
  });
});

describe('interrupted restaurant handle gestures', () => {
  it('finishes outside the handle when pointer capture is unavailable', async () => {
    render(<Harness view="detail" detailKind="restaurant" />);
    window.scrollY = DEEP;
    const handle = document.querySelector('[data-sheet-handle]')!;
    handle.dispatchEvent(pointer('pointerdown', 100));
    window.dispatchEvent(pointer('pointermove', 240, 100));
    window.dispatchEvent(pointer('pointerup', 240, 120));
    await settle();
    expectRestingAtTop();
  });

  it.each(['pointercancel', 'lostpointercapture'])('recovers after %s and accepts the next drag', async (event) => {
    render(<Harness view="detail" detailKind="restaurant" />);
    window.scrollY = DEEP;
    const handle = document.querySelector('[data-sheet-handle]')!;
    handle.dispatchEvent(pointer('pointerdown', 100));
    handle.dispatchEvent(pointer('pointermove', 240, 100));
    handle.dispatchEvent(pointer(event, 240, 120));
    await settle();
    expect(window.scrollY).toBe(DEEP);
    expect(sheet().style.transform).toBe('');
    drag(120);
    await settle();
    expect(window.scrollY).toBe(0);
  });

  it('puts a lowered sheet back where it was when the pull is cancelled', async () => {
    render(<Harness />);
    drag(100);
    await settle();
    const handle = document.querySelector('[data-sheet-handle]')!;
    handle.dispatchEvent(pointer('pointerdown', 100));
    handle.dispatchEvent(pointer('pointermove', 20, 100));
    handle.dispatchEvent(pointer('pointercancel', 20, 120));
    await settle();
    expect(sheet().style.transform).toBe(`translateY(${LOW_BY}px)`);
    expect(lowered()).toBe(true);
  });
});
