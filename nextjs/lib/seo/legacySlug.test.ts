import { describe, it, expect } from 'vitest'
import { oldStyleSlug } from './legacySlug'

describe('oldStyleSlug — reproduces the pre-rebuild slug from a name', () => {
  // name (current Sanity) → the old slug Google still has indexed (from GSC 404 report).
  // The old builder dropped non-German diacritics + apostrophes instead of
  // transliterating them, so these slugs all differ from the new ones.
  it.each([
    ['893 Ryōtei', '893-ry-tei'],
    ['AKKURAT Café', 'akkurat-caf'],
    ['Châlet Suisse', 'ch-let-suisse'],
    ['La Côte', 'la-c-te'],
    ['Kuréme', 'kur-me'],
    ["La Cantine d'Augusta", 'la-cantine-d-augusta'],
    ['Smash’d Eatery x Forn SimSim', 'smash-d-eatery-x-forn-simsim'],
    ["Philomeni's Greek Delicious", 'philomeni-s-greek-delicious'],
    ['Shōdo Udon Lab', 'sh-do-udon-lab'],
    ['Café Botanico', 'caf-botanico'],
  ])('%s → %s', (name, expected) => {
    expect(oldStyleSlug(name)).toBe(expected)
  })

  // German umlauts + Turkish/Polish were ALREADY transliterated by the old
  // builder, so these spots never changed slug — oldStyleSlug must equal the
  // current slug (i.e. they generate no spurious legacy redirect).
  it.each([
    ['Knödelwirtschaft SÜD', 'knoedelwirtschaft-sued'],
    ['Blomeyers Käse aus Deutschland', 'blomeyers-kaese-aus-deutschland'],
    ['Bursa Uludağ Kebapçısı', 'bursa-uludag-kebapcisi'],
  ])('%s → %s (unchanged)', (name, expected) => {
    expect(oldStyleSlug(name)).toBe(expected)
  })
})
