// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import HeatPreview from './HeatPreview';
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  );
  vi.spyOn(HTMLIFrameElement.prototype, 'contentDocument', 'get').mockReturnValue(document);
  history.replaceState(null, '', '/');
  const content = document.createElement('main');
  content.id = 'preview-test-content';
  content.innerHTML = '<a href="/news/another">Weiter</a>';
  vi.spyOn(content, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList);
  document.body.append(content);
});
afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  history.replaceState(null, '', '/');
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
const props = {
  path: '/',
  title: 'Heatmap-Test',
  width: 390,
  sections: [{ key: 'content', label: 'Inhalt', selector: '#preview-test-content' }],
  heat: {},
  views: 0,
};
it('sperrt Navigation in der Vorschau und entfernt Heatmaps bei einem anderen Dokumentpfad', () => {
  render(<HeatPreview {...props} />);
  fireEvent.load(screen.getByTitle('Heatmap-Test'));
  const link = document.querySelector('a')!;
  const click = new MouseEvent('click', { bubbles: true, cancelable: true });
  link.dispatchEvent(click);
  expect(click.defaultPrevented).toBe(true);
  expect(document.querySelector('[data-stats-heat-overlay]')).not.toBeNull();
  history.replaceState(null, '', '/news/another');
  act(() => vi.advanceTimersByTime(1000));
  expect(document.querySelector('[data-stats-heat-overlay]')).toBeNull();
  expect(
    screen.getByText('Für diese Seite konnte keine passende Vorschau geladen werden.')
  ).toBeTruthy();
});
it('zeichnet keine Daten auf einem von Anfang an falschen Seitenpfad', () => {
  render(<HeatPreview {...props} path="/news/expected" />);
  expect(document.querySelector('[data-stats-heat-overlay]')).toBeNull();
});

it('leaves the preview document intact while drawing its heatmap', () => {
  const source = document.querySelector('#preview-test-content')!;
  const original = source.outerHTML;
  render(<HeatPreview {...props} />);
  fireEvent.load(screen.getByTitle('Heatmap-Test'));
  expect(document.querySelector('[data-stats-heat-overlay]')).not.toBeNull();
  expect(source.outerHTML).toBe(original);
  expect(source.querySelector('[data-stats-heat-overlay]')).toBeNull();
});

it('keeps the overlay aligned when the embedded page scrolls', () => {
  const source = document.querySelector<HTMLElement>('#preview-test-content')!;
  const rect = vi
    .spyOn(source, 'getBoundingClientRect')
    .mockReturnValue(new DOMRect(12, 40, 390, 900));
  render(<HeatPreview {...props} />);
  fireEvent.load(screen.getByTitle('Heatmap-Test'));
  const layer = document.querySelector<HTMLElement>('[data-stats-heat-overlay]')!;
  expect(layer.style.top).toBe('40px');
  expect(layer.style.left).toBe('12px');
  rect.mockReturnValue(new DOMRect(12, -180, 390, 900));
  fireEvent.scroll(source);
  expect(layer.style.top).toBe('-180px');
  expect(source.querySelector('[data-stats-heat-overlay]')).toBeNull();
});

it('keeps the loading state while the iframe still has its initial blank document', () => {
  vi.spyOn(document, 'URL', 'get').mockReturnValue('about:blank');
  render(<HeatPreview {...props} path="/news/expected" />);
  expect(screen.getByText('Seitenvorschau wird geladen …')).toBeTruthy();
  expect(
    screen.queryByText('Für diese Seite konnte keine passende Vorschau geladen werden.')
  ).toBeNull();
});
