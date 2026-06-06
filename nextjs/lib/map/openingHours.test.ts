import { describe, it, expect } from 'vitest'
import { getOpenStatus } from './openingHours'
import type { OpeningHourSlot } from '../types'

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
