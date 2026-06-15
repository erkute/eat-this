import { describe, it, expect } from 'vitest'
import { getOpenStatus, buildOpeningHoursSpec } from './openingHours'
import type { OpeningHourSlot } from '../types'

describe('buildOpeningHoursSpec', () => {
  it('expands a day range into schema.org day names with HH:MM times', () => {
    const spec = buildOpeningHoursSpec([{ days: 'Mo–Fr', hours: '12:00–22:00' }])
    expect(spec).toEqual([
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '12:00',
        closes: '22:00',
      },
    ])
  })

  it('keeps opens > closes for overnight slots', () => {
    const spec = buildOpeningHoursSpec([{ days: 'Sa', hours: '18:00–02:00' }])
    expect(spec[0]).toMatchObject({ dayOfWeek: ['Saturday'], opens: '18:00', closes: '02:00' })
  })

  it('drops closed / unparseable slots', () => {
    const spec = buildOpeningHoursSpec([
      { days: 'Mo', hours: '12:00–22:00' },
      { days: 'Di', hours: 'Ruhetag' },
      { days: 'Mi', hours: 'geschlossen' },
    ])
    expect(spec.map(s => s.dayOfWeek[0])).toEqual(['Monday'])
  })

  it('returns an empty array when nothing is parseable', () => {
    expect(buildOpeningHoursSpec([{ days: 'Mo', hours: 'closed' }])).toEqual([])
  })

  it('maps common 24-hour labels to a full-day specification', () => {
    expect(buildOpeningHoursSpec([{ days: 'Mon-Sun', hours: '24Stundengeöffnet' }])).toEqual([
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        opens: '00:00',
        closes: '24:00',
      },
    ])
  })
})

// Monday 14:00 — within Mo–Fr 12:00–22:00
const MON_2PM  = new Date('2026-04-20T14:00:00')
// Monday 11:00 — before opening
const MON_11AM = new Date('2026-04-20T11:00:00')
// Monday 23:00 — after closing
const MON_11PM = new Date('2026-04-20T23:00:00')
// Sunday — no slot
const SUNDAY   = new Date('2026-04-19T14:00:00')

const weekdaySlot: OpeningHourSlot[] = [
  { days: 'Mo–Fr', hours: '12:00–22:00' },
]

describe('getOpenStatus', () => {
  it('treats 24-hour labels as open throughout the day', () => {
    const hours: OpeningHourSlot[] = [{ days: 'Mon-Sun', hours: '24/7' }]
    expect(getOpenStatus(hours, new Date('2026-06-14T23:59:00'))).toMatchObject({
      isOpen: true,
      label: 'Open · Closes 24:00',
      minutesUntilChange: 1,
    })
  })

  it('returns open when within hours', () => {
    const { isOpen, label } = getOpenStatus(weekdaySlot, MON_2PM)
    expect(isOpen).toBe(true)
    expect(label).toContain('22:00')
  })

  it('returns closed with opening time when before opening', () => {
    const { isOpen, label } = getOpenStatus(weekdaySlot, MON_11AM)
    expect(isOpen).toBe(false)
    expect(label).toContain('12:00')
  })

  it('returns closed when after closing', () => {
    const { isOpen } = getOpenStatus(weekdaySlot, MON_11PM)
    expect(isOpen).toBe(false)
  })

  it('returns closed on Sunday when only Mo–Fr slot exists', () => {
    const { isOpen } = getOpenStatus(weekdaySlot, SUNDAY)
    expect(isOpen).toBe(false)
  })

  it('handles explicit closed-day marker', () => {
    const slots: OpeningHourSlot[] = [{ days: 'Mo', hours: 'closed' }]
    const { isOpen, label } = getOpenStatus(slots, MON_2PM)
    expect(isOpen).toBe(false)
    expect(label.toLowerCase()).toContain('closed')
  })
})
