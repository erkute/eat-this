// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react'
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
    expect(screen.getByText('mustEats.onb1Title')).toBeTruthy()
    expect(screen.getByText('mustEats.onb1Kicker')).toBeTruthy()
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
    expect(screen.getByText('mustEats.onb1Title')).toBeTruthy()
  })

  it('steps through all three slides; last button closes and sets flag', () => {
    render(<MustEatsOnboarding initialMapData={DATA} />)
    fireEvent.click(screen.getByText('mustEats.onbNext'))
    expect(screen.getByText('mustEats.onb2Title')).toBeTruthy()
    expect(screen.getByText('mustEats.onb2Body')).toBeTruthy()
    fireEvent.click(screen.getByText('mustEats.onbNext'))
    expect(screen.getByText('mustEats.onb3Title')).toBeTruthy()
    expect(screen.getByText('mustEats.onb3Body')).toBeTruthy()
    fireEvent.click(screen.getByText('mustEats.onbStart'))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(window.localStorage.getItem(ONBOARDING_SEEN_KEY)).toBe('1')
  })

  it('backdrop click closes the overlay', () => {
    render(<MustEatsOnboarding initialMapData={DATA} />)
    fireEvent.click(screen.getByRole('dialog').parentElement!)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(window.localStorage.getItem(ONBOARDING_SEEN_KEY)).toBe('1')
  })

  it('shows the flipping card on slide 2 and the booster pack art on slide 3', () => {
    render(<MustEatsOnboarding initialMapData={DATA} />)
    expect(screen.queryByTestId('onb-pack')).toBeNull()
    fireEvent.click(screen.getByText('mustEats.onbNext'))
    expect(screen.getByTestId('onb-flipper')).toBeTruthy()
    expect(screen.queryByTestId('onb-pack')).toBeNull()
    fireEvent.click(screen.getByText('mustEats.onbNext'))
    expect(screen.getByTestId('onb-pack').getAttribute('src')).toContain('/pics/booster/booster.webp')
    expect(screen.queryByTestId('onb-flipper')).toBeNull()
  })

  it('step 2 shows the card back, then auto-flips open after the dwell', () => {
    vi.useFakeTimers()
    try {
      render(<MustEatsOnboarding initialMapData={DATA} />)
      fireEvent.click(screen.getByText('mustEats.onbNext'))
      const flipper = screen.getByTestId('onb-flipper')
      expect(flipper.className).toContain('flipped')
      act(() => {
        vi.advanceTimersByTime(800)
      })
      expect(flipper.className).not.toContain('flipped')
    } finally {
      vi.useRealTimers()
    }
  })
})
