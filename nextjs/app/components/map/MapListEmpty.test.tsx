// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next-intl', () => ({
  useLocale: () => 'de',
  // Stand-in for the ICU keys the locked variant reads, so the assertions below
  // are about the count and the label reaching the copy — not about wording.
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    key === 'emptyLockedBody'
      ? `Für „${values?.label}" sind ${values?.count} passende Spots noch gesperrt.`
      : key === 'emptyLockedBodyBare'
        ? `${values?.count} passende Spots sind noch gesperrt.`
        : key,
}))
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ lang: 'de', t: (key: string) => key }) }))
vi.mock('@/lib/auth', () => ({ useLoginModal: () => ({ open: vi.fn() }) }))
vi.mock('@/lib/map', () => ({
  abbreviateBezirk: (value: string | null) => value,
  getOpenStatus: () => ({ isOpen: true, label: 'Geöffnet', minutesUntilChange: 60 }),
  resolvePeek: () => ({ kind: 'none' }),
}))
vi.mock('@/lib/sanityImageLoader', () => ({ default: ({ src }: { src: string }) => src }))
vi.mock('@/lib/map/useRestaurantDetail', () => ({ prefetchRestaurantDetail: vi.fn() }))

import MapListEmpty from './MapListEmpty'
import RestaurantList from './RestaurantList'

function emptyList(props: Partial<React.ComponentProps<typeof RestaurantList>> = {}) {
  return (
    <RestaurantList
      restaurants={[]}
      selectedId={null}
      uid={null}
      userTier="anon"
      onSelect={vi.fn()}
      primaryMustEats={new Map()}
      unlockedIds={new Set()}
      revealedMustEatIds={new Set()}
      userLocation={null}
      {...props}
    />
  )
}

describe('MapListEmpty', () => {
  it('names the locked count and the filter it applies to', () => {
    render(<MapListEmpty lockedCount={3} filterLabel="Ramen" packHref="/pack/all-berlin" />)

    expect(screen.getByRole('status').textContent).toContain(
      'Für „Ramen" sind 3 passende Spots noch gesperrt',
    )
    expect(screen.getByRole('status').textContent).toContain('map.emptyLockedTitle')
    expect(screen.getByRole('link')).toHaveProperty(
      'href',
      expect.stringContaining('/pack/all-berlin'),
    )
  })

  it('says "nothing found" rather than "locked" when nothing matches at all', () => {
    render(<MapListEmpty lockedCount={0} filterLabel="Xyzzy" />)

    const text = screen.getByRole('status').textContent ?? ''
    expect(text).toContain('map.emptyTitle')
    expect(text).not.toContain('gesperrt')
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('drops the label clause when no single filter label applies', () => {
    render(<MapListEmpty lockedCount={5} packHref="/pack/all-berlin" />)

    expect(screen.getByRole('status').textContent).toContain(
      '5 passende Spots sind noch gesperrt',
    )
  })
})

describe('RestaurantList empty state', () => {
  // The regression: a search matching only locked spots („Ramen" = 0 free, 3
  // locked) used to skip the empty state entirely and render the bare
  // All-Berlin banner — an empty surface plus a paywall, no "0 hits", no reason.
  it('renders the empty state when only locked spots match', () => {
    render(emptyList({ lockedMatchCount: 3, activeFilterLabel: 'Ramen' }))

    const status = screen.getByRole('status')
    expect(status.textContent).toContain(
      'Für „Ramen" sind 3 passende Spots noch gesperrt',
    )
    expect(status.textContent).not.toContain('map.listEndSub')
  })

  it('still renders the empty state when nothing matches at all', () => {
    render(emptyList({ lockedMatchCount: 0 }))

    expect(screen.getByRole('status').textContent).toContain('map.emptyTitle')
  })

  it('does not sell packs to an all-Berlin owner', () => {
    render(
      emptyList({
        userTier: 'allBerlin',
        lockedMatchCount: 3,
        activeFilterLabel: 'Ramen',
      }),
    )

    const status = screen.getByRole('status')
    expect(status.textContent).toContain('map.emptyTitle')
    expect(screen.queryByRole('link')).toBeNull()
  })
})
