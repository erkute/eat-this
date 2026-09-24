// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
}));

import MapDataNotice from './MapDataNotice';

/* Die Meldung rendert kein Markup — sie geht durch die zentrale Info-Karte.
   Geprüft wird deshalb der Aufruf, nicht der DOM. */
const showNotice = vi.fn();
beforeEach(() => {
  showNotice.mockReset();
  window.showNotice = showNotice;
});
afterEach(cleanup);

describe('MapDataNotice', () => {
  it('labels cached rows as stale and offers a working retry after an error', () => {
    const onRetry = vi.fn();
    render(<MapDataNotice error="HTTP 500" hasData onRetry={onRetry} />);

    const notice = showNotice.mock.calls[0][0];
    expect(notice.title).toBe('Not current');
    expect(notice.detail).toBe('You are looking at older map data.');
    expect(notice.action.label).toBe('Retry');
    /* Knöpfe heißen Layer — und ein Layer lässt sich immer wegklicken. */
    expect(notice.onDismiss).toBeTypeOf('function');
    notice.action.onClick();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('distinguishes a total load failure from stale data', () => {
    render(<MapDataNotice error="HTTP 500" hasData={false} onRetry={vi.fn()} />);

    expect(showNotice).toHaveBeenCalledWith(
      expect.objectContaining({ tone: 'error', title: 'Not loaded' })
    );
  });

  it('stays quiet while the payload is current', () => {
    const { container } = render(<MapDataNotice error={null} hasData onRetry={vi.fn()} />);

    expect(container.innerHTML).toBe('');
    expect(showNotice).not.toHaveBeenCalled();
  });

  it('stays quiet during an initial load — the map says that itself', () => {
    render(<MapDataNotice error={null} hasData={false} onRetry={vi.fn()} />);

    expect(showNotice).not.toHaveBeenCalled();
  });
});
