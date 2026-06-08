import { describe, it, expect } from 'vitest'
import { resolveLegacyRestaurantSlug, GONE_SLUGS, NEWS_REDIRECTS, type LegacyRestaurant } from './legacyRedirects'

const RESTAURANTS: LegacyRestaurant[] = [
  // accent / apostrophe renames
  { name: 'AKKURAT Café', slug: 'akkurat-cafe', bezirk: 'kreuzberg' },
  { name: 'La Côte', slug: 'la-cote', bezirk: 'neukoelln' },
  { name: '893 Ryōtei', slug: '893-ryotei', bezirk: 'charlottenburg' },
  { name: 'Kuréme', slug: 'kureme', bezirk: 'kreuzberg' },
  { name: 'Shōdo Udon Lab', slug: 'shodo-udon-lab', bezirk: 'friedrichshain' },
  { name: 'Café Botanico', slug: 'cafe-botanico', bezirk: 'neukoelln' },
  // explicit splits
  { name: 'Five Elephant', slug: 'five-elephant-mitte', bezirk: 'mitte' },
  { name: 'Five Elephant Kreuzberg', slug: 'five-elephant-kreuzberg', bezirk: 'kreuzberg' },
  { name: 'The Barn Café Mitte', slug: 'the-barn-cafe-mitte', bezirk: 'mitte' },
  { name: 'The Barn Café Neukölln', slug: 'the-barn-cafe-neukoelln', bezirk: 'neukoelln' },
  { name: 'Hokey Pokey Stargarder', slug: 'hokey-pokey-stargarder', bezirk: 'prenzlauer-berg' },
  { name: 'Hokey Pokey Mitte', slug: 'hokey-pokey-mitte', bezirk: 'mitte' },
  // explicit renames / dropped suffix
  { name: 'Knödelwirtschaft SÜD', slug: 'knoedelwirtschaft-sued', bezirk: 'neukoelln' },
  { name: 'Jones Ice Cream', slug: 'jones-ice-cream', bezirk: 'schoeneberg' },
  { name: 'Tribeca Ice Cream', slug: 'tribeca-ice-cream', bezirk: 'prenzlauer-berg' },
  // generic-split fixture (not in explicit map)
  { name: 'Bonanza Coffee Mitte', slug: 'bonanza-coffee-mitte', bezirk: 'mitte' },
  { name: 'Bonanza Coffee Heroes', slug: 'bonanza-coffee-heroes', bezirk: 'prenzlauer-berg' },
  // untouched control
  { name: 'Borchardt', slug: 'borchardt', bezirk: 'mitte' },
]

describe('resolveLegacyRestaurantSlug', () => {
  it.each([
    ['akkurat-caf', 'akkurat-cafe'],
    ['la-c-te', 'la-cote'],
    ['893-ry-tei', '893-ryotei'],
    ['kur-me', 'kureme'],
    ['sh-do-udon-lab', 'shodo-udon-lab'],
    ['caf-botanico', 'cafe-botanico'],
  ])('accent map: %s → %s', (oldSlug, newSlug) => {
    expect(resolveLegacyRestaurantSlug(oldSlug, RESTAURANTS)).toBe(newSlug)
  })

  it.each([
    ['five-elephant', 'five-elephant-kreuzberg'],
    ['the-barn-cafe', 'the-barn-cafe-mitte'],
    ['hokey-pokey', 'hokey-pokey-stargarder'],
    ['eispatisserie-hokey-pokey', 'hokey-pokey-stargarder'],
    ['eispatisserie-hokey-pokey-prenzlauer-berg', 'hokey-pokey-stargarder'],
    ['jones-ice-cream-2', 'jones-ice-cream'],
    ['knoedelwirtschaft-nord', 'knoedelwirtschaft-sued'],
    ['tribeca-ice-cream-prenzlauer-berg', 'tribeca-ice-cream'],
  ])('explicit map: %s → %s', (oldSlug, newSlug) => {
    expect(resolveLegacyRestaurantSlug(oldSlug, RESTAURANTS)).toBe(newSlug)
  })

  it('generic split fallback prefers the mitte branch', () => {
    expect(resolveLegacyRestaurantSlug('bonanza-coffee', RESTAURANTS)).toBe('bonanza-coffee-mitte')
  })

  it('returns null for a real current slug (no redirect)', () => {
    expect(resolveLegacyRestaurantSlug('cafe-botanico', RESTAURANTS)).toBeNull()
    expect(resolveLegacyRestaurantSlug('borchardt', RESTAURANTS)).toBeNull()
  })

  it('returns null for a genuine 404', () => {
    expect(resolveLegacyRestaurantSlug('total-nonsense-xyz', RESTAURANTS)).toBeNull()
  })
})

describe('static gone / news maps', () => {
  it('flags the five permanently closed spots', () => {
    expect([...GONE_SLUGS].sort()).toEqual(
      ['doyum-restaurant', 'gnam-pasta-factory', 'lala-restaurant', 'phantom-bar', 'zeit-caf'].sort(),
    )
  })
  it('routes the File Asto article to its restaurant page, the rest to /news', () => {
    expect(NEWS_REDIRECTS['file-asto-brings-a-taste-of-athens-to-kreuzberg']).toBe('/restaurant/file-asto')
    expect(NEWS_REDIRECTS['ramen-berlin']).toBe('/news')
  })
})
