// @vitest-environment jsdom

import type { ReactNode } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { MapMustEat } from '@/lib/types'
import type { MustEatDetailState } from './useMustEatDetailState'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, string | number>) => {
    const copy: Record<string, string> = {
      mustEatAtAria: 'Must Eat bei {name}',
      proximityAway: 'Noch {distance}',
      proximityCloser: 'Komm näher',
      proximityDistanceGoal: '{meters} m zum Aufdecken',
      proximityHere: 'Du bist am Ort',
      proximityTapReveal: 'Karte aufdecken',
    }
    return Object.entries(values ?? {}).reduce(
      (text, [name, value]) => text.replace(`{${name}}`, String(value)),
      copy[key] ?? key,
    )
  },
}))

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    lang: 'de',
    t: (key: string) => ({
      'mustEats.covered': 'Verdeckt',
      'map.toSpot': 'Zum Spot',
      'map.tooFarToReveal': 'Zu weit weg',
      'map.inRestaurant': 'Bei',
      'map.searchClose': 'Schließen',
    })[key] ?? key,
  }),
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock('./useSwipePager', () => ({ useSwipePager: vi.fn() }))

import MustEatDetailMobile from './MustEatDetailMobile'

afterEach(cleanup)

const mustEat: MapMustEat = {
  _id: 'must-eat-1',
  restaurant: {
    _id: 'restaurant-1',
    name: 'Test Spot',
    slug: 'test-spot',
    lat: 52.52,
    lng: 13.405,
  },
}

function makeState(overrides: Partial<MustEatDetailState> = {}): MustEatDetailState {
  return {
    distance: 2400,
    canUnlock: false,
    proximityProgress: 0.27,
    vibrateIntensity: 0.18,
    tapping: false,
    unlocking: false,
    unlockError: false,
    revealOrigin: null,
    zoomRect: null,
    zoomActive: false,
    handleCardClick: vi.fn(async () => undefined),
    handleRevealDone: vi.fn(),
    handleCardZoom: vi.fn(),
    handleZoomReady: vi.fn(),
    handleZoomClose: vi.fn(),
    handleZoomExitComplete: vi.fn(),
    ...overrides,
  }
}

describe('MustEatDetailMobile distance meter', () => {
  it('shows localized kilometres and the real reveal radius for a covered card', () => {
    const { container } = render(
      <MustEatDetailMobile
        mustEat={mustEat}
        isUnlocked={false}
        onClose={vi.fn()}
        state={makeState()}
      />,
    )

    expect(screen.getByText('Noch 2,4 km')).toBeTruthy()
    expect(screen.getByText('50 m zum Aufdecken')).toBeTruthy()
    const fill = container.querySelector('[data-must-eat-distance-meter] span')
    expect(fill?.getAttribute('style')).toContain('--fd-distance-progress: 27%')
  })

  it('keeps the existing no-location guidance when no GPS fix is available', () => {
    const { container } = render(
      <MustEatDetailMobile
        mustEat={mustEat}
        isUnlocked={false}
        onClose={vi.fn()}
        state={makeState({ distance: null, proximityProgress: null })}
      />,
    )

    expect(screen.getByText('Komm näher')).toBeTruthy()
    expect(container.querySelector('[data-must-eat-distance-meter]')).toBeNull()
  })
})
