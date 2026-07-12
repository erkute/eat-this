import { describe, it, expect } from 'vitest'
import type { BezirkDoc, RestaurantCard } from '@/lib/types'
import { buildBezirkFAQEntries } from '@/lib/bezirk-prose'

const cafe = { slug: 'coffee', name: 'Café', nameEn: 'Coffee' }
const dinner = { slug: 'dinner', name: 'Abendessen', nameEn: 'Dinner' }
const bar = { slug: 'bar', name: 'Bar', nameEn: 'Bar' }

function r(name: string, opts: Partial<RestaurantCard> = {}): RestaurantCard {
  return {
    _id: name,
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    categories: [cafe],
    priceRange: { min: 1, max: 10, currency: 'EUR' },
    ...opts,
  }
}

const mitte: Pick<BezirkDoc, 'name'> = { name: 'Mitte' }

describe('buildBezirkFAQEntries', () => {
  const restaurants = [
    r('Atelier', { categories: [cafe], priceRange: { min: 1, max: 10, currency: 'EUR' } }),
    r('Borchardt', { categories: [dinner], priceRange: { min: 40, max: 100, currency: 'EUR' } }),
    r('Coda', { categories: [bar], priceRange: { min: 20, max: 60, currency: 'EUR' } }),
    r('Doku', { categories: [cafe], priceRange: { min: 1, max: 15, currency: 'EUR' } }),
  ]

  it('emits the full set when budget + fine-dining buckets are populated', () => {
    const entries = buildBezirkFAQEntries({ bezirk: mitte, restaurants, locale: 'de' })
    expect(entries.map(e => e.question)).toEqual([
      'Wie viele Restaurants empfiehlt Eat This in Mitte?',
      'Welche Restaurant-Kategorien gibt es in Mitte?',
      'Wo gibt es die besten Café-Spots in Mitte?',
      'Was sind bekannte Restaurants in Mitte?',
      'Wo isst man in Mitte günstig?',
      'Wo isst man in Mitte gehoben?',
    ])
  })

  it('skips highlights when fewer than 3 restaurants exist', () => {
    const entries = buildBezirkFAQEntries({
      bezirk: mitte,
      restaurants: restaurants.slice(0, 2),
      locale: 'de',
    })
    expect(entries.map(e => e.question)).not.toContain('Was sind bekannte Restaurants in Mitte?')
  })

  it('skips fine-dining bucket when no restaurant qualifies', () => {
    const entries = buildBezirkFAQEntries({
      bezirk: mitte,
      restaurants: [r('A'), r('B')],
      locale: 'de',
    })
    expect(entries.map(e => e.question)).not.toContain('Wo isst man in Mitte gehoben?')
  })

  it('interpolates restaurant names per bezirk so answers stay unique', () => {
    const a = buildBezirkFAQEntries({ bezirk: { name: 'Mitte' }, restaurants, locale: 'de' })
    const b = buildBezirkFAQEntries({
      bezirk: { name: 'Kreuzberg' },
      restaurants: [r('Sofi'), r('Barra'), r('Coda')],
      locale: 'de',
    })
    expect(a[2].answer).toContain('Atelier')
    expect(b[2].answer).toContain('Sofi')
    expect(a[2].answer).not.toEqual(b[2].answer)
  })
})
