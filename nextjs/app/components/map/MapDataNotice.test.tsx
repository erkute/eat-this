// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const copy: Record<string, string> = {
  dataLoading: 'Loading map data',
  dataRefreshing: 'Updating your map',
  dataError: 'Map data failed',
  dataStale: 'Showing older map data',
  dataRetry: 'Retry',
};

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => copy[key] ?? key,
}));

import MapDataNotice from './MapDataNotice';

afterEach(cleanup);

describe('MapDataNotice', () => {
  it('announces an initial payload load', () => {
    render(<MapDataNotice loading error={null} hasData={false} onRetry={vi.fn()} />);

    expect(screen.getByRole('status').textContent).toContain('Loading map data');
  });

  it('labels cached rows as stale and offers a working retry after an error', () => {
    const onRetry = vi.fn();
    render(<MapDataNotice loading={false} error="HTTP 500" hasData onRetry={onRetry} />);

    expect(screen.getByRole('alert').textContent).toContain('Showing older map data');
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('distinguishes a total load failure from stale data', () => {
    render(
      <MapDataNotice loading={false} error="HTTP 500" hasData={false} onRetry={vi.fn()} />,
    );

    expect(screen.getByRole('alert').textContent).toContain('Map data failed');
  });

  it('renders nothing while the payload is current', () => {
    const { container } = render(
      <MapDataNotice loading={false} error={null} hasData onRetry={vi.fn()} />,
    );

    expect(container.innerHTML).toBe('');
  });
});
