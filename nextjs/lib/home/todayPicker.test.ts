import { describe, expect, it } from 'vitest'
import type { MapRestaurant } from '@/lib/types'
import { pickTodayRestaurants, type TodayPickerPreferences } from './todayPicker'

const MITTE = { lat: 52.52, lng: 13.405 }
const OPEN = [{ days: 'daily', hours: '00:00–23:59' }]
const CLOSED = [{ days: 'daily', hours: '01:00–02:00' }]
const prefs: TodayPickerPreferences = { mood: 'any', budget: 'any', radius: 3000 }

function r(id: string, extra: Partial<MapRestaurant> = {}): MapRestaurant {
  return {
    _id: id,
    _createdAt: '',
    name: id,
    slug: id,
    isClosed: false,
    lat: 52.52,
    lng: 13.405,
    mustEatCount: 0,
    openingHours: OPEN,
    ...extra,
  }
}

describe('pickTodayRestaurants', () => {
  it('never recommends known-closed restaurants', () => {
    const picks = pickTodayRestaurants(
      [r('open-a'), r('open-b'), r('open-c'), r('closed', { openingHours: CLOSED })],
      prefs,
      MITTE,
      new Date('2026-06-15T12:00:00'),
    )
    expect(picks.map((p) => p.restaurant._id)).not.toContain('closed')
  })

  it('prefers matching mood and budget when enough candidates exist', () => {
    const restaurants = [
      r('cheap-pizza', { cuisineType: 'Pizza', priceRange: { min: 8, max: 16 } }),
      r('cheap-burger', { cuisineType: 'Burger', priceRange: { min: 9, max: 18 } }),
      r('cheap-taco', { cuisineType: 'Tacos', priceRange: { min: 7, max: 20 } }),
      r('fine-dining', { cuisineType: 'Fine Dining', priceRange: { min: 60, max: 100 }, mustEatCount: 3 }),
    ]
    const picks = pickTodayRestaurants(
      restaurants,
      { mood: 'quick', budget: 'cheap', radius: 3000 },
      MITTE,
      new Date('2026-06-15T12:00:00'),
    )
    expect(picks.map((p) => p.restaurant._id)).toEqual(expect.arrayContaining(['cheap-pizza', 'cheap-burger', 'cheap-taco']))
    expect(picks.map((p) => p.restaurant._id)).not.toContain('fine-dining')
  })

  it('keeps € and €€ as distinct candidate pools', () => {
    const restaurants = [
      r('cheap-a', { priceRange: { min: 7, max: 15 } }),
      r('cheap-b', { priceRange: { min: 8, max: 18 } }),
      r('cheap-c', { priceRange: { min: 9, max: 20 } }),
      r('medium-a', { priceRange: { min: 18, max: 35 } }),
      r('medium-b', { priceRange: { min: 20, max: 40 } }),
      r('medium-c', { priceRange: { min: 22, max: 45 } }),
    ]
    const cheap = pickTodayRestaurants(restaurants, { ...prefs, budget: 'cheap' }, MITTE)
    const medium = pickTodayRestaurants(restaurants, { ...prefs, budget: 'medium' }, MITTE)
    expect(cheap.map((p) => p.restaurant._id)).toEqual(expect.arrayContaining(['cheap-a', 'cheap-b', 'cheap-c']))
    expect(medium.map((p) => p.restaurant._id)).toEqual(expect.arrayContaining(['medium-a', 'medium-b', 'medium-c']))
  })

  it('uses unknown-price fillers without leaking the opposite known price band', () => {
    const restaurants = [
      r('cheap-known', { priceRange: { min: 8, max: 16 } }),
      r('medium-known', { priceRange: { min: 25, max: 35 } }),
      r('unknown-a'),
      r('unknown-b'),
    ]
    const cheap = pickTodayRestaurants(restaurants, { ...prefs, budget: 'cheap' }, MITTE)
    const medium = pickTodayRestaurants(restaurants, { ...prefs, budget: 'medium' }, MITTE)
    expect(cheap.map((p) => p.restaurant._id)).not.toContain('medium-known')
    expect(medium.map((p) => p.restaurant._id)).not.toContain('cheap-known')
  })

  it('uses mood matches as the candidate pool when enough exist', () => {
    const restaurants = [
      r('pizza', { cuisineType: 'Pizza' }),
      r('burger', { cuisineType: 'Burger' }),
      r('tacos', { cuisineType: 'Tacos' }),
      r('cafe', { cuisineType: 'Café' }),
      r('wine', { cuisineType: 'Wine Bar' }),
      r('breakfast', { cuisineType: 'Breakfast' }),
    ]
    const quick = pickTodayRestaurants(restaurants, { ...prefs, mood: 'quick' }, MITTE)
    const cozy = pickTodayRestaurants(restaurants, { ...prefs, mood: 'cozy' }, MITTE)
    expect(quick.map((p) => p.restaurant._id)).toEqual(expect.arrayContaining(['pizza', 'burger', 'tacos']))
    expect(cozy.map((p) => p.restaurant._id)).toEqual(expect.arrayContaining(['cafe', 'wine', 'breakfast']))
  })

  it('falls back beyond the radius and keeps restaurants with unknown hours', () => {
    const picks = pickTodayRestaurants(
      [
        r('near', { openingHours: undefined }),
        r('far-a', { lat: 52.58, openingHours: undefined }),
        r('far-b', { lat: 52.59, openingHours: undefined }),
      ],
      { ...prefs, radius: 1500 },
      MITTE,
    )
    expect(picks).toHaveLength(3)
    expect(picks.every((p) => p.opening === 'unknown')).toBe(true)
  })
})
