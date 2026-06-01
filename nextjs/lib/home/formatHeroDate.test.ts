import { describe, it, expect } from 'vitest'
import { formatHeroDate } from './formatHeroDate'

describe('formatHeroDate', () => {
  it('formats a German short weekday + DD.MM', () => {
    // 2026-06-01 is a Monday
    expect(formatHeroDate('2026-06-01')).toBe('Mo · 01.06.')
  })
  it('pads single-digit day and month', () => {
    expect(formatHeroDate('2026-03-09')).toBe('Mo · 09.03.')
  })
  it('returns empty string for an invalid date', () => {
    expect(formatHeroDate('not-a-date')).toBe('')
  })
})
