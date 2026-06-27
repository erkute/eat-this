import { describe, expect, it } from 'vitest'
import { normalizeName } from './normalizeName'

describe('normalizeName', () => {
  it('maps display-font fallback glyphs while preserving German umlauts', () => {
    expect(normalizeName('amatō')).toBe('amato')
    expect(normalizeName('AMATŌ')).toBe('AMATO')
    expect(normalizeName('Bursa Uludağ Kebapçısı')).toBe('Bursa Uludag Kebapcisi')
    expect(normalizeName('Knödelwirtschaft SÜD')).toBe('Knödelwirtschaft SÜD')
  })
})
