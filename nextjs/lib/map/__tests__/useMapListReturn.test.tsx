// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMapListAnchor, useMapListReturn } from '../useMapListReturn';

const viewport = vi.hoisted(() => ({ phone: true }));
vi.mock('../viewport', () => ({ isPhoneViewport: () => viewport.phone }));
let y = 0;
const scroll = vi.fn((first: number | ScrollToOptions) => { y = typeof first === 'number' ? first : first.top ?? y; });
function setup(initialDetail = false) {
  const sheet = document.createElement('div');
  sheet.getBoundingClientRect = () => ({ top: 600 - y }) as DOMRect;
  const port = document.createElement('div');
  port.scrollTop = 500;
  const options = {
    sheetView: (initialDetail ? 'detail' : 'list') as 'list' | 'detail',
    initialDetail,
    sheetElRef: { current: sheet }, contentRef: { current: port },
    filterKey: 'all', listCenter: null,
    history: { detailEntryPushedRef: { current: false }, detailClosedBySearchRef: { current: false }, listAnchorPendingRef: { current: false } },
  };
  const hook = renderHook(props => {
    const scrollToAnchor = useMapListAnchor(props.sheetElRef);
    return useMapListReturn({ ...props, scrollToAnchor });
  }, { initialProps: options });
  return { ...hook, options, port };
}
beforeEach(() => {
  vi.useFakeTimers(); viewport.phone = true; y = 0; scroll.mockClear();
  Object.defineProperty(window, 'scrollY', { configurable: true, get: () => y });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
  vi.stubGlobal('scrollTo', scroll);
});
afterEach(() => { cleanup(); document.body.innerHTML = ''; vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('map detail/list return', () => {
  it('leaves first paint untouched and sends a marker-opened detail back to the map', () => {
    const { result, rerender, options } = setup();
    expect(scroll).not.toHaveBeenCalled();
    act(() => result.current.remember('map', null));
    rerender({ ...options, sheetView: 'detail' });
    y = 900;
    act(() => result.current.returnToRow('spot'));
    rerender(options);
    expect(y).toBe(0);
    expect(result.current.focusId).toBeNull();
    expect(result.current.getOrigin()).toBe('map');
  });

  it('returns a deep link to the list top, or defers it until history has restored scroll', () => {
    const { rerender, options } = setup(true);
    options.history.detailEntryPushedRef.current = true;
    rerender({ ...options, sheetView: 'list' });
    expect(options.history.listAnchorPendingRef.current).toBe(true);
    expect(scroll).not.toHaveBeenCalled();
  });

  it('anchors immediately when search closes a detail without a history traversal', () => {
    const { rerender, options } = setup(true);
    options.history.detailEntryPushedRef.current = true;
    options.history.detailClosedBySearchRef.current = true;
    rerender({ ...options, sheetView: 'list' });
    expect(y).toBe(184);
    expect(options.history.listAnchorPendingRef.current).toBe(false);
  });

  it('returns to the same row after reordering and relinquishes scrolling on touch', () => {
    const row = document.createElement('div'); row.dataset.listRow = 'spot';
    let rowDocumentTop = 1200;
    row.getBoundingClientRect = () => ({ top: rowDocumentTop - y }) as DOMRect;
    document.body.append(row);
    const { result, rerender, options, unmount } = setup();
    y = 800;
    act(() => result.current.remember('list', 'spot'));
    rerender({ ...options, sheetView: 'detail' });
    rowDocumentTop = 1800; y = 0;
    act(() => result.current.returnToRow('spot'));
    rerender(options);
    expect(y).toBe(1400);
    expect(result.current.focusId).toBe('spot');
    act(() => window.dispatchEvent(new Event('touchstart')));
    rowDocumentTop = 2000;
    act(() => vi.advanceTimersByTime(1000));
    expect(y).toBe(1400);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('restores a missing row by saved offset and resets it on filter changes', () => {
    viewport.phone = false;
    const { result, rerender, options, port } = setup();
    act(() => result.current.remember('list', 'spot'));
    rerender({ ...options, sheetView: 'detail' });
    port.scrollTop = 0;
    act(() => result.current.returnToRow('spot'));
    rerender(options);
    expect(port.scrollTop).toBe(500);
    rerender({ ...options, filterKey: 'pizza' });
    expect(port.scrollTop).toBe(0);
    expect(result.current.focusId).toBeNull();
  });

  it('cancels an unsettled row reveal when unmounted', () => {
    const row = document.createElement('div'); row.dataset.listRow = 'spot';
    row.getBoundingClientRect = () => ({ top: 400 }) as DOMRect;
    document.body.append(row);
    const { result, rerender, options, unmount } = setup();
    y = 800;
    act(() => result.current.remember('list', 'spot'));
    rerender({ ...options, sheetView: 'detail' });
    act(() => result.current.returnToRow('spot'));
    rerender(options);
    expect(vi.getTimerCount()).toBeGreaterThan(0);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
