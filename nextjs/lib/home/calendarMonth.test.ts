import { describe, expect, it } from 'vitest';
import { calendarMonth, sketchGrid } from './calendarMonth';

describe('calendarMonth', () => {
  it('starts the week on Monday', () => {
    // 1 October 2026 is a Thursday: Monday to Wednesday stay empty.
    expect(calendarMonth('2026-10-01')).toEqual({
      year: 2026,
      month: 9,
      leading: 3,
      days: 31,
      today: 1,
      rows: 5,
    });
  });

  it('leaves no empty cell when the 1st is a Monday', () => {
    expect(calendarMonth('2026-06-15').leading).toBe(0);
  });

  it('counts February and the sixth row', () => {
    expect(calendarMonth('2028-02-29').days).toBe(29);
    // 1 August 2026 is a Saturday: 5 empty cells + 31 days = 6 rows.
    expect(calendarMonth('2026-08-20').rows).toBe(6);
  });
});

describe('sketchGrid', () => {
  it('draws the same lines for the same month on server and client', () => {
    const month = calendarMonth('2026-10-01');
    expect(sketchGrid(month)).toBe(sketchGrid(calendarMonth('2026-10-31')));
    expect(sketchGrid(month)).not.toBe(sketchGrid(calendarMonth('2026-11-01')));
  });

  it('draws every row and column line once', () => {
    const month = calendarMonth('2026-10-01');
    expect(sketchGrid(month).match(/M/g)).toHaveLength(month.rows + 1 + 8);
  });
});
