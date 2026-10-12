// Öffnungszeiten als Woche statt als Freitext. Gespeichert wird weiter das
// alte Format ({days: "Mon–Fri", hours: "12:00–22:00"}), das die Website in
// nextjs/lib/map/openingHours.ts liest; die Wochenansicht im Studio liest und
// schreibt es nur bequemer.

export type TimeRange = {open: string; close: string}
/** Ein Tag: zu, oder offen mit Zeiten. Offen ohne vollständige Zeit = keine Angabe. */
export type DayHours = {closed: boolean; ranges: TimeRange[]}
export type Week = DayHours[]
export type DaySlot = {_type: 'daySlot'; _key: string; days: string; hours: string}

/** Montag zuerst, wie man in Deutschland die Woche liest. */
export const WEEKDAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']
const STORED_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const DAY_TOKENS: Record<string, number> = {
  mon: 0, mo: 0, monday: 0, montag: 0,
  tue: 1, tu: 1, di: 1, tuesday: 1, dienstag: 1,
  wed: 2, we: 2, mi: 2, wednesday: 2, mittwoch: 2,
  thu: 3, th: 3, do: 3, thursday: 3, donnerstag: 3,
  fri: 4, fr: 4, friday: 4, freitag: 4,
  sat: 5, sa: 5, saturday: 5, samstag: 5,
  sun: 6, su: 6, so: 6, sunday: 6, sonntag: 6,
}

const CLOSED = /closed|ruhetag|geschlossen/i
const RANGE = /(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/g

export function emptyWeek(): Week {
  return WEEKDAYS.map(() => ({closed: false, ranges: [{open: '', close: ''}]}))
}

function parseDays(raw: string): number[] | null {
  const text = raw.trim()
  if (/^(daily|täglich)$/i.test(text)) return [0, 1, 2, 3, 4, 5, 6]
  const days: number[] = []
  for (const group of text.split(',')) {
    const parts = group.split(/\s*[–-]\s*/).map((part) => DAY_TOKENS[part.trim().toLowerCase()])
    if (parts.some((day) => day === undefined)) return null
    if (parts.length === 1) {
      days.push(parts[0])
    } else if (parts.length === 2) {
      // „Sun–Wed“ läuft über das Wochenende hinweg.
      for (let day = parts[0]; ; day = (day + 1) % 7) {
        days.push(day)
        if (day === parts[1]) break
      }
    } else {
      return null
    }
  }
  return days.length ? days : null
}

const pad = (n: string) => n.padStart(2, '0')

function parseHours(raw: string): DayHours | null {
  const text = raw.trim()
  if (CLOSED.test(text)) return {closed: true, ranges: []}
  const ranges: TimeRange[] = []
  for (const m of text.matchAll(RANGE)) {
    if (Number(m[1]) > 23 || Number(m[3]) > 23) return null
    ranges.push({open: `${pad(m[1])}:${m[2]}`, close: `${pad(m[3])}:${m[4]}`})
  }
  // Bleibt neben den Zeiten noch Text übrig („24Stundengeöffnet“), lieber
  // nichts raten — dann bleibt die Liste.
  const rest = text.replace(RANGE, '').replace(/[\s,;/]|und|and/gi, '')
  if (!ranges.length || rest) return null
  return {closed: false, ranges}
}

const hoursKey = (day: DayHours): string | null => {
  if (day.closed) return 'closed'
  const complete = day.ranges.filter((range) => range.open && range.close)
  return complete.length ? complete.map((range) => `${range.open}–${range.close}`).join(', ') : null
}

/**
 * Liest gespeicherte Zeilen in eine Woche. `null`, wenn etwas nicht sicher
 * lesbar ist — dann zeigt das Studio die alte Liste, statt Zeiten zu verfälschen.
 */
export function parseWeek(slots: {days?: string; hours?: string}[] | undefined): Week | null {
  const week = emptyWeek()
  const seen = new Set<number>()
  for (const slot of slots ?? []) {
    const days = parseDays(slot.days ?? '')
    const hours = parseHours(slot.hours ?? '')
    if (!days || !hours) return null
    for (const day of days) {
      if (!seen.has(day)) {
        seen.add(day)
        week[day] = {closed: hours.closed, ranges: hours.closed ? [{open: '', close: ''}] : hours.ranges}
        continue
      }
      // Derselbe Tag in zwei Zeilen: Mittag und Abend getrennt eingetragen.
      // Zu und offen zugleich ist dagegen widersprüchlich.
      if (week[day].closed !== hours.closed) return null
      if (hours.closed) continue
      const merged = [...week[day].ranges, ...hours.ranges]
      week[day] = {
        closed: false,
        ranges: merged
          .filter((range, i) => merged.findIndex((r) => r.open === range.open && r.close === range.close) === i)
          .sort((a, b) => a.open.localeCompare(b.open)),
      }
    }
  }
  return week
}

/** Fasst gleiche Folgetage zusammen: Mo–Fr gleich, Sa anders → zwei Zeilen. */
export function serializeWeek(week: Week): DaySlot[] {
  const slots: DaySlot[] = []
  let start = 0
  while (start < 7) {
    const key = hoursKey(week[start])
    let end = start
    while (end + 1 < 7 && key !== null && hoursKey(week[end + 1]) === key) end++
    if (key !== null) {
      slots.push({
        _type: 'daySlot',
        _key: `d${start}${end}`,
        days: start === end ? STORED_DAYS[start] : `${STORED_DAYS[start]}–${STORED_DAYS[end]}`,
        hours: key,
      })
    }
    start = end + 1
  }
  return slots
}

/** Gleich, wenn Tage und Zeiten gleich sind — Schlüssel und Schreibweise egal. */
export function sameSlots(a: {days?: string; hours?: string}[] | undefined, b: DaySlot[]): boolean {
  const norm = (slots: {days?: string; hours?: string}[] | undefined) =>
    JSON.stringify((slots ?? []).map((slot) => [slot.days ?? '', slot.hours ?? '']))
  return norm(a) === norm(b)
}
