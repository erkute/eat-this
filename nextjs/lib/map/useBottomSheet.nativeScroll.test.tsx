// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useBottomSheet } from './useBottomSheet';

function Harness() {
  const sheet = useBottomSheet();
  sheet.configure({ inflow: true });
  return <div ref={sheet.sheetRef} data-test-sheet> 
    <div ref={sheet.handleRef} data-test-handle />
    <div ref={sheet.setHeaderRef} />
    <div ref={sheet.setContentRef} />
  </div>;
}

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('does not register blocking touchmove handlers on phones, and rebinds on tablet resize', () => {
  let phone = true;
  let resize: (() => void) | undefined;
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() { return query.includes('767.98') ? phone : true; },
    addEventListener: (_: string, fn: () => void) => { resize = fn; },
    removeEventListener: vi.fn(),
  }));
  const add = vi.spyOn(HTMLElement.prototype, 'addEventListener');
  const remove = vi.spyOn(HTMLElement.prototype, 'removeEventListener');
  render(<Harness />);
  const blocking = () => add.mock.calls.filter(([type, , options]) =>
    type === 'touchmove' && typeof options === 'object' && options.passive === false);
  expect(blocking()).toHaveLength(0);
  act(() => { phone = false; resize?.(); });
  expect(blocking()).toHaveLength(2);
  act(() => { phone = true; resize?.(); });
  expect(remove.mock.calls.filter(([type]) => type === 'touchmove')).toHaveLength(2);
});


it('moves only the tablet sheet transform and releases it on a phone breakpoint change', () => {
  let phone = false;
  let resize: (() => void) | undefined;
  let frame: FrameRequestCallback | undefined;
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() { return query.includes('767.98') ? phone : true; },
    addEventListener: (_: string, fn: () => void) => { resize = fn; },
    removeEventListener: vi.fn(),
  }));
  vi.stubGlobal('requestAnimationFrame', (fn: FrameRequestCallback) => { frame = fn; return 1; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  const { container } = render(<Harness />);
  const sheet = container.querySelector<HTMLElement>('[data-test-sheet]')!;
  const handle = container.querySelector<HTMLElement>('[data-test-handle]')!;
  handle.setPointerCapture = vi.fn();
  handle.releasePointerCapture = vi.fn();
  const send = (type: string, clientY: number) => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.assign(event, { pointerId: 1, clientY });
    act(() => { handle.dispatchEvent(event); });
  };
  const restingY = sheet.style.getPropertyValue('--sheet-y');
  send('pointerdown', 500);
  send('pointermove', 420);
  act(() => { frame?.(16); });
  expect(sheet.style.transform).toBe(`translateY(${parseFloat(restingY) - 80}px)`);
  expect(sheet.style.getPropertyValue('--sheet-y')).toBe(restingY);
  // A phone uses document scroll: the inline tablet transform must not leak.
  act(() => { phone = true; resize?.(); });
  expect(sheet.style.transform).toBe('');
});
