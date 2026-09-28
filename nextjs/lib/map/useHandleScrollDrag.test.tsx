// @vitest-environment jsdom

import { useRef } from 'react';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));

import { useHandleScrollDrag } from './useHandleScrollDrag';
import { LOWERED_GAP_PX, MAP_STRIP_PX } from './sheetSlide';

/**
 * The phone list's grabber — pull the list off the map and back.
 *
 * Geometry: an 800px viewport, the sheet's top edge at document offset 600.
 * All the way up, the sheet leaves the 72px map strip showing, so the page
 * runs from 0 (map stop) to 528 (bar on the strip line); anything past that
 * is "deep in the list". The grip leaves the sheet wherever it lets go
 * (user, 28.09.2026). jsdom has no Web Animations, so every slide lands
 * instantly — these cases are about where things END.
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
      <div data-map-frame="" />
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
    it('leaves the bar where the finger let go, with the list back at its top', async () => {
      window.scrollY = DEEP;
      drag(120);
      await settle();

      /* The bar stands 120px below the strip line: the page is scrolled so
         the sheet's own top lies there. */
      expect(window.scrollY).toBe(REST_OFFSET - 120);
      expect(sheet().style.transform).toBe('');
      expect(sheet().style.clipPath).toBe('');
      expect(lowered()).toBe(false);
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

    it('holds the sheet below the map stop when let go past its resting line', async () => {
      window.scrollY = DEEP;
      drag(REST_OFFSET + 100);
      await settle();

      expect(window.scrollY).toBe(0);
      expect(sheet().style.transform).toBe('translateY(100px)');
      expect(sheet().style.clipPath).toBe('');
      expect(lowered()).toBe(true);
    });

    it('does not snap: a short, slow pull stays a short pull', async () => {
      window.scrollY = DEEP;
      drag(30, { steps: 6, msPerStep: 80 });
      await settle();

      expect(window.scrollY).toBe(REST_OFFSET - 30);
      expect(window.scrollTo).not.toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }));
    });

    it('does not throw a flick on: the sheet stays where the finger left it', async () => {
      window.scrollY = DEEP;
      drag(40, { steps: 2, msPerStep: 16 });
      await settle();

      expect(window.scrollY).toBe(REST_OFFSET - 40);
    });

    it('takes a wobbling press as a press, not a pull — the list stays where it was', async () => {
      window.scrollY = DEEP;
      drag(10, { steps: 3, msPerStep: 100 });
      await settle();

      expect(window.scrollY).toBe(DEEP);
      expect(sheet().style.transform).toBe('');
    });

    it('leaves the list where it was when the bar comes back to where it started', async () => {
      window.scrollY = DEEP;
      const handle = document.querySelector('[data-sheet-handle]')!;
      handle.dispatchEvent(pointer('pointerdown', 100, 0));
      handle.dispatchEvent(pointer('pointermove', 180, 40));
      handle.dispatchEvent(pointer('pointermove', 90, 80));
      handle.dispatchEvent(pointer('pointerup', 90, 120));
      await settle();

      expect(window.scrollY).toBe(DEEP);
      expect(sheet().style.transform).toBe('');
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
      drag(0, { steps: 0 });
      await settle();
    });

    it('drags from the top of the list, not back to the row it left', async () => {
      drag(-120);
      await settle();

      expect(window.scrollY).toBe(120);
      expect(sheet().style.transform).toBe('');
    });

    it('puts the sheet back where it was after a wobbling press', async () => {
      window.scrollY = 200;
      drag(-10, { steps: 3, msPerStep: 100 });
      await settle();

      expect(window.scrollY).toBe(200);
    });

    it('stops the bar at the strip line, however far the finger goes', () => {
      const handle = document.querySelector('[data-sheet-handle]')!;
      handle.dispatchEvent(pointer('pointerdown', 700, 0));
      handle.dispatchEvent(pointer('pointermove', -900, 40));
      nextFrame();

      expect(window.scrollY).toBe(REST_OFFSET);
      handle.dispatchEvent(pointer('pointerup', -900, 80));
      expect(window.scrollY).toBe(REST_OFFSET);
    });

    it('opens the whole sheet on a tap', async () => {
      drag(0, { steps: 0 });
      await settle();

      expect(window.scrollY).toBe(REST_OFFSET);
    });
  });

  describe('below the map stop', () => {
    beforeEach(async () => {
      drag(100);
      await settle();
    });

    it('is reached from the map stop by pulling the bar down, and stays where it is let go', () => {
      expect(window.scrollY).toBe(0);
      expect(sheet().style.transform).toBe('translateY(100px)');
      expect(lowered()).toBe(true);
    });

    it('puts the map frame behind the moved sheet, and back over it when it rests on the page', async () => {
      const frame = () => document.querySelector('[data-map-frame]')!;
      expect(frame().hasAttribute('data-following')).toBe(true);

      drag(0, { steps: 0 });
      await settle();
      expect(frame().hasAttribute('data-following')).toBe(false);
    });

    it('goes on down to the lowest line, not further', async () => {
      drag(1000);
      await settle();

      expect(sheet().style.transform).toBe(`translateY(${LOW_BY}px)`);
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
      drag(-(100 + 200));
      await settle();

      expect(window.scrollY).toBe(200);
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

  it('stays uncovered: the grip stops the bar on the strip line', async () => {
    window.scrollY = 500;
    drag(-200);
    await settle();

    expect(window.scrollY).toBe(SHEET_DOC_TOP - MAP_STRIP_PX);
  });
});

describe("the bottom bound: clear of Safari's URL bar", () => {
  beforeEach(() => {
    render(<Harness />);
  });

  it('takes the visual viewport when it is shorter than the window', async () => {
    Object.defineProperty(window, 'visualViewport', {
      value: { height: 700, offsetTop: 0 },
      configurable: true,
    });
    drag(1000);
    await settle();
    Object.defineProperty(window, 'visualViewport', { value: undefined, configurable: true });

    expect(sheet().style.transform).toBe(`translateY(${700 - LOWERED_GAP_PX - SHEET_DOC_TOP}px)`);
  });

  it('takes the viewport with the toolbar unfolded — a pull from deep starts with it folded', async () => {
    /* 100svh: what the viewport will be once the scroll back to the map has
       brought Safari's bar back. */
    const offsetHeight = vi
      .spyOn(HTMLElement.prototype, 'offsetHeight', 'get')
      .mockImplementation(function (this: HTMLElement) {
        return this.style.height === '100svh' ? 740 : 0;
      });
    Object.defineProperty(window, 'innerWidth', { value: 391, configurable: true });
    window.scrollY = DEEP;
    drag(2000);
    await settle();
    offsetHeight.mockRestore();
    /* A new width measures again: the next test starts without the probe. */
    Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true });

    expect(window.scrollY).toBe(0);
    expect(sheet().style.transform).toBe(`translateY(${740 - LOWERED_GAP_PX - SHEET_DOC_TOP}px)`);
  });
});

describe('in a detail', () => {
  it('pulls a restaurant detail off the map, back at its top', async () => {
    render(<Harness view="detail" detailKind="restaurant" />);
    window.scrollY = DEEP;
    drag(REST_OFFSET);
    await settle();

    expectRestingAtTop();

    drag(-120);
    await settle();
    expect(window.scrollY).toBe(120);
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
  it('lowers a scrolled sheet with a touch grip drag', async () => {
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
    expect(window.scrollY).toBe(REST_OFFSET - 120);
    expect(sheet().style.transform).toBe('');
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
    expect(window.scrollY).toBe(REST_OFFSET - 140);
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
    expect(window.scrollY).toBe(REST_OFFSET - 120);
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
    expect(sheet().style.transform).toBe('translateY(100px)');
    expect(lowered()).toBe(true);
  });
});
