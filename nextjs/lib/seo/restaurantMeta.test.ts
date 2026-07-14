import { describe, it, expect } from 'vitest'
import {
  buildCuratedRestaurantTitle,
  buildOrderPromiseDescription,
  buildRestaurantTitle,
  truncateAtSentence,
} from './restaurantMeta'

describe('buildRestaurantTitle', () => {
  it('builds the full DE pattern', () => {
    expect(
      buildRestaurantTitle({ name: 'Sofi', cuisineType: 'Bakery', district: 'Mitte', locale: 'de' }),
    ).toBe('Sofi – Bäckerei in Berlin-Mitte | EAT THIS')
  })

  it('uses the raw cuisine value on EN', () => {
    expect(
      buildRestaurantTitle({ name: 'Sofi', cuisineType: 'Bakery', district: 'Mitte', locale: 'en' }),
    ).toBe('Sofi – Bakery in Berlin-Mitte | EAT THIS')
  })

  it('falls back to "in Berlin" without district', () => {
    expect(
      buildRestaurantTitle({ name: 'Sofi', cuisineType: 'Bakery', district: null, locale: 'de' }),
    ).toBe('Sofi – Bäckerei in Berlin | EAT THIS')
  })

  it('avoids double Berlin when the name contains it', () => {
    expect(
      buildRestaurantTitle({ name: '136 Berlin Restaurant', cuisineType: 'Peruvian', district: 'Mitte', locale: 'de' }),
    ).toBe('136 Berlin Restaurant – Peruanisch in Mitte | EAT THIS')
  })

  it('falls back to the unique name when cuisine and location exceed the budget', () => {
    const t = buildRestaurantTitle({
      name: 'Der Weinlobbyist Restaurant & Weinbar',
      cuisineType: 'Wine Bar',
      district: 'Prenzlauer Berg',
      locale: 'de',
    })
    expect(t).toBe('Der Weinlobbyist Restaurant & Weinbar | EAT THIS')
    expect(t.length).toBeLessThanOrEqual(60)
  })

  it('passes unknown cuisine values through', () => {
    expect(
      buildRestaurantTitle({ name: 'X', cuisineType: 'Fusion', district: 'Mitte', locale: 'de' }),
    ).toBe('X – Fusion in Berlin-Mitte | EAT THIS')
  })

  it('handles missing cuisine and district', () => {
    expect(buildRestaurantTitle({ name: 'Sofi', cuisineType: null, district: null, locale: 'de' }))
      .toBe('Sofi – in Berlin | EAT THIS')
  })
})

describe('truncateAtSentence', () => {
  it('returns short text unchanged', () => {
    expect(truncateAtSentence('Kurz und gut.')).toBe('Kurz und gut.')
  })

  it('cuts at the last sentence boundary before 155 chars', () => {
    const text =
      'Handgeformtes Sauerteigbrot aus dem Steinofen. Die Zimtschnecken haben Kultstatus und die Schlange reicht am Wochenende bis vor die Tür. ' +
      'Danach folgt ein dritter Satz, der definitiv über das Limit hinausschießt und abgeschnitten werden muss.'
    const out = truncateAtSentence(text)
    expect(out).toBe(
      'Handgeformtes Sauerteigbrot aus dem Steinofen. Die Zimtschnecken haben Kultstatus und die Schlange reicht am Wochenende bis vor die Tür.',
    )
    expect(out.length).toBeLessThanOrEqual(155)
  })

  it('falls back to a word boundary with ellipsis when no sentence end exists', () => {
    const text = 'wort '.repeat(60).trim()
    const out = truncateAtSentence(text)
    expect(out.endsWith(' …')).toBe(true)
    expect(out.length).toBeLessThanOrEqual(155)
  })

  it('collapses whitespace', () => {
    expect(truncateAtSentence('Zwei  Leerzeichen\nund Umbruch.')).toBe('Zwei Leerzeichen und Umbruch.')
  })

  it('falls back to ellipsis when the only sentence end is in the first 40 chars', () => {
    const short = 'Ja. ' + 'x '.repeat(80).trim()
    const out = truncateAtSentence(short)
    expect(out.endsWith(' …')).toBe(true)
  })
})

describe('buildCuratedRestaurantTitle', () => {
  it('adds missing branch qualifiers before applying the title budget', () => {
    const stargarder = buildCuratedRestaurantTitle(
      'Hokey Pokey — Eispatisserie in Prenzlauer Berg',
      'Hokey Pokey Stargarder',
    )
    const oderberger = buildCuratedRestaurantTitle(
      'Hokey Pokey — Eispatisserie in Prenzlauer Berg',
      'Hokey Pokey Oderberger',
    )

    expect(stargarder).not.toBe(oderberger)
    expect(stargarder).toContain('Stargarder')
    expect(oderberger).toContain('Oderberger')
    expect(stargarder.length).toBeLessThanOrEqual(60)
    expect(oderberger.length).toBeLessThanOrEqual(60)
  })
})

describe('buildOrderPromiseDescription', () => {
  it('builds the DE answer-promise with dishes and price label', () => {
    expect(
      buildOrderPromiseDescription({
        name: 'Boii Boii',
        dishes: ['Pork Belly', 'Wolfsbarsch'],
        priceLabel: '20–40 €',
        locale: 'de',
      }),
    ).toBe(
      'Was bestellen bei Boii Boii? Pork Belly & Wolfsbarsch — unsere Empfehlungen mit Preisen (20–40 €), und ob sich der Besuch lohnt.',
    )
  })

  it('builds the EN equivalent without a price label', () => {
    expect(
      buildOrderPromiseDescription({ name: 'Boii Boii', dishes: ['Pork Belly'], locale: 'en' }),
    ).toBe(
      "What to order at Boii Boii? Pork Belly — our picks with prices, and whether it's worth the visit.",
    )
  })

  it('caps the dish list at three entries', () => {
    const out = buildOrderPromiseDescription({
      name: 'X',
      dishes: ['A', 'B', 'C', 'D'],
      locale: 'de',
    })
    expect(out).toContain('A, B & C')
    expect(out).not.toContain('D')
  })

  it('returns null without dishes', () => {
    expect(buildOrderPromiseDescription({ name: 'X', dishes: [], locale: 'de' })).toBeNull()
    expect(buildOrderPromiseDescription({ name: 'X', dishes: ['  '], locale: 'de' })).toBeNull()
  })
})
