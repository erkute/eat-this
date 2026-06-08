// nextjs/lib/buddy/prompt.test.ts
import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from './prompt'

describe('buildSystemPrompt', () => {
  it('keeps the hard anti-hallucination rule and tiered recommendation policy', () => {
    const p = buildSystemPrompt('de')
    expect(p).toMatch(/search_spots/)
    expect(p).toMatch(/erfinde? nie/i)
    // tiered: verified Eat-This spots come first
    expect(p).toMatch(/geprüft|kuratiert/i)
    // unverified own additions must be clearly labelled
    expect(p).toMatch(/nicht.*geprüft|etabliert/i)
    // inline cards: a per-spot marker instruction is present
    expect(p).toMatch(/\[\[spot:/)
    // spots are introduced naturally (no clinical framing)
    expect(p).toMatch(/natürlich/i)
  })

  it('switches answer language by locale', () => {
    expect(buildSystemPrompt('de')).toMatch(/Antworte auf Deutsch/i)
    expect(buildSystemPrompt('en')).toMatch(/Answer in English/i)
  })
})
