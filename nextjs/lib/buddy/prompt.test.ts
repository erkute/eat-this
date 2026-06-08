// nextjs/lib/buddy/prompt.test.ts
import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from './prompt'

describe('buildSystemPrompt', () => {
  it('includes the anti-hallucination rule and tool guidance', () => {
    const p = buildSystemPrompt('de')
    expect(p).toMatch(/search_spots/)
    expect(p).toMatch(/erfinde? nie/i)
    expect(p).toMatch(/nur.*Tool-Ergebnis|ausschließlich.*Tool/i)
  })

  it('switches answer language by locale', () => {
    expect(buildSystemPrompt('de')).toMatch(/Antworte auf Deutsch/i)
    expect(buildSystemPrompt('en')).toMatch(/Answer in English/i)
  })
})
