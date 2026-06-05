import { describe, it, expect } from 'vitest'
import { siblingWindow } from './siblingWindow'

const all = ['a', 'b', 'c', 'd', 'e'].map(s => ({ slug: s }))

describe('siblingWindow', () => {
  it('returns the window after self, wrapping around', () => {
    expect(siblingWindow(all, 'd', 3).map(s => s.slug)).toEqual(['e', 'a', 'b'])
  })

  it('starts at the front for the first item', () => {
    expect(siblingWindow(all, 'a', 3).map(s => s.slug)).toEqual(['b', 'c', 'd'])
  })

  it('returns everything when fewer than limit remain', () => {
    expect(siblingWindow(all.slice(0, 3), 'b', 3).map(s => s.slug)).toEqual(['a', 'c'])
  })

  it('never contains self', () => {
    for (const item of all) {
      expect(siblingWindow(all, item.slug, 3).map(s => s.slug)).not.toContain(item.slug)
    }
  })

  it('handles unknown self slug (defensive)', () => {
    expect(siblingWindow(all, 'zzz', 3).map(s => s.slug)).toEqual(['a', 'b', 'c'])
  })
})
