import { describe, it, expect } from 'vitest'
import { buildRestaurantTitle, truncateAtSentence } from './restaurantMeta'

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

  it('drops the label when over the 62-char budget but keeps the location', () => {
    const t = buildRestaurantTitle({
      name: 'Der Weinlobbyist Restaurant & Weinbar',
      cuisineType: 'Wine Bar',
      district: 'Prenzlauer Berg',
      locale: 'de',
    })
    expect(t).toBe('Der Weinlobbyist Restaurant & Weinbar – Berlin-Prenzlauer Berg | EAT THIS')
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

  it('cuts at the last sentence boundary before 160 chars', () => {
    const text =
      'Handgeformtes Sauerteigbrot aus dem Steinofen. Die Zimtschnecken haben Kultstatus und die Schlange reicht am Wochenende bis vor die Tür. ' +
      'Danach folgt ein dritter Satz, der definitiv über das Limit hinausschießt und abgeschnitten werden muss.'
    const out = truncateAtSentence(text)
    expect(out).toBe(
      'Handgeformtes Sauerteigbrot aus dem Steinofen. Die Zimtschnecken haben Kultstatus und die Schlange reicht am Wochenende bis vor die Tür.',
    )
    expect(out.length).toBeLessThanOrEqual(160)
  })

  it('falls back to a word boundary with ellipsis when no sentence end exists', () => {
    const text = 'wort '.repeat(60).trim()
    const out = truncateAtSentence(text)
    expect(out.endsWith(' …')).toBe(true)
    expect(out.length).toBeLessThanOrEqual(160)
  })

  it('collapses whitespace', () => {
    expect(truncateAtSentence('Zwei  Leerzeichen\nund Umbruch.')).toBe('Zwei Leerzeichen und Umbruch.')
  })
})
