import { describe, it, expect } from 'vitest'
import { parseNdjsonLines } from './useBuddyChat'
import type { BuddyStreamEvent } from '@/lib/buddy/types'

describe('parseNdjsonLines', () => {
  it('parses complete lines and keeps the trailing partial in the remainder', () => {
    const events: BuddyStreamEvent[] = []
    const rest = parseNdjsonLines(
      '{"type":"text","value":"a"}\n{"type":"done"}\n{"type":"text","val',
      (e) => events.push(e),
    )
    expect(events).toEqual([{ type: 'text', value: 'a' }, { type: 'done' }])
    expect(rest).toBe('{"type":"text","val')
  })

  it('ignores empty lines', () => {
    const events: BuddyStreamEvent[] = []
    const rest = parseNdjsonLines('\n{"type":"done"}\n', (e) => events.push(e))
    expect(events).toEqual([{ type: 'done' }])
    expect(rest).toBe('')
  })
})
