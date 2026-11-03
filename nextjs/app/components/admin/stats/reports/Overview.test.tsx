// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { summarize } from '@/lib/admin/stats.server';
import Overview from './Overview';
afterEach(cleanup);
it('shows a day comparison instead of a one-point trend for today', () => {
  const data = summarize(
    [{ day: '2026-11-03', visitors: 206, pageviews: 384 }],
    [{ day: '2026-11-02', visitors: 204, pageviews: 452 }],
    { today: '2026-11-03', range: { start: '2026-11-03', end: '2026-11-03' } }
  );
  render(<Overview data={data} onOpen={() => {}} />);
  expect(screen.queryByRole('heading', { name: 'Wie entwickeln sich die Besuche?' })).toBeNull();
  expect(screen.getByRole('heading', { name: 'Tagesvergleich' })).toBeTruthy();
  expect(screen.getByText(/Kein Stundenverlauf/)).toBeTruthy();
});
