import { describe, it, expect } from 'vitest';
import {
  localizeOpeningDays,
  localizeOpeningHours,
  getOpenStatus,
  buildOpeningHoursSpec,
  formatOpenStateChip,
  DAY_LABELS,
} from './openingHours';
import type { OpeningHourSlot } from '../types';

describe('buildOpeningHoursSpec', () => {
  it('expands a day range into schema.org day names with HH:MM times', () => {
    const spec = buildOpeningHoursSpec([{ days: 'Mo–Fr', hours: '12:00–22:00' }]);
    expect(spec).toEqual([
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '12:00',
        closes: '22:00',
      },
    ]);
  });

  it('keeps opens > closes for overnight slots', () => {
    const spec = buildOpeningHoursSpec([{ days: 'Sa', hours: '18:00–02:00' }]);
    expect(spec[0]).toMatchObject({ dayOfWeek: ['Saturday'], opens: '18:00', closes: '02:00' });
  });

  it('drops closed / unparseable slots', () => {
    const spec = buildOpeningHoursSpec([
      { days: 'Mo', hours: '12:00–22:00' },
      { days: 'Di', hours: 'Ruhetag' },
      { days: 'Mi', hours: 'geschlossen' },
    ]);
    expect(spec.map((s) => s.dayOfWeek[0])).toEqual(['Monday']);
  });

  it('returns an empty array when nothing is parseable', () => {
    expect(buildOpeningHoursSpec([{ days: 'Mo', hours: 'closed' }])).toEqual([]);
  });

  it('emits one entry per shift when a slot holds a split shift', () => {
    const spec = buildOpeningHoursSpec([{ days: 'Mo–Fr', hours: '12:00-15:00,18:00-23:00' }]);
    expect(spec).toHaveLength(2);
    expect(spec.map((s) => [s.opens, s.closes])).toEqual([
      ['12:00', '15:00'],
      ['18:00', '23:00'],
    ]);
    expect(spec[1].dayOfWeek).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
  });

  it('handles three shifts and a space after the comma', () => {
    const spec = buildOpeningHoursSpec([
      { days: 'Mon-Fri', hours: '06:30-10:30, 12:00-15:00, 17:00-23:00' },
    ]);
    expect(spec.map((s) => s.opens)).toEqual(['06:30', '12:00', '17:00']);
  });

  it('maps common 24-hour labels to a full-day specification', () => {
    expect(buildOpeningHoursSpec([{ days: 'Mon-Sun', hours: '24Stundengeöffnet' }])).toEqual([
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        opens: '00:00',
        closes: '24:00',
      },
    ]);
  });
});

// Monday 14:00 — within Mo–Fr 12:00–22:00
const MON_2PM = new Date('2026-04-20T14:00:00');
// Monday 11:00 — before opening
const MON_11AM = new Date('2026-04-20T11:00:00');
// Monday 23:00 — after closing
const MON_11PM = new Date('2026-04-20T23:00:00');
// Sunday — no slot
const SUNDAY = new Date('2026-04-19T14:00:00');

const weekdaySlot: OpeningHourSlot[] = [{ days: 'Mo–Fr', hours: '12:00–22:00' }];

describe('getOpenStatus', () => {
  it('treats 24-hour labels as open throughout the day', () => {
    const hours: OpeningHourSlot[] = [{ days: 'Mon-Sun', hours: '24/7' }];
    expect(getOpenStatus(hours, new Date('2026-06-14T23:59:00'))).toMatchObject({
      isOpen: true,
      label: 'Open · Closes 24:00',
      minutesUntilChange: 1,
    });
  });

  it('returns open when within hours', () => {
    const { isOpen, label } = getOpenStatus(weekdaySlot, MON_2PM);
    expect(isOpen).toBe(true);
    expect(label).toContain('22:00');
  });

  it('returns closed with opening time when before opening', () => {
    const { isOpen, label } = getOpenStatus(weekdaySlot, MON_11AM);
    expect(isOpen).toBe(false);
    expect(label).toContain('12:00');
  });

  it('returns closed when after closing', () => {
    const { isOpen } = getOpenStatus(weekdaySlot, MON_11PM);
    expect(isOpen).toBe(false);
  });

  it('returns closed on Sunday when only Mo–Fr slot exists', () => {
    const { isOpen } = getOpenStatus(weekdaySlot, SUNDAY);
    expect(isOpen).toBe(false);
  });

  it('handles explicit closed-day marker', () => {
    const slots: OpeningHourSlot[] = [{ days: 'Mo', hours: 'closed' }];
    const { isOpen, label } = getOpenStatus(slots, MON_2PM);
    expect(isOpen).toBe(false);
    expect(label.toLowerCase()).toContain('closed');
  });

  // Split shifts arrive as one string. Reading only the first range reported
  // "closed" through the entire evening service.
  it('is open during the evening half of a split shift', () => {
    const slots: OpeningHourSlot[] = [{ days: 'Mo–Fr', hours: '12:00-15:00,18:00-23:00' }];
    expect(getOpenStatus(slots, new Date('2026-04-13T20:00:00'))).toMatchObject({
      isOpen: true,
      label: 'Open · Closes 23:00',
    });
  });

  it('is closed in the gap between two shifts and names the later opening', () => {
    const slots: OpeningHourSlot[] = [{ days: 'Mo–Fr', hours: '12:00-15:00,18:00-23:00' }];
    const { isOpen, label } = getOpenStatus(slots, new Date('2026-04-13T16:30:00'));
    expect(isOpen).toBe(false);
    expect(label).toContain('18:00');
  });

  it('still reports the earlier shift before the day starts', () => {
    const slots: OpeningHourSlot[] = [{ days: 'Mo–Fr', hours: '12:00-15:00,18:00-23:00' }];
    expect(getOpenStatus(slots, MON_11AM).label).toContain('12:00');
  });

  // Eine nackte Uhrzeit hinter „Geschlossen" liest sich als „gleich geht's
  // los" — an einem Ruhetag war damit aber der nächste Öffnungstag gemeint.
  it('names the day when the next opening is not today', () => {
    expect(getOpenStatus(weekdaySlot, SUNDAY)).toMatchObject({
      isOpen: false,
      label: 'Closed · Opens Mon 12:00',
      changeAt: '12:00',
      nextOpenDay: 'Mon',
    });
  });

  it('leaves the day out when the shop still opens today', () => {
    expect(getOpenStatus(weekdaySlot, MON_11AM)).toMatchObject({
      label: 'Closed · Opens 12:00',
      nextOpenDay: null,
    });
  });

  it('names the day after the last shift of the day', () => {
    const { label } = getOpenStatus(weekdaySlot, MON_11PM);
    expect(label).toBe('Closed · Opens Tue 12:00');
  });

  it('counts the day forward across the week, not from a fixed day', () => {
    // Freitag nach Feierabend, Sa/So Ruhetag: der nächste Slot ist der Montag.
    const fridayLate = new Date('2026-04-24T22:30:00');
    expect(getOpenStatus(weekdaySlot, fridayLate)).toMatchObject({
      label: 'Closed · Opens Mon 12:00',
      nextOpenDay: 'Mon',
    });
  });

  it('takes the day names from the caller so German pages stay German', () => {
    const { label } = getOpenStatus(weekdaySlot, SUNDAY, {
      closed: 'Geschlossen',
      opens: 'Öffnet',
      days: DAY_LABELS.de,
    });
    expect(label).toBe('Geschlossen · Öffnet Mo 12:00');
  });

  it('says nothing but closed when no slot is parseable', () => {
    expect(getOpenStatus([{ days: 'Mo', hours: 'closed' }], MON_2PM)).toMatchObject({
      label: 'Closed',
      changeAt: null,
      nextOpenDay: null,
    });
  });
});

