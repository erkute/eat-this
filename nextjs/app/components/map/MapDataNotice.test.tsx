// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

const copy: Record<string, string> = {
  dataEyebrow: 'Map',
  dataLoadingTitle: 'Loading',
  dataLoadingDetail: 'Spots on their way',
  dataRefreshingTitle: 'Updating',
  dataRefreshingDetail: 'Fetching the latest',
  dataErrorTitle: 'Not loaded',
  dataErrorDetail: 'Check your connection',
  dataStaleTitle: 'Update failed',
  dataStaleDetail: 'Older map data',
  dataRetry: 'Retry',
};

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => copy[key] ?? key,
}));

import MapDataNotice from './MapDataNotice';

/* Die Meldung rendert kein Markup mehr — sie geht durch die zentrale
   Info-Karte. Geprüft wird deshalb der Aufruf, nicht der DOM. */
const showNotice = vi.fn();
beforeEach(() => {
  showNotice.mockReset();
  window.showNotice = showNotice;
});
afterEach(cleanup);

describe('MapDataNotice', () => {
  it('announces an initial payload load', () => {
    render(<MapDataNotice loading error={null} hasData={false} onRetry={vi.fn()} />);

    expect(showNotice).toHaveBeenCalledWith(
      expect.objectContaining({ tone: 'info', title: 'Loading', detail: 'Spots on their way' })
    );
  });

  it('labels cached rows as stale and offers a working retry after an error', () => {
    const onRetry = vi.fn();
    render(<MapDataNotice loading={false} error="HTTP 500" hasData onRetry={onRetry} />);

    const notice = showNotice.mock.calls[0][0];
    expect(notice.tone).toBe('warning');
    expect(notice.detail).toBe('Older map data');
    expect(notice.action.label).toBe('Retry');
    notice.action.onClick();
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('distinguishes a total load failure from stale data', () => {
    render(<MapDataNotice loading={false} error="HTTP 500" hasData={false} onRetry={vi.fn()} />);

    expect(showNotice).toHaveBeenCalledWith(expect.objectContaining({ title: 'Not loaded' }));
  });

  it('stays quiet while the payload is current', () => {
    const { container } = render(
      <MapDataNotice loading={false} error={null} hasData onRetry={vi.fn()} />
    );

    expect(container.innerHTML).toBe('');
    expect(showNotice).not.toHaveBeenCalled();
  });
});
