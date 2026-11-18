import { describe, it, expect } from 'vitest'
import { maskEmail } from '@/lib/maskEmail'

describe('maskEmail', () => {
  it('keeps two chars of a normal local part and the full domain', () => {
    expect(maskEmail('sample@example.com')).toBe('sa•••@example.com')
  })

  it('keeps a single char for one/two-char local parts', () => {
    expect(maskEmail('ab@x.de')).toBe('a•••@x.de')
    expect(maskEmail('a@x.de')).toBe('a•••@x.de')
  })

  it('never returns the input for degenerate values', () => {
    expect(maskEmail('@gmail.com')).toBe('•••')
    expect(maskEmail('no-at-sign')).toBe('•••')
    expect(maskEmail('')).toBe('•••')
  })
})
