import { describe, it, expect } from 'vitest';
import { summarizeHours } from '@/lib/restaurant-prose';

describe('summarizeHours', () => {
  it('joins multiple slots with a comma and normalises the day range dash', () => {
    expect(
      summarizeHours([
        { days: 'Mo-Fr', hours: '11:00-15:00' },
        { days: 'Sa', hours: '11:00-22:00' },
      ])
    ).toBe('Mo–Fr 11:00-15:00, Sa 11:00-22:00');
  });

  // This string is the answer body of a FAQPage entry and ends up in the
  // JSON-LD, so an English slot on a German page misinforms Google too.
  it('localises the editor-typed English abbreviations', () => {
    const slots = [
      { days: 'Mon-Tue', hours: 'closed' },
      { days: 'Wed-Fri', hours: '17:00-21:00' },
    ];
    expect(summarizeHours(slots, 'de')).toBe('Mi–Fr 17:00-21:00, Mo–Di geschlossen');
    expect(summarizeHours(slots, 'en')).toBe('Wed–Fri 17:00-21:00, Mon–Tue closed');
  });

  // The caller leads with "Geöffnet", so a rest day listed first made the
  // sentence open by announcing when the place is shut.
  it('moves rest days to the end and gives them one shared "geschlossen"', () => {
    const slots = [
      { days: 'Mon-Tue', hours: 'closed' },
      { days: 'Wed-Sat', hours: '18:00-23:00' },
      { days: 'Sun', hours: 'closed' },
    ];
    expect(summarizeHours(slots, 'de')).toBe('Mi–Sa 18:00-23:00, Mo–Di und So geschlossen');
    expect(summarizeHours(slots, 'en')).toBe('Wed–Sat 18:00-23:00, Mon–Tue and Sun closed');
  });

  it('keeps a single rest day unjoined', () => {
    const slots = [
      { days: 'Mon', hours: 'closed' },
      { days: 'Tue', hours: '17:00-22:00' },
    ];
    expect(summarizeHours(slots, 'de')).toBe('Di 17:00-22:00, Mo geschlossen');
  });

  it('lists three or more rest days with commas and one conjunction', () => {
    const slots = [
      { days: 'Mon', hours: 'closed' },
      { days: 'Wed', hours: 'closed' },
      { days: 'Sun', hours: 'closed' },
      { days: 'Tue', hours: '17:00-22:00' },
    ];
    expect(summarizeHours(slots, 'de')).toBe('Di 17:00-22:00, Mo, Mi und So geschlossen');
  });

  it('returns null on empty input', () => {
    expect(summarizeHours(undefined)).toBeNull();
    expect(summarizeHours([])).toBeNull();
  });
});
