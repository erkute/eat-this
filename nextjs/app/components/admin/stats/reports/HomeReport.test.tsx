// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { summarize } from '@/lib/admin/stats.server';
import { summarizeHome } from '@/lib/analytics/homeHeat';
vi.mock('@/lib/firebase/config', () => ({
  auth: { currentUser: { getIdToken: async () => 'test' } },
}));
vi.mock('../HeatPreview', () => ({ default: () => <div>Heat preview</div> }));
import HomeReport from './HomeReport';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('refreshes detail data in the same date range while preserving the selected device', async () => {
  const data = summarize([], [], {
    today: '2026-11-03',
    range: { start: '2026-11-03', end: '2026-11-03' },
  });
  const home = (desktop: number) =>
    summarizeHome([{ day: '2026-11-03', views: { phone: 23, desktop } }]);
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ home: home(2) }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ home: home(4) }) });
  vi.stubGlobal('fetch', fetchMock);
  const { rerender } = render(<HomeReport data={data} refreshKey={1} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Desktop · 2' }));
  rerender(<HomeReport data={data} refreshKey={2} />);
  const desktop = await screen.findByRole('button', { name: 'Desktop · 4' });
  expect(desktop.getAttribute('aria-pressed')).toBe('true');
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock).toHaveBeenLastCalledWith(
    '/api/admin/stats?only=home&from=2026-11-03&to=2026-11-03',
    expect.anything()
  );
});
