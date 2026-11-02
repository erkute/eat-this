// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, it, expect, vi } from 'vitest';
const count = vi.hoisted(() => vi.fn());
vi.mock('@/lib/analytics', () => ({ countHome: count }));
vi.mock('next/navigation', () => ({ usePathname: () => '/' }));
import Tracker from './HomeHeatTracker';
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
  count.mockClear();
});
it('misst nach Tabwechseln weiter und erhöht den Nenner nicht erneut', () => {
  vi.useFakeTimers();
  let top = 0;
  const box = () => ({
    top,
    height: 1000,
    width: 400,
    left: 0,
    bottom: top + 1000,
    right: 400,
    x: 0,
    y: top,
    toJSON: () => ({}),
  });
  document.body.innerHTML =
    '<div data-hub><div data-hub-hero><button>private@example.test</button><a href="/deck/privateUid">Deck</a></div></div>';
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 200 });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(box);
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
    box(),
  ] as unknown as DOMRectList);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(0), 1));
  vi.stubGlobal('cancelAnimationFrame', clearTimeout);
  render(<Tracker />);
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
  fireEvent(document, new Event('visibilitychange'));
  top = -700;
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  fireEvent(document, new Event('visibilitychange'));
  act(() => vi.advanceTimersByTime(5));
  expect(count.mock.calls.filter(([body]) => body.home === 'view')).toHaveLength(1);
  const depths = count.mock.calls.flatMap(([body]) => body.depths ?? []);
  expect(depths).toContain(90);
  expect(new Set(depths).size).toBe(depths.length);
  fireEvent.click(document.querySelector('button')!, { detail: 1, clientX: 100, clientY: 100 });
  fireEvent.click(document.querySelector('a')!, { detail: 1, clientX: 100, clientY: 100 });
  expect(JSON.stringify(count.mock.calls)).not.toContain('private');
  expect(count).toHaveBeenCalledWith(expect.objectContaining({ target: '/deck' }));
});
