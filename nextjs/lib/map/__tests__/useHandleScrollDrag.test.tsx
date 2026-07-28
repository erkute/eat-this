// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { snapOffsets } from '../phoneSheetSnaps';
import { useHandleScrollDrag } from '../useHandleScrollDrag';

function pointerEvent(type: string, clientY: number, pointerId = 1) {
  const ev = new MouseEvent(type, { bubbles: true, cancelable: true, clientY });
  Object.defineProperty(ev, 'pointerId', { value: pointerId });
  return ev;
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
    Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });
    setViewport(375);
  });
  afterEach(() => {
    handle.remove();
    vi.unstubAllGlobals();
  });

  it('maps an upward drag onto downward document scroll', () => {
    mount();
    handle.dispatchEvent(pointerEvent('pointerdown', 500));
    handle.dispatchEvent(pointerEvent('pointermove', 380));

    // Finger moved 120px up ⇒ the sheet should rise, i.e. scroll down 120px.
    expect(scrollTo).toHaveBeenCalledWith({ top: 120, behavior: 'instant' });
  });

  it('scrolls back up when the drag reverses', () => {
    Object.defineProperty(window, 'scrollY', { value: 300, writable: true, configurable: true });
    mount();
    handle.dispatchEvent(pointerEvent('pointerdown', 200));
    handle.dispatchEvent(pointerEvent('pointermove', 290));

    expect(scrollTo).toHaveBeenCalledWith({ top: 210, behavior: 'instant' });
  });

  it('never scrolls above the document top', () => {
    mount();
    handle.dispatchEvent(pointerEvent('pointerdown', 200));
    handle.dispatchEvent(pointerEvent('pointermove', 900));

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

    expect(scrollTo).not.toHaveBeenCalled();
  });
});
