// nextjs/lib/buddy/rateLimit.test.ts
import { describe, it, expect } from 'vitest'
import { evaluateRateLimit } from './rateLimit'

const LIMITS = { perMinute: 10, perDay: 100 }

describe('evaluateRateLimit', () => {
  it('allows and increments a fresh session', () => {
    const r = evaluateRateLimit(1_000_000, null, LIMITS)
    expect(r.allowed).toBe(true)
    expect(r.state.minuteCount).toBe(1)
    expect(r.state.dayCount).toBe(1)
  })

  it('resets the minute window after 60s', () => {
    const prev = { minuteStart: 0, minuteCount: 10, dayStart: 0, dayCount: 10 }
    const r = evaluateRateLimit(61_000, prev, LIMITS)
    expect(r.allowed).toBe(true)
    expect(r.state.minuteCount).toBe(1)
    expect(r.state.dayCount).toBe(11)
  })

  it('blocks when the minute limit is reached within the window', () => {
    const prev = { minuteStart: 0, minuteCount: 10, dayStart: 0, dayCount: 10 }
    const r = evaluateRateLimit(30_000, prev, LIMITS)
    expect(r.allowed).toBe(false)
    expect(r.reason).toBe('per_minute')
  })

  it('blocks when the daily limit is reached even if the minute is fresh', () => {
    const prev = { minuteStart: 0, minuteCount: 0, dayStart: 0, dayCount: 100 }
    const r = evaluateRateLimit(120_000, prev, LIMITS)
    expect(r.allowed).toBe(false)
    expect(r.reason).toBe('per_day')
  })
})
