// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { beforeEach, afterEach, it, expect, vi } from 'vitest';
const state = vi.hoisted(() => ({ pathname: '/news/one', count: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => state.pathname }));
vi.mock('@/lib/analytics', () => ({ countInsight: state.count }));
import Tracker from './PageInsightTracker';
import { publishInsightEvent } from '@/lib/analytics/eventSignals';
const rect = (top = 0, height = 1000) => ({
  top,
  height,
  width: 400,
  left: 0,
  right: 400,
  bottom: top + height,
  x: 0,
  y: top,
  toJSON: () => ({}),
});
beforeEach(() => {
  vi.useFakeTimers();
  state.count.mockClear();
  state.pathname = '/news/one';
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 250 });
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([
    rect(),
  ] as unknown as DOMRectList);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => rect());
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => setTimeout(() => cb(0), 1));
  vi.stubGlobal('cancelAnimationFrame', clearTimeout);
});
afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  document.documentElement.removeAttribute('data-consent-gate');
  document.documentElement.removeAttribute('data-consent-pending');
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it('zählt Aufruf, sichtbare Zeit und Weiterklick je Aufruf einmal und speichert keine Eingaben', () => {
  document.body.innerHTML =
    '<div data-page="news-article" class="active" data-article-slug="one"><div data-article-content><a href="/restaurant/test">Spot</a><input type="text" value="private@example.test"></div></div>';
  render(<Tracker />);
  expect(state.count).toHaveBeenCalledWith(expect.objectContaining({ signals: ['view'] }));
  act(() => vi.advanceTimersByTime(11_000));
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
  fireEvent(document, new Event('visibilitychange'));
  act(() => vi.advanceTimersByTime(40_000));
  expect(
    state.count.mock.calls.flatMap(([body]) => body.signals ?? []).filter((s) => s === 'read30')
  ).toHaveLength(0);
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  fireEvent(document, new Event('visibilitychange'));
  act(() => vi.advanceTimersByTime(20_000));
  fireEvent.click(document.querySelector('a')!, { detail: 1, clientX: 100, clientY: 100 });
  fireEvent.click(document.querySelector('a')!, { detail: 1, clientX: 100, clientY: 100 });
  const signals = state.count.mock.calls.flatMap(([body]) => body.signals ?? []);
  expect(signals.filter((s) => s === 'engaged')).toHaveLength(1);
  expect(signals.filter((s) => s === 'read30')).toHaveLength(1);
  expect(signals.filter((s) => s === 'onward')).toHaveLength(1);
  expect(JSON.stringify(state.count.mock.calls)).not.toContain('private');
});
it('misst auf der Map Suchnutzung ohne Suchtext, Spot-Öffnung je Aufruf und keine geografischen Klickpunkte', () => {
  state.pathname = '/map';
  document.body.innerHTML =
    '<main data-page="map" class="active"><input type="search"><button>Filter</button></main>';
  render(<Tracker />);
  fireEvent.input(document.querySelector('input')!, { target: { value: 'private search' } });
  act(() => {
    publishInsightEvent('restaurant_opened');
    publishInsightEvent('restaurant_opened');
  });
  const signals = state.count.mock.calls.flatMap(([body]) => body.signals ?? []);
  expect(signals.filter((s) => s === 'search')).toHaveLength(1);
  expect(signals.filter((s) => s === 'spot')).toHaveLength(1);
  expect(state.count.mock.calls.every(([body]) => body.insight !== 'click')).toBe(true);
  expect(JSON.stringify(state.count.mock.calls)).not.toContain('private');
});
it('ordnet beim Artikelwechsel keinen alten Inhalt der neuen URL zu', () => {
  state.pathname = '/news/two';
  document.body.innerHTML =
    '<div data-page="news-article" class="active" data-article-slug="one"><div data-article-content></div></div>';
  render(<Tracker />);
  act(() => vi.advanceTimersByTime(31_000));
  expect(state.count.mock.calls.flatMap(([body]) => body.signals ?? [])).toEqual(['view']);
});

it('pausiert Tiefe und Lesezeit im Hintergrund und hinter dem Cookie-Dialog', () => {
  document.body.innerHTML =
    '<div data-page="news-article" class="active" data-article-slug="one"><div data-article-content></div></div>';
  document.documentElement.dataset.consentGate = 'open';
  render(<Tracker />);
  act(() => vi.advanceTimersByTime(31_000));
  expect(state.count.mock.calls.flatMap(([body]) => body.signals ?? [])).toEqual(['view']);
  document.documentElement.removeAttribute('data-consent-gate');
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
  fireEvent.resize(window);
  act(() => vi.advanceTimersByTime(31_000));
  expect(state.count.mock.calls.flatMap(([body]) => body.signals ?? [])).toEqual(['view']);
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  fireEvent(document, new Event('visibilitychange'));
  act(() => vi.advanceTimersByTime(11_000));
  const signals = state.count.mock.calls.flatMap(([body]) => body.signals ?? []);
  expect(signals).toContain('depth25');
  expect(signals).toContain('engaged');
  expect(signals).not.toContain('read30');
});
it('zählt eine automatische Spot-Öffnung nicht als tatsächliche Vertiefung', () => {
  state.pathname = '/map';
  document.body.innerHTML = '<main data-page="map" class="active"></main>';
  render(<Tracker />);
  act(() => publishInsightEvent('restaurant_opened'));
  expect(state.count.mock.calls.flatMap(([body]) => body.signals ?? [])).toEqual(['view', 'spot']);
});
it('zeigt auch erfolglose Klicks auf nicht bedienbare Inhalte als eigene Kategorie', () => {
  document.body.innerHTML =
    '<div data-page="news-article" class="active" data-article-slug="one"><div data-article-content><p>Inhalt</p></div></div>';
  render(<Tracker />);
  fireEvent.click(document.querySelector('p')!, { detail: 1, clientX: 100, clientY: 100 });
  expect(state.count).toHaveBeenCalledWith(
    expect.objectContaining({ insight: 'click', target: 'other' })
  );
});

it('erfasst ein anfangs geöffnetes Map-Detail nach Consent-Freigabe ohne künstliche Vertiefung', () => {
  state.pathname = '/map';
  document.documentElement.dataset.consentGate = 'open';
  document.body.innerHTML =
    '<main data-page="map" class="active"><div data-detail-mount data-detail-kind="restaurant"></div></main>';
  render(<Tracker />);
  expect(state.count.mock.calls.flatMap(([body]) => body.signals ?? [])).toEqual(['view']);
  document.documentElement.removeAttribute('data-consent-gate');
  fireEvent.resize(window);
  act(() => vi.advanceTimersByTime(10));
  expect(state.count.mock.calls.flatMap(([body]) => body.signals ?? [])).toEqual(['view', 'spot']);
});

it('erfasst einen tatsächlichen Klick auf den Map-Canvas als Interaktion ohne geografische Heatmap', () => {
  state.pathname = '/map';
  document.body.innerHTML = '<main data-page="map" class="active"><canvas></canvas></main>';
  render(<Tracker />);
  fireEvent.click(document.querySelector('canvas')!, { detail: 1, clientX: 50, clientY: 50 });
  expect(state.count).toHaveBeenCalledWith(
    expect.objectContaining({ insight: 'signals', signals: ['engaged'] })
  );
  expect(state.count.mock.calls.every(([body]) => body.insight !== 'click')).toBe(true);
});
