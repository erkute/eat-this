/** The month page behind „Spot des Tages": which weekday the 1st falls on
 *  (weeks start on Monday, as in Berlin), how many days, which one is today.
 *  Read in UTC like the pick itself, so no zone can move the day. */
export interface CalendarMonth {
  year: number;
  /** 0–11 */
  month: number;
  /** Empty cells before the 1st (0 = the month starts on a Monday). */
  leading: number;
  days: number;
  today: number;
  rows: number;
}

export function calendarMonth(today: string): CalendarMonth {
  const [year, month, day] = today.split('-').map(Number);
  const leading = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    year,
    month: month - 1,
    leading,
    days,
    today: day,
    rows: Math.ceil((leading + days) / 7),
  };
}

/** Units per cell in the grid drawing's viewBox. */
export const CELL = 100;

/**
 * The grid as one hand-drawn path, like a calendar ruled with a felt pen:
 * every line slightly bowed, a little off at its ends and running past the
 * crossings. Seeded by the month, so server and client draw the same lines
 * and a month keeps its lines all month. When two or more cells lead the
 * month they stay one open field (the notes field) — no lines between them.
 */
export function sketchGrid({ year, month, leading, rows }: CalendarMonth): string {
  let seed = year * 12 + month + 1;
  // mulberry32: small, fast, deterministic.
  const random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const jitter = (amount: number) => (random() * 2 - 1) * amount;
  const round = (n: number) => Math.round(n * 10) / 10;
  const line = (x1: number, y1: number, x2: number, y2: number) => {
    const horizontal = y1 === y2;
    // Past the crossing at either end, by a different amount each time.
    const over1 = 2 + random() * 4;
    const over2 = 2 + random() * 4;
    const a = horizontal ? [x1 - over1, y1 + jitter(2)] : [x1 + jitter(2), y1 - over1];
    const b = horizontal ? [x2 + over2, y2 + jitter(2)] : [x2 + jitter(2), y2 + over2];
    const bow = jitter(3);
    const c = horizontal
      ? [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + bow]
      : [(a[0] + b[0]) / 2 + bow, (a[1] + b[1]) / 2];
    return `M${round(a[0])} ${round(a[1])}Q${round(c[0])} ${round(c[1])} ${round(b[0])} ${round(b[1])}`;
  };
  const width = 7 * CELL;
  const height = rows * CELL;
  const paths: string[] = [];
  for (let r = 0; r <= rows; r++) paths.push(line(0, r * CELL, width, r * CELL));
  for (let c = 0; c <= 7; c++) {
    const insideNotes = leading >= 2 && c > 0 && c < leading;
    paths.push(line(c * CELL, insideNotes ? CELL : 0, c * CELL, height));
  }
  return paths.join('');
}
