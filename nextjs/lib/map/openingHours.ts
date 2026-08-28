import type { OpeningHourSlot, OpenStatus } from '../types';

type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

const DAY_MAP: Record<string, DayIndex> = {
  su: 0,
  sun: 0,
  sunday: 0,
  so: 0,
  mo: 1,
  mon: 1,
  monday: 1,
  tu: 2,
  tue: 2,
  tuesday: 2,
  di: 2,
  we: 3,
  wed: 3,
  wednesday: 3,
  mi: 3,
  th: 4,
  thu: 4,
  thursday: 4,
  do: 4,
  fr: 5,
  fri: 5,
  friday: 5,
  sa: 6,
  sat: 6,
  saturday: 6,
};

// Indexed to match DayIndex (0 = Sunday).
const DAY_LABELS = {
  de: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
} as const;

/**
 * `days` is free text an editor typed into Sanity ("Mon-Thu", "Mo–So",
 * "Wed,Thu,Sun "), so the German page was showing English abbreviations.
 * Tokens that map to a weekday get the locale's label; anything unrecognised
 * is passed through untouched rather than dropped.
 */
export function localizeOpeningDays(days: string | undefined, locale: string): string {
  const lang = locale === 'en' ? 'en' : 'de';
  const labels = DAY_LABELS[lang];
  const raw = (days ?? '').trim();
  if (!raw) return '';
  if (/^(daily|täglich)$/i.test(raw)) return lang === 'en' ? 'Daily' : 'Täglich';
  return raw
    .split(',')
    .map((group) =>
      group
        .trim()
        .split(/\s*[–-]\s*/)
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const idx = DAY_MAP[part.toLowerCase()];
          return idx === undefined ? part : labels[idx];
        })
        .join('–')
    )
    .filter(Boolean)
    .join(', ');
}

/**
 * A slot that names a rest day rather than a time range. Editors type this in
 * either language, hence the three spellings.
 */
export function isClosedSlot(hours: string | undefined): boolean {
  return /closed|ruhetag|geschlossen/i.test(hours ?? '');
}

/** Same treatment for the time column: "closed" and the run-together "24Stundengeöffnet". */
export function localizeOpeningHours(hours: string | undefined, locale: string): string {
  const lang = locale === 'en' ? 'en' : 'de';
  const raw = (hours ?? '').trim();
  if (!raw) return '';
  if (isClosedSlot(raw)) return lang === 'en' ? 'closed' : 'geschlossen';
  if (
    /^24\s*(stunden?|hours?|h)?\s*(geöffnet|offen|open)?$|^24\/7$/i.test(raw.replace(/\s+/g, ' '))
  ) {
    return lang === 'en' ? 'Open 24 hours' : '24 Stunden geöffnet';
  }
  // Split shifts arrive unspaced ("12:00-14:30,15:30-21:00") and run together
  // at the size this column is set in.
  return raw.replace(/,\s*/g, ', ');
}

function parseDays(str: string): DayIndex[] {
  if (/daily|täglich/i.test(str)) return [0, 1, 2, 3, 4, 5, 6];
  const result: DayIndex[] = [];
  for (const group of str.split(',')) {
    const parts = group
      .trim()
      .split(/[–\-]/)
      .map((s) => s.trim().toLowerCase());
    if (parts.length === 2) {
      const start = DAY_MAP[parts[0]];
      const end = DAY_MAP[parts[1]];
      if (start !== undefined && end !== undefined) {
        if (start <= end) {
          for (let d = start; d <= end; d++) result.push(d as DayIndex);
        } else {
          for (let d = start; d <= 6; d++) result.push(d as DayIndex);
          for (let d = 0; d <= end; d++) result.push(d as DayIndex);
        }
      }
    } else {
      const d = DAY_MAP[parts[0]];
      if (d !== undefined) result.push(d);
    }
  }
  return result;
}

/**
 * All time ranges in one slot. Editors type split shifts as a single string
 * ("12:00-15:00,18:00-23:00"), so reading only the first match dropped the
 * evening service — the badge said "closed" at dinner time and the JSON-LD
 * reported lunch hours only. Returns [] for rest days and unparseable text.
 */
function parseTimeRanges(str: string): { open: number; close: number }[] {
  if (isClosedSlot(str)) return [];
  const compact = str.toLowerCase().replace(/\s/g, '');
  if (/24(?:stunden?)?(?:geöffnet|offen)|24\/7/.test(compact)) {
    return [{ open: 0, close: 24 * 60 }];
  }
  return [...str.matchAll(/(\d{1,2}):(\d{2})[–\-](\d{1,2}):(\d{2})/g)].map((m) => ({
    open: parseInt(m[1]) * 60 + parseInt(m[2]),
    close: parseInt(m[3]) * 60 + parseInt(m[4]),
  }));
}

function fmt(totalMins: number): string {
  return `${String(Math.floor(totalMins / 60)).padStart(2, '0')}:${String(totalMins % 60).padStart(2, '0')}`;
}

interface OpenStatusLabels {
  open?: string;
  closed?: string;
  opens?: string;
  closes?: string;
  unitH?: string;
  unitMin?: string;
}

