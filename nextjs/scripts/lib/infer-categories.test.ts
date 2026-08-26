import { describe, it, expect } from 'vitest';
import { openAtMinute, type DaySlot } from '../import-from-url';

const slot = (days: string, hours: string): DaySlot => ({
  _key: 'k',
  _type: 'daySlot',
  days,
  hours,
});
const LUNCH = 12 * 60 + 30;
const DINNER = 19 * 60 + 30;

describe('openAtMinute', () => {
  it('covers a plain span', () => {
    const s = [slot('Mon-Sun', '12:00-22:00')];
    expect(openAtMinute(s, LUNCH)).toBe(true);
    expect(openAtMinute(s, DINNER)).toBe(true);
  });

  it('reads every shift of a split day, not just the first', () => {
    // Tian Fu: closed between 15:00 and 17:30 — open for both meals.
    const s = [slot('Tue-Fri', '12:00-15:00,17:30-22:30')];
    expect(openAtMinute(s, LUNCH)).toBe(true);
    expect(openAtMinute(s, DINNER)).toBe(true);
  });

  it('handles a closing time after midnight', () => {
    // Midye 47: 11:00-04:00.
    expect(openAtMinute([slot('Mon-Sun', '11:00-04:00')], DINNER)).toBe(true);
  });

  it('rejects an evening-only spot for lunch', () => {
    // Kimchi Princess: opens at 17:00.
    const s = [slot('Tue-Fri', '17:00-23:00')];
    expect(openAtMinute(s, LUNCH)).toBe(false);
    expect(openAtMinute(s, DINNER)).toBe(true);
  });

  it('rejects a daytime-only spot for dinner', () => {
    // Mezedesk: 12:00-18:00.
    const s = [slot('Mon-Sat', '12:00-18:00')];
    expect(openAtMinute(s, LUNCH)).toBe(true);
    expect(openAtMinute(s, DINNER)).toBe(false);
  });

  it('counts a spot open on any day, not only every day', () => {
    // Van Loon: weekdays from 16:00, weekends from 10:00.
    const s = [slot('Mon-Fri', '16:00-22:00'), slot('Sat-Sun', '10:00-22:00')];
    expect(openAtMinute(s, LUNCH)).toBe(true);
  });

  it('ignores unparseable and closed entries instead of throwing', () => {
    expect(openAtMinute([slot('Mon', 'closed'), slot('Tue', 'Geschlossen')], LUNCH)).toBe(false);
    expect(openAtMinute([], LUNCH)).toBe(false);
  });
});
