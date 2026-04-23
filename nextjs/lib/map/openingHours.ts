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

export function getOpenStatus(
  openingHours: OpeningHourSlot[],
  now: Date = new Date()
): OpenStatus {
  const today      = now.getDay() as DayIndex
  const currentMin = now.getHours() * 60 + now.getMinutes()

  for (const slot of openingHours) {
    if (!parseDays(slot.days).includes(today)) continue

    const range = parseTimeRange(slot.hours)
    if (!range) {
      return { isOpen: false, label: 'Closed today', minutesUntilChange: null }
    }

    if (currentMin >= range.open && currentMin < range.close) {
      const left = range.close - currentMin
      const h    = Math.floor(left / 60)
      return {
        isOpen: true,
        label:  h > 0
          ? `Open · Closes ${fmt(range.close)} (${h}h)`
          : `Open · Closes ${fmt(range.close)}`,
        minutesUntilChange: left,
      }
    }

    if (currentMin < range.open) {
      const until = range.open - currentMin
      const h     = Math.floor(until / 60)
      return {
        isOpen: false,
        label:  h > 0
          ? `Closed · Opens ${fmt(range.open)} (in ${h}h)`
          : `Closed · Opens ${fmt(range.open)}`,
        minutesUntilChange: until,
      }
    }
  }

  return { isOpen: false, label: 'Closed', minutesUntilChange: null }
}
