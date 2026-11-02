import { it, expect } from 'vitest';
import { keywordPeriods } from './searchConsole';
it('ordnet Suchbegriffe nach Tagen und Montag-beginnenden Wochen und gewichtet Positionen', () => {
  const rows = [
    { day: '2026-10-26', query: 'pizza berlin', clicks: 2, impressions: 10, position: 4 },
    { day: '2026-10-27', query: 'pizza berlin', clicks: 3, impressions: 30, position: 8 },
    { day: '2026-11-02', query: 'brunch', clicks: 7, impressions: 50, position: 5 },
  ];
  expect(keywordPeriods(rows, 'day')).toHaveLength(3);
  const weeks = keywordPeriods(rows, 'week');
  expect(weeks).toHaveLength(2);
  expect(weeks[1].start).toBe('2026-10-26');
  expect(weeks[1].queries[0]).toMatchObject({
    clicks: 5,
    impressions: 40,
    ctr: 0.125,
    position: 7,
  });
});
