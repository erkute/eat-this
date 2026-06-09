// nextjs/lib/buddy/greeting.test.ts
import { describe, it, expect } from 'vitest'
import { daypartFor, greetingFor } from './greeting'

describe('daypartFor', () => {
  it('buckets the hour into dayparts', () => {
    expect(daypartFor(7)).toBe('morning')
    expect(daypartFor(12)).toBe('midday')
    expect(daypartFor(16)).toBe('afternoon')
    expect(daypartFor(20)).toBe('evening')
    expect(daypartFor(2)).toBe('late')
    expect(daypartFor(23)).toBe('late')
  })
  it('handles bucket boundaries', () => {
    expect(daypartFor(5)).toBe('morning')
    expect(daypartFor(11)).toBe('midday')
    expect(daypartFor(15)).toBe('afternoon')
    expect(daypartFor(18)).toBe('evening')
  })
})

describe('greetingFor', () => {
  it('returns a non-empty greeting and 4 suggestions per locale/time', () => {
    for (const hour of [8, 13, 16, 21, 1]) {
      for (const locale of ['de', 'en'] as const) {
        const { greeting, suggestions } = greetingFor(hour, locale)
        expect(greeting.length).toBeGreaterThan(0)
        expect(suggestions).toHaveLength(4)
      }
    }
  })
  it('changes copy by daypart', () => {
    expect(greetingFor(8, 'de').greeting).not.toBe(greetingFor(21, 'de').greeting)
  })
})