// schema.org dayOfWeek names, indexed to match DayIndex (0 = Sunday).
const SCHEMA_DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

interface OpeningHoursSpecification {
  '@type': 'OpeningHoursSpecification';
  dayOfWeek: string[];
  opens: string;
  closes: string;
}

/**
 * Maps the free-text opening-hours slots into schema.org
 * OpeningHoursSpecification entries for the Restaurant JSON-LD — reusing the
 * same `parseDays` / `parseTimeRanges` the live "open now" badge relies on, so
 * the structured data can never drift from what the site shows. Unparseable or
 * closed slots (no time range) are dropped; an empty result means "emit no
 * openingHoursSpecification at all" rather than a misleading partial one.
 * Overnight slots keep opens > closes, which schema.org permits.
 */
export function buildOpeningHoursSpec(
  openingHours: OpeningHourSlot[]
): OpeningHoursSpecification[] {
  const specs: OpeningHoursSpecification[] = [];
  for (const slot of openingHours) {
    const days = parseDays(slot.days);
    if (days.length === 0) continue;
    for (const range of parseTimeRanges(slot.hours)) {
      specs.push({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: days.map((d) => SCHEMA_DAYS[d]),
        opens: fmt(range.open),
        closes: fmt(range.close),
      });
    }
  }
  return specs;
}

/**
 * Eine Date, deren lokale Zugriffe (getDay/getHours/…) die Berliner Wanduhr
 * zeigen — unabhängig davon, in welcher Zone der Prozess oder das Gerät läuft.
 * Der Server rechnet in UTC, Besucher sitzen irgendwo; der Zustand eines
 * Berliner Ladens folgt aber der Uhr an seiner Tür.
 *
 * Wohnt hier, weil `getOpenStatus` der einzige Konsument ist und beide Aufrufer
 * — die serverseitige Remy-Retrieval und der Zustands-Chip auf der Spot-Seite —
 * sonst je eine eigene Kopie hielten, die auseinanderlaufen kann, ohne dass ein
 * Test es merkt.
 */
export function berlinNow(base: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(base);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return new Date(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'));
}

export function getOpenStatus(
  openingHours: OpeningHourSlot[],
  now: Date = new Date(),
  l: OpenStatusLabels = {}
): OpenStatus {
  const L = {
    open: l.open ?? 'Open',
    closed: l.closed ?? 'Closed',
    opens: l.opens ?? 'Opens',
    closes: l.closes ?? 'Closes',
    unitH: l.unitH ?? 'h',
    unitMin: l.unitMin ?? 'min',
  };
  const today = now.getDay() as DayIndex;
  const yesterday = ((today + 6) % 7) as DayIndex;
  const currentMin = now.getHours() * 60 + now.getMinutes();

  // 1. Currently open?
  // For overnight slots (close <= open, e.g. 11:00–01:00), the slot covers
  // [open, 24:00) on day X and [00:00, close) on day X+1. Check both halves.
  for (const slot of openingHours) {
    const days = parseDays(slot.days);
    for (const range of parseTimeRanges(slot.hours)) {
      const isOvernight = range.close <= range.open;

      if (!isOvernight) {
        if (days.includes(today) && currentMin >= range.open && currentMin < range.close) {
          const left = range.close - currentMin;
          return {
            isOpen: true,
            label: `${L.open} · ${L.closes} ${fmt(range.close)}`,
            minutesUntilChange: left,
          };
        }
      } else {
        // Late-evening half: started today, runs past midnight.
        if (days.includes(today) && currentMin >= range.open) {
          const left = 24 * 60 - currentMin + range.close;
          return {
            isOpen: true,
            label: `${L.open} · ${L.closes} ${fmt(range.close)}`,
            minutesUntilChange: left,
          };
        }
        // Early-morning half: opened yesterday, still running today.
        if (days.includes(yesterday) && currentMin < range.close) {
          const left = range.close - currentMin;
          return {
            isOpen: true,
            label: `${L.open} · ${L.closes} ${fmt(range.close)}`,
            minutesUntilChange: left,
          };
        }
      }
    }
  }

  // 2. Scan next 7 days (including later today) for the next opening slot.
  let next: { dayOffset: number; openMin: number } | null = null;
  for (let offset = 0; offset < 7 && !next; offset++) {
    const day = ((today + offset) % 7) as DayIndex;
    for (const slot of openingHours) {
      if (!parseDays(slot.days).includes(day)) continue;
      for (const range of parseTimeRanges(slot.hours)) {
        if (offset === 0 && range.open <= currentMin) continue;
        if (!next || range.open < next.openMin) {
          next = { dayOffset: offset, openMin: range.open };
        }
      }
    }
  }

  if (!next) {
    return { isOpen: false, label: L.closed, minutesUntilChange: null };
  }

  const minutesUntil = next.dayOffset * 24 * 60 + next.openMin - currentMin;

  return {
    isOpen: false,
    label: `${L.closed} · ${L.opens} ${fmt(next.openMin)}`,
    minutesUntilChange: minutesUntil,
  };
}
