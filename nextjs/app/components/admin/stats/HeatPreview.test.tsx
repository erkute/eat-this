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
  Object.assign(content, { __reactFiberTest: {} });
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
