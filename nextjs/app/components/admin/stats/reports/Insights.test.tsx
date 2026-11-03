// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { summarize } from '@/lib/admin/stats.server';
vi.mock('@/lib/firebase/config', () => ({
  auth: { currentUser: { getIdToken: async () => 'test' } },
}));
vi.mock('../HeatPreview', () => ({ default: () => <div>Heat preview</div> }));
import Insights from './Insights';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('ranks pages by traffic and opens the device with actual detail measurements', () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify({ heat: { heat: {}, targets: {} } })))
  );
  const data = summarize(
    [
      {
        day: '2026-11-02',
        visitors: 15,
        pageviews: 55,
        paths: { '/news/klein': 5, '/news/gross': 50 },
      },
    ],
    [],
    {
      today: '2026-11-03',
      range: { start: '2026-11-02', end: '2026-11-02' },
      insights: [
        {
          day: '2026-11-02',
          pages: {
            '/news/gross': { surface: 'article', devices: { desktop: { view: 20 } } },
            '/news/klein': { surface: 'article', devices: { phone: { view: 3 } } },
          },
        },
      ],
    }
  );
  render(<Insights data={data} />);
  const list = screen.getByRole('list', { name: 'Seiten nach Aufrufen' });
  expect(within(list).getAllByRole('listitem')[0].textContent).toContain('/news/gross');
  expect(
    (screen.getByRole('combobox', { name: 'Nutzung: Seite' }) as HTMLSelectElement).value
  ).toBe('/news/gross');
  expect(
    (screen.getByRole('combobox', { name: 'Nutzung: Gerät' }) as HTMLSelectElement).value
  ).toBe('desktop');
  fireEvent.click(screen.getByRole('button', { name: 'Nutzung ansehen: /news/klein' }));
  expect(
    (screen.getByRole('combobox', { name: 'Nutzung: Seite' }) as HTMLSelectElement).value
  ).toBe('/news/klein');
  expect(
    (screen.getByRole('combobox', { name: 'Nutzung: Gerät' }) as HTMLSelectElement).value
  ).toBe('phone');
});
