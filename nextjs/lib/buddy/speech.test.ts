// nextjs/lib/buddy/speech.test.ts
import { describe, it, expect } from 'vitest'
import { speechText } from './speech'

describe('speechText', () => {
  it('strips spot/chips markers and bold for clean spoken prose', () => {
    const raw = 'Hier **ZOLA** — neapolitanisch.\n[[spot:zola]]\nUnd **Oliveto**.\n[[spot:oliveto]]\n[[chips: vegan? | günstiger?]]'
    const out = speechText(raw)
    expect(out).not.toContain('[[')
    expect(out).not.toContain('**')
    expect(out).toContain('ZOLA')
    expect(out).toContain('Oliveto')
    expect(out).not.toContain('vegan?')
  })
  it('returns plain text unchanged (collapsed whitespace)', () => {
    expect(speechText('Nur   Text.')).toBe('Nur Text.')
  })
})
