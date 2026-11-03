// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { usePhotoRail } from '../usePhotoRail';

function Harness({ count = 3, touchDrag = true, onClick = vi.fn() }) {
  const { railRef, handlers } = usePhotoRail(count, { touchDrag });
  return <div onClick={onClick}><div data-testid="rail" ref={railRef} {...handlers}><img alt="Spot" /></div></div>;
}
beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(380);
  HTMLElement.prototype.scrollTo = vi.fn(function (this: HTMLElement, options?: ScrollToOptions | number) {
    this.scrollLeft = typeof options === 'number' ? options : options?.left ?? this.scrollLeft;
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function touch(el: HTMLElement, type: string, x: number, y: number, fingers = 1) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const point = { clientX: x, clientY: y };
  Object.assign(event, { touches: type === 'touchend' || type === 'touchcancel' ? [] : Array(fingers).fill(point), changedTouches: [point] });
  act(() => { el.dispatchEvent(event); });
  return event;
}

it('moves list photos without native browser scrolling and suppresses the swipe click', () => {
  const onClick = vi.fn();
  const { getByTestId } = render(<Harness onClick={onClick} />);
  const rail = getByTestId('rail');
  touch(rail, 'touchstart', 320, 400);
  expect(touch(rail, 'touchmove', 290, 403).defaultPrevented).toBe(true);
  expect(rail.scrollLeft).toBe(30);
  touch(rail, 'touchmove', 160, 420);
  touch(rail, 'touchend', 160, 420);
  expect(rail.scrollLeft).toBe(380);
  fireEvent.click(rail);
  expect(onClick).not.toHaveBeenCalled();
  touch(rail, 'touchstart', 200, 400);
  touch(rail, 'touchend', 200, 400);
  fireEvent.click(rail);
  expect(onClick).toHaveBeenCalledOnce();
});

it('leaves vertical gestures and single-photo cards to native scrolling', () => {
  const { getByTestId, rerender } = render(<Harness />);
  const rail = getByTestId('rail');
  touch(rail, 'touchstart', 300, 400);
  expect(touch(rail, 'touchmove', 298, 350).defaultPrevented).toBe(false);
  expect(touch(rail, 'touchmove', 190, 340).defaultPrevented).toBe(false);
  touch(rail, 'touchend', 190, 340);
  expect(rail.scrollLeft).toBe(0);
  rerender(<Harness count={1} />);
  touch(rail, 'touchstart', 300, 400);
  expect(touch(rail, 'touchmove', 160, 402).defaultPrevented).toBe(false);
});

it('supports back swipes, cancellation and reduced motion', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const { getByTestId } = render(<Harness />);
  const rail = getByTestId('rail');
  rail.scrollLeft = 380;
  touch(rail, 'touchstart', 150, 400);
  touch(rail, 'touchmove', 300, 405);
  touch(rail, 'touchend', 300, 405);
  expect(rail.scrollLeft).toBe(0);
  expect(rail.scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: 'instant' });
  touch(rail, 'touchstart', 300, 400);
  touch(rail, 'touchmove', 150, 400);
  touch(rail, 'touchcancel', 150, 400);
  expect(rail.style.scrollSnapType).toBe('');
  expect(rail.scrollLeft).toBe(0);
});

it('keeps the detail rail on native touch scrolling', () => {
  const { getByTestId } = render(<Harness touchDrag={false} />);
  const rail = getByTestId('rail');
  touch(rail, 'touchstart', 300, 400);
  expect(touch(rail, 'touchmove', 150, 400).defaultPrevented).toBe(false);
  expect(rail.scrollLeft).toBe(0);
});

it('restores snapping only after settling and stops an old animation for a new gesture', () => {
  const { getByTestId } = render(<Harness />);
  const rail = getByTestId('rail');
  rail.scrollTo = vi.fn(); // A smooth scroll is asynchronous in the browser.
  touch(rail, 'touchstart', 320, 400);
  touch(rail, 'touchmove', 184, 400);
  touch(rail, 'touchend', 184, 400);
  expect(rail.style.scrollSnapType).toBe('none');
  expect(rail.scrollLeft).toBe(136);
  touch(rail, 'touchstart', 180, 400);
  expect(rail.scrollTo).toHaveBeenLastCalledWith({ left: 136, behavior: 'instant' });
  touch(rail, 'touchmove', 100, 400);
  touch(rail, 'touchend', 100, 400);
  rail.scrollLeft = 380;
  fireEvent.scroll(rail);
  expect(rail.style.scrollSnapType).toBe('');
});

it('finishes on the same photo when the rail shrinks during smooth settling', () => {
  let resized: (() => void) | undefined;
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { resized = callback; }
    observe() {}
    disconnect() {}
  });
  const { getByTestId } = render(<Harness />);
  const rail = getByTestId('rail');
  rail.scrollLeft = 380;
  rail.scrollTo = vi.fn();
  touch(rail, 'touchstart', 320, 400);
  touch(rail, 'touchmove', 184, 400);
  touch(rail, 'touchend', 184, 400);
  expect(rail.scrollTo).toHaveBeenLastCalledWith({ left: 760, behavior: 'smooth' });
  Object.defineProperty(rail, 'clientWidth', { value: 280 });
  act(() => resized?.());
  expect(rail.scrollTo).toHaveBeenLastCalledWith({ left: 560, behavior: 'instant' });
  expect(rail.style.scrollSnapType).toBe('');
});
