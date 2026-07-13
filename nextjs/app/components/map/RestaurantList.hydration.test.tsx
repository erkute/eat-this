// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next-intl', () => ({ useLocale: () => 'de' }))
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ lang: 'de', t: (key: string) => key }) }))
vi.mock('@/lib/auth', () => ({ useLoginModal: () => ({ open: vi.fn() }) }))
vi.mock('@/lib/map', () => ({
  abbreviateBezirk: (value: string | null) => value,
  getOpenStatus: () => ({ isOpen: true, label: 'Geöffnet · Schließt 23:00', minutesUntilChange: 60 }),
  resolvePeek: () => ({ kind: 'none' }),
}))
vi.mock('@/lib/sanityImageLoader', () => ({ default: ({ src }: { src: string }) => src }))
vi.mock('@/lib/map/useRestaurantDetail', () => ({ prefetchRestaurantDetail: vi.fn() }))

import RestaurantList from './RestaurantList'
import type { MapRestaurant } from '@/lib/types'

const restaurant = {
  _id: 'restaurant-1',
  slug: 'restaurant-1',
  name: 'Test Restaurant',
  lat: 52.5,
  lng: 13.4,
  openingHours: [{ days: 'daily', hours: '10:00-23:00' }],
  categories: [],
  mustEatCount: 0,
} as unknown as MapRestaurant

function list() {
  return (
    <RestaurantList
      restaurants={[restaurant]}
      selectedId={null}
      uid={null}
      userTier="anon"
      onSelect={vi.fn()}
      primaryMustEats={new Map()}
      unlockedIds={new Set()}
      revealedMustEatIds={new Set()}
      userLocation={null}
    />
  )
}

describe('RestaurantList hydration', () => {
  beforeEach(() => vi.clearAllMocks())

  it('defers timezone-dependent opening status until after hydration', async () => {
    expect(renderToString(list())).not.toContain('role="status"')

    render(list())

    expect((await screen.findByRole('status')).textContent).toContain('Geöffnet')
  })
})
