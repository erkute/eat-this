import type { OpeningHourSlot, OpenStatus } from '../types'

type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6

const DAY_MAP: Record<string, DayIndex> = {
  su: 0, sun: 0, sunday: 0, so: 0,
  mo: 1, mon: 1, monday: 1,
  tu: 2, tue: 2, tuesday: 2, di: 2,
  we: 3, wed: 3, wednesday: 3, mi: 3,
  th: 4, thu: 4, thursday: 4, do: 4,
  fr: 5, fri: 5, friday: 5,
  sa: 6, sat: 6, saturday: 6,
}

function parseDays(str: string): DayIndex[] {
  if (/daily|täglich/i.test(str)) return [0, 1, 2, 3, 4, 5, 6]
  const result: DayIndex[] = []
  for (const group of str.split(',')) {
    const parts = group.trim().split(/[–\-]/).map(s => s.trim().toLowerCase())
    if (parts.length === 2) {
      const start = DAY_MAP[parts[0]]
      const end   = DAY_MAP[parts[1]]
      if (start !== undefined && end !== undefined) {
        if (start <= end) {
          for (let d = start; d <= end; d++) result.push(d as DayIndex)
        } else {
          for (let d = start; d <= 6; d++) result.push(d as DayIndex)
          for (let d = 0;     d <= end; d++) result.push(d as DayIndex)
        }
      }
    } else {
      const d = DAY_MAP[parts[0]]
      if (d !== undefined) result.push(d)
    }
  }
  return result
}

function parseTimeRange(str: string): { open: number; close: number } | null {
  if (/closed|ruhetag|geschlossen/i.test(str)) return null
  const compact = str.toLowerCase().replace(/\s/g, '')
  if (/24(?:stunden?)?(?:geöffnet|offen)|24\/7/.test(compact)) {
    return { open: 0, close: 24 * 60 }
  }
  const m = str.match(/(\d{1,2}):(\d{2})[–\-](\d{1,2}):(\d{2})/)
  if (!m) return null
  return {
    open:  parseInt(m[1]) * 60 + parseInt(m[2]),
    close: parseInt(m[3]) * 60 + parseInt(m[4]),
  }
}

function fmt(totalMins: number): string {
  return `${String(Math.floor(totalMins / 60)).padStart(2, '0')}:${String(totalMins % 60).padStart(2, '0')}`
}

interface OpenStatusLabels {
  open?: string
  closed?: string
  opens?: string
  closes?: string
  unitH?: string
  unitMin?: string
}

// schema.org dayOfWeek names, indexed to match DayIndex (0 = Sunday).
const SCHEMA_DAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
] as const

export interface OpeningHoursSpecification {
  '@type': 'OpeningHoursSpecification'
  dayOfWeek: string[]
  opens: string
  closes: string
}

/**
 * Maps the free-text opening-hours slots into schema.org
 * OpeningHoursSpecification entries for the Restaurant JSON-LD — reusing the
 * same `parseDays` / `parseTimeRange` the live "open now" badge relies on, so
 * the structured data can never drift from what the site shows. Unparseable or
 * closed slots (no time range) are dropped; an empty result means "emit no
 * openingHoursSpecification at all" rather than a misleading partial one.
 * Overnight slots keep opens > closes, which schema.org permits.
 */
export function buildOpeningHoursSpec(openingHours: OpeningHourSlot[]): OpeningHoursSpecification[] {
  const specs: OpeningHoursSpecification[] = []
  for (const slot of openingHours) {
    const days = parseDays(slot.days)
    const range = parseTimeRange(slot.hours)
    if (days.length === 0 || !range) continue
    specs.push({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: days.map(d => SCHEMA_DAYS[d]),
      opens: fmt(range.open),
      closes: fmt(range.close),
    })
  }
  return specs
}

export function getOpenStatus(
  openingHours: OpeningHourSlot[],
  now: Date = new Date(),
  l: OpenStatusLabels = {}
): OpenStatus {
  const L = {
    open:   l.open   ?? 'Open',
    closed: l.closed ?? 'Closed',
    opens:  l.opens  ?? 'Opens',
    closes: l.closes ?? 'Closes',
    unitH:   l.unitH   ?? 'h',
    unitMin: l.unitMin ?? 'min',
  }
  const today      = now.getDay() as DayIndex
  const yesterday  = ((today + 6) % 7) as DayIndex
  const currentMin = now.getHours() * 60 + now.getMinutes()

  // 1. Currently open?
  // For overnight slots (close <= open, e.g. 11:00–01:00), the slot covers
  // [open, 24:00) on day X and [00:00, close) on day X+1. Check both halves.
  for (const slot of openingHours) {
    const days = parseDays(slot.days)
    const range = parseTimeRange(slot.hours)
    if (!range) continue
    const isOvernight = range.close <= range.open

    if (!isOvernight) {
      if (days.includes(today) && currentMin >= range.open && currentMin < range.close) {
        const left = range.close - currentMin
        return {
          isOpen: true,
          label: `${L.open} · ${L.closes} ${fmt(range.close)}`,
          minutesUntilChange: left,
        }
      }
    } else {
      // Late-evening half: started today, runs past midnight.
      if (days.includes(today) && currentMin >= range.open) {
        const left = (24 * 60 - currentMin) + range.close
        return {
          isOpen: true,
          label: `${L.open} · ${L.closes} ${fmt(range.close)}`,
          minutesUntilChange: left,
        }
      }
      // Early-morning half: opened yesterday, still running today.
      if (days.includes(yesterday) && currentMin < range.close) {
        const left = range.close - currentMin
        return {
          isOpen: true,
          label: `${L.open} · ${L.closes} ${fmt(range.close)}`,
          minutesUntilChange: left,
        }
      }
    }
  }

  // 2. Scan next 7 days (including later today) for the next opening slot.
  let next: { dayOffset: number; openMin: number } | null = null
  for (let offset = 0; offset < 7 && !next; offset++) {
    const day = ((today + offset) % 7) as DayIndex
    for (const slot of openingHours) {
      if (!parseDays(slot.days).includes(day)) continue
      const range = parseTimeRange(slot.hours)
      if (!range) continue
      if (offset === 0 && range.open <= currentMin) continue
      if (!next || range.open < next.openMin) {
        next = { dayOffset: offset, openMin: range.open }
      }
    }
  }

  if (!next) {
    return { isOpen: false, label: L.closed, minutesUntilChange: null }
  }

  const minutesUntil = next.dayOffset * 24 * 60 + next.openMin - currentMin

  return {
    isOpen: false,
    label: `${L.closed} · ${L.opens} ${fmt(next.openMin)}`,
    minutesUntilChange: minutesUntil,
  }
}
