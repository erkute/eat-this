// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { snapOffsets } from '../phoneSheetSnaps';
import { useHandleScrollDrag } from '../useHandleScrollDrag';

function pointerEvent(type: string, clientY: number, pointerId = 1, clientX = 0) {
  const ev = new MouseEvent(type, { bubbles: true, cancelable: true, clientX, clientY });
  Object.defineProperty(ev, 'pointerId', { value: pointerId });
  return ev;
}

/* The hook moves the sheet once per frame; these run the frame by hand. */
let frames: FrameRequestCallback[] = [];
function nextFrame() {
  const due = frames;
  frames = [];
  due.forEach((cb) => cb(0));
}

function setViewport(width: number) {
  vi.stubGlobal('matchMedia', (query: string) => {
    // Mirrors the hook's `(max-width: 767.98px)` phone probe.
    const max = Number(/max-width:\s*([\d.]+)px/.exec(query)?.[1] ?? '0');
    return { matches: width <= max, media: query, addEventListener() {}, removeEventListener() {} };
  });
}

let handle: HTMLDivElement;
let scrollTo: ReturnType<typeof vi.fn>;

function mount(view: 'list' | 'detail' = 'list') {
  return renderHook(() => useHandleScrollDrag({ current: handle }, view));
}

describe('useHandleScrollDrag', () => {
  beforeEach(() => {
    handle = document.createElement('div');
    document.body.appendChild(handle);
    // Mirror a real scroller so a drag-then-release sequence is realistic.
    scrollTo = vi.fn((opts: { top: number }) => {
      Object.defineProperty(window, 'scrollY', {
        value: opts.top,
        writable: true,
        configurable: true,
      });
    });
    vi.stubGlobal('scrollTo', scrollTo);
    frames = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      delete frames[id - 1];
    });
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });
    setViewport(375);
  });
  afterEach(() => {
    handle.remove();
    vi.unstubAllGlobals();
  });

  it.each(['list', 'detail'] as const)('leaves touch scrolling native in %s, without snapping on release', (view) => {
    mount(view);
    const touch = (type: string, y: number) => {
      const event = pointerEvent(type, y);
      Object.defineProperty(event, 'pointerType', { value: 'touch' });
      return event;
    };
    const down = touch('pointerdown', 500);
    handle.dispatchEvent(down);
    handle.dispatchEvent(touch('pointermove', 440));
    // The browser owns the displacement, including any intermediate position.
    window.scrollY = 60;
    handle.dispatchEvent(touch('pointerup', 440));
    nextFrame();
    expect(down.defaultPrevented).toBe(false);
    expect(scrollTo).not.toHaveBeenCalled();
    expect(window.scrollY).toBe(60);
  });

  it('does not settle a native gesture when the browser takes over via pointercancel', () => {
    mount();
    for (const [type, y] of [['pointerdown', 500], ['pointermove', 460], ['pointercancel', 460]] as const) {
      const event = pointerEvent(type, y);
      Object.defineProperty(event, 'pointerType', { value: 'touch' });
      handle.dispatchEvent(event);
    }
    nextFrame();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('maps an upward drag onto downward document scroll', () => {
    mount();
    handle.dispatchEvent(pointerEvent('pointerdown', 500));
    handle.dispatchEvent(pointerEvent('pointermove', 380));
    nextFrame();

    // Finger moved 120px up ⇒ the sheet should rise, i.e. scroll down 120px.
    expect(scrollTo).toHaveBeenCalledWith({ top: 120, behavior: 'instant' });
  });

  it('scrolls back up when the drag reverses', () => {
    Object.defineProperty(window, 'scrollY', { value: 300, writable: true, configurable: true });
    mount();
    handle.dispatchEvent(pointerEvent('pointerdown', 200));
    handle.dispatchEvent(pointerEvent('pointermove', 290));
    nextFrame();

    expect(scrollTo).toHaveBeenCalledWith({ top: 210, behavior: 'instant' });
  });

  it('never scrolls above the document top', () => {
    Object.defineProperty(window, 'scrollY', { value: 100, writable: true, configurable: true });
    mount();
    handle.dispatchEvent(pointerEvent('pointerdown', 200));
    handle.dispatchEvent(pointerEvent('pointermove', 900));
    nextFrame();

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
  });

  it('stays inert on tablet and desktop, where the transform sheet runs', () => {
    setViewport(1024);
    mount();
    handle.dispatchEvent(pointerEvent('pointerdown', 500));
    handle.dispatchEvent(pointerEvent('pointermove', 380));

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('ignores movement after the pointer is released', () => {
    mount();
    handle.dispatchEvent(pointerEvent('pointerdown', 500));
    handle.dispatchEvent(pointerEvent('pointerup', 500));
    handle.dispatchEvent(pointerEvent('pointermove', 380));

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('settles on the next stop when the handle is released', () => {
    mount('list');
    handle.dispatchEvent(pointerEvent('pointerdown', 500));
    handle.dispatchEvent(pointerEvent('pointermove', 440)); // 60px up — deliberate
    handle.dispatchEvent(pointerEvent('pointerup', 440));

    const settle = scrollTo.mock.calls.at(-1)![0];
    expect(settle.behavior).toBe('smooth');
    expect(settle.top).toBe(snapOffsets('list', window.innerHeight)[1]);
  });

  it('uses the detail stops when the detail is open', () => {
    mount('detail');
    handle.dispatchEvent(pointerEvent('pointerdown', 500));
    handle.dispatchEvent(pointerEvent('pointermove', 440));
    handle.dispatchEvent(pointerEvent('pointerup', 440));

    const settle = scrollTo.mock.calls.at(-1)![0];
    expect(settle.top).toBe(snapOffsets('detail', window.innerHeight)[1]);
  });

  it('does not settle when the handle was only tapped', () => {
    mount('list');
    handle.dispatchEvent(pointerEvent('pointerdown', 500));
    handle.dispatchEvent(pointerEvent('pointerup', 500));

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('ignores a second, unrelated pointer mid-drag', () => {
    mount();
    handle.dispatchEvent(pointerEvent('pointerdown', 500, 1));
    handle.dispatchEvent(pointerEvent('pointermove', 380, 2));
    nextFrame();

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('moves the sheet once per frame, to where the finger is last', () => {
    /* iOS delivers touches faster than a 60 Hz screen draws; a scrollTo per
       event landed the sheet in uneven steps. */
    mount();
    handle.dispatchEvent(pointerEvent('pointerdown', 500));
    handle.dispatchEvent(pointerEvent('pointermove', 470));
    handle.dispatchEvent(pointerEvent('pointermove', 440));
    expect(scrollTo).not.toHaveBeenCalled();

    nextFrame();
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({ top: 60, behavior: 'instant' });
  });

  it('lands the last position on release, even between frames', () => {
    mount('list');
    handle.dispatchEvent(pointerEvent('pointerdown', 500));
    handle.dispatchEvent(pointerEvent('pointermove', 440));
    handle.dispatchEvent(pointerEvent('pointerup', 440));

    expect(scrollTo.mock.calls[0][0]).toEqual({ top: 60, behavior: 'instant' });
  });
});

describe('the grab zone around the handle (the list filter bar)', () => {
  let zone: HTMLDivElement;
  let chip: HTMLButtonElement;

  beforeEach(() => {
    zone = document.createElement('div');
    zone.setAttribute('data-sheet-grab-zone', '');
    handle = document.createElement('div');
    chip = document.createElement('button');
    zone.append(handle, chip);
    document.body.appendChild(zone);
    scrollTo = vi.fn((opts: { top: number }) => {
      Object.defineProperty(window, 'scrollY', {
        value: opts.top,
        writable: true,
        configurable: true,
      });
    });
    vi.stubGlobal('scrollTo', scrollTo);
    frames = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      delete frames[id - 1];
    });
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });
    setViewport(375);
  });
  afterEach(() => {
    zone.remove();
    vi.unstubAllGlobals();
  });

  it('drags the sheet from a chip once the finger moves vertically', () => {
    mount();
    chip.dispatchEvent(pointerEvent('pointerdown', 500));
    chip.dispatchEvent(pointerEvent('pointermove', 497));
    nextFrame();
    expect(scrollTo).not.toHaveBeenCalled();

    chip.dispatchEvent(pointerEvent('pointermove', 440));
    nextFrame();
    // Measured from where the finger went down — no jump by the threshold.
    expect(scrollTo).toHaveBeenCalledWith({ top: 60, behavior: 'instant' });
  });

  it('leaves a tap on a chip a tap', () => {
    const onChip = vi.fn();
    chip.addEventListener('click', onChip);
    mount();
    chip.dispatchEvent(pointerEvent('pointerdown', 500));
    chip.dispatchEvent(pointerEvent('pointerup', 501));
    chip.click();

    expect(scrollTo).not.toHaveBeenCalled();
    expect(onChip).toHaveBeenCalledTimes(1);
  });

  it('does not let a drag that began on a chip click it', () => {
    const onChip = vi.fn();
    chip.addEventListener('click', onChip);
    mount();
    chip.dispatchEvent(pointerEvent('pointerdown', 500));
    chip.dispatchEvent(pointerEvent('pointermove', 440));
    chip.dispatchEvent(pointerEvent('pointerup', 440));
    chip.click();

    expect(onChip).not.toHaveBeenCalled();
  });

  it('leaves a sideways swipe on the chips alone', () => {
    mount();
    chip.dispatchEvent(pointerEvent('pointerdown', 500, 1, 100));
    chip.dispatchEvent(pointerEvent('pointermove', 498, 1, 160));
    chip.dispatchEvent(pointerEvent('pointermove', 440, 1, 170));
    nextFrame();

    expect(scrollTo).not.toHaveBeenCalled();
  });
});
