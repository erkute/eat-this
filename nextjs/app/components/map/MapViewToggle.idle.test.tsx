// @vitest-environment jsdom

import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ lang: 'de', t: (key: string) => key }) }));
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));

import MapViewToggle from './MapViewToggle';

/**
 * The pill stands aside while the list is moving and returns once it rests.
 *
 * This behaviour cannot be checked in the browser preview — a hidden pane
 * throttles real scroll delivery and, having no window focus, dispatches no
 * focus events at all (`.focus()` sets activeElement and fires nothing). Both
 * halves are therefore pinned here, where the clock and the events are ours.
 */

const SHEET_TOP = 600;
/** Past the last snap stop, so the pill has a direction to offer. */
const DEEP_IN_LIST = SHEET_TOP + 400;

function scroll(y: number) {
  act(() => {
    window.scrollY = y;
    window.dispatchEvent(new Event('scroll'));
  });
}

/** Advance past the at-rest threshold without waiting for it in real time. */
function comeToRest() {
  act(() => {
    vi.advanceTimersByTime(900);
  });
}

function pill() {
  return document.querySelector('[data-map-view-toggle]') as HTMLButtonElement;
}

function isOffered() {
  return pill().getAttribute('data-visible') === 'true';
}

beforeEach(() => {
  vi.useFakeTimers();
  // Phone width — the pill parks itself on anything wider.
  window.matchMedia = ((query: string) => ({
    matches: query.includes('max-width: 767.98px'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  })) as unknown as typeof window.matchMedia;

  Object.defineProperty(window, 'innerHeight', { value: 812, configurable: true });
  Object.defineProperty(window, 'scrollY', { value: 0, writable: true, configurable: true });

  // The last snap stop is measured off the sheet, so give the DOM one.
  const sheet = document.createElement('div');
  sheet.setAttribute('data-map-sheet', '');
  sheet.getBoundingClientRect = () => ({ top: SHEET_TOP - window.scrollY }) as DOMRect;
  document.body.append(sheet);
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('MapViewToggle — the pill stands aside while you scroll', () => {
  it('gets out of the way as soon as the list moves, and returns once it rests', () => {
    render(<MapViewToggle sheetView="list" filterKey="none" />);

    scroll(DEEP_IN_LIST);
    expect(isOffered()).toBe(false);

    comeToRest();
    expect(isOffered()).toBe(true);

    scroll(DEEP_IN_LIST + 300);
    expect(isOffered()).toBe(false);
  });

  /**
   * The gaps between deliberate swipes are a couple hundred ms of silence. If
   * the threshold were near zero the pill would flash in and out through every
   * one of them, which is worse than either state.
   */
  it('does not flash back in during the pause between two swipes', () => {
    render(<MapViewToggle sheetView="list" filterKey="none" />);

    scroll(DEEP_IN_LIST);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(isOffered()).toBe(false);

    scroll(DEEP_IN_LIST + 200);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(isOffered()).toBe(false);
  });

  it('keeps a hidden pill out of the tab order and the accessibility tree', () => {
    render(<MapViewToggle sheetView="list" filterKey="none" />);

    scroll(DEEP_IN_LIST);
    expect(pill().tabIndex).toBe(-1);
    expect(pill().getAttribute('aria-hidden')).toBe('true');

    comeToRest();
    expect(pill().tabIndex).toBe(0);
    expect(pill().getAttribute('aria-hidden')).toBeNull();
  });

  /**
   * The one exception to the rule. Hiding a focused pill would strand the focus
   * ring on an element that is `visibility: hidden`, inert and `aria-hidden` —
   * a keyboard user's cursor would simply vanish mid-scroll.
   */
  it('will not slip away from underneath the keyboard', () => {
    render(<MapViewToggle sheetView="list" filterKey="none" />);

    scroll(DEEP_IN_LIST);
    comeToRest();
    act(() => pill().focus());
    expect(document.activeElement).toBe(pill());

    scroll(DEEP_IN_LIST + 300);
    expect(isOffered()).toBe(true);
    expect(pill().getAttribute('aria-hidden')).toBeNull();

    // Once focus moves on, the scroll rule applies again.
    act(() => pill().blur());
    expect(isOffered()).toBe(false);
  });

  it('offers nothing at all where there is nowhere to go, however long you rest', () => {
    render(<MapViewToggle sheetView="list" filterKey="none" />);
    // Between the stops the map is half on screen anyway; standing still there
    // must not conjure the pill just because nothing is moving.
    scroll(300);
    comeToRest();
    expect(isOffered()).toBe(false);
  });
});