describe('formatOpenStateChip', () => {
  // Der gemeldete Fall: Samstagabend geschlossen, Chip sagte „Öffnet 12:00" —
  // gemeint war der Sonntag.
  const satClosed: OpeningHourSlot[] = [
    { days: 'Mon-Fri', hours: '12:00-22:00' },
    { days: 'Sat', hours: 'closed' },
    { days: 'Sun', hours: '12:00-20:00' },
  ];

  it('names the day when the next opening is not today', () => {
    const chip = formatOpenStateChip(satClosed, 'de', new Date('2026-08-29T19:00:00'));
    expect(chip).toEqual({ text: 'Geschlossen · Öffnet So 12:00', isOpen: false });
  });

  it('keeps the bare time when the shop opens later today', () => {
    const chip = formatOpenStateChip(satClosed, 'de', new Date('2026-08-30T09:00:00'));
    expect(chip).toEqual({ text: 'Geschlossen · Öffnet 12:00', isOpen: false });
  });

  it('translates the day for the English page', () => {
    const chip = formatOpenStateChip(satClosed, 'en', new Date('2026-08-29T19:00:00'));
    expect(chip).toEqual({ text: 'Closed · Opens Sun 12:00', isOpen: false });
  });

  it('still shows the closing time while open', () => {
    const chip = formatOpenStateChip(satClosed, 'de', new Date('2026-08-30T14:00:00'));
    expect(chip).toEqual({ text: 'Geöffnet bis 20:00', isOpen: true });
  });

  it('returns null without hours', () => {
    expect(formatOpenStateChip([], 'de')).toBeNull();
    expect(formatOpenStateChip(undefined, 'de')).toBeNull();
  });
});

describe('localizeOpeningDays', () => {
  it('translates the English abbreviations editors type into German', () => {
    expect(localizeOpeningDays('Mon-Thu', 'de')).toBe('Mo–Do');
    expect(localizeOpeningDays('Sun', 'de')).toBe('So');
    expect(localizeOpeningDays('Wed,Thu,Sun ', 'de')).toBe('Mi, Do, So');
  });

  it('normalises German input and stray whitespace for both locales', () => {
    expect(localizeOpeningDays('Mo–So', 'en')).toBe('Mon–Sun');
    expect(localizeOpeningDays('Mon - Sun', 'de')).toBe('Mo–So');
    expect(localizeOpeningDays('Mon–Fr ', 'de')).toBe('Mo–Fr');
  });

  it('passes unknown tokens through instead of dropping them', () => {
    expect(localizeOpeningDays('Feiertags', 'de')).toBe('Feiertags');
    expect(localizeOpeningDays('daily', 'de')).toBe('Täglich');
    expect(localizeOpeningDays(undefined, 'de')).toBe('');
  });
});

describe('localizeOpeningHours', () => {
  it('translates closed days', () => {
    expect(localizeOpeningHours('closed', 'de')).toBe('geschlossen');
    expect(localizeOpeningHours('Ruhetag', 'en')).toBe('closed');
  });

  it('unpacks the run-together 24h value', () => {
    expect(localizeOpeningHours('24Stundengeöffnet', 'de')).toBe('24 Stunden geöffnet');
    expect(localizeOpeningHours('24Stundengeöffnet', 'en')).toBe('Open 24 hours');
  });

  it('leaves real time ranges alone', () => {
    expect(localizeOpeningHours('12:00-23:00', 'de')).toBe('12:00-23:00');
  });

  it('spaces split shifts so they do not run together', () => {
    expect(localizeOpeningHours('12:00-14:30,15:30-21:00', 'de')).toBe('12:00-14:30, 15:30-21:00');
  });
});
