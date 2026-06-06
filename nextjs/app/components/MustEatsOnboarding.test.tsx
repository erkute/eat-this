// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import type { InitialMapData } from '@/lib/map/server-initial-map-data'

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ lang: 'de', t: (k: string) => k, setLang: () => {} }),
}))

import MustEatsOnboarding, { ONBOARDING_SEEN_KEY } from '@/app/components/MustEatsOnboarding'

const DATA: InitialMapData = {
  restaurants: [],
  lockedRestaurants: [],
  mustEats: [
    {
      _id: 'me-1',
      dish: 'Königsberger Klopse',
      image: 'https://cdn.example/dish.webp',
      restaurant: { _id: 'r-1', name: 'R', slug: 'r', lat: 52.52, lng: 13.405 },
    },
  ],
  categories: [],
  totalCount: 1,
  revealedMustEatIds: ['me-1'],
}

beforeEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe('MustEatsOnboarding', () => {
  it('opens on first visit (no localStorage flag)', () => {
    render(<MustEatsOnboarding initialMapData={DATA} />)
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('mustEats.onbStep1')).toBeTruthy()
  })

  it('stays closed when the seen flag is set', () => {
    window.localStorage.setItem(ONBOARDING_SEEN_KEY, '1')
    render(<MustEatsOnboarding initialMapData={DATA} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('close button dismisses and sets the flag', () => {
    render(<MustEatsOnboarding initialMapData={DATA} />)
    fireEvent.click(screen.getByLabelText('mustEats.onbClose'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(window.localStorage.getItem(ONBOARDING_SEEN_KEY)).toBe('1')
  })

  it('"how it works" trigger reopens despite the flag', () => {
    window.localStorage.setItem(ONBOARDING_SEEN_KEY, '1')
    render(<MustEatsOnboarding initialMapData={DATA} />)
    fireEvent.click(screen.getByText('mustEats.howItWorks'))
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('mustEats.onbStep1')).toBeTruthy()
  })

  it('steps forward through all three steps; last button closes and sets flag', () => {
    render(<MustEatsOnboarding initialMapData={DATA} />)
    fireEvent.click(screen.getByText('mustEats.onbNext'))
    expect(screen.getByText('mustEats.onbStep2')).toBeTruthy()
    fireEvent.click(screen.getByText('mustEats.onbNext'))
    expect(screen.getByText('mustEats.onbStep3')).toBeTruthy()
    fireEvent.click(screen.getByText('mustEats.onbStart'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(window.localStorage.getItem(ONBOARDING_SEEN_KEY)).toBe('1')
  })

  it('backdrop click closes the overlay', () => {
    render(<MustEatsOnboarding initialMapData={DATA} />)
    fireEvent.click(screen.getByRole('dialog'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(window.localStorage.getItem(ONBOARDING_SEEN_KEY)).toBe('1')
  })
})
