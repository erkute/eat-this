// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { summarize } from '@/lib/admin/stats.server';
import Vitals from './Vitals';

afterEach(cleanup);

const range = { today: '2026-11-21', range: { start: '2026-11-21', end: '2026-11-21' } };

it('zeigt P75 je Seitentyp und Gerät mit der Bewertung als Wort', () => {
  const data = summarize([], [], {
    ...range,
    vitals: [
      {
        day: '2026-11-21',
        hist: {
          LCP: { spot: { phone: { '30': 30 } } },
          INP: { spot: { phone: { '60': 30 } } },
          CLS: { spot: { phone: { '2': 30 } } },
        },
      },
    ],
  });
  render(<Vitals data={data} />);
  const row = screen.getByRole('row', { name: /Spot · Telefon/ });
  expect(row.textContent).toContain('3,1 s');
  expect(row.textContent).toContain('mittel');
  expect(row.textContent).toContain('610 ms');
  expect(row.textContent).toContain('schlecht');
  expect(row.textContent).toContain('0,03');
  expect(row.textContent).toContain('gut');
  expect(row.textContent).not.toContain('wenige Messungen');
});

it('sagt, wenn es noch keine Messwerte gibt', () => {
  render(<Vitals data={summarize([], [], range)} />);
  expect(screen.getByText(/Noch keine Messwerte/)).toBeTruthy();
});
