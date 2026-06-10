// nextjs/lib/buddy/prompt.test.ts
import { describe, it, expect } from 'vitest'
import { buildSystemPrompt } from './prompt'

describe('buildSystemPrompt', () => {
  it('only ever recommends spots from the search result — never invents or adds own-knowledge places', () => {
    const p = buildSystemPrompt('de')
    expect(p).toMatch(/search_spots/)
    expect(p).toMatch(/erfinde? nie/i)
    // recommendations come ONLY from the CMS search result
    expect(p).toMatch(/ausschließlich|nur .*(ergebnis|search_spots)/i)
    // empty/thin result → decline honestly, do NOT fill from own knowledge
    expect(p).toMatch(/aus deinem wissen|eigenem wissen|stadtbekannt/i) // must be mentioned…
    // …and explicitly forbidden (negated), not permitted as a fallback tier
    expect(p).toMatch(/(nie|niemals|kein).{0,60}(aus deinem wissen|eigenem wissen|erfundene?n? spot|stadtbekannt)/i)
    // the old "add 1–2 own-knowledge spots when results are thin" permission is gone
    expect(p).not.toMatch(/darfst du.{0,40}ergänz/i)
    expect(p).not.toMatch(/etabliert/i)
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
