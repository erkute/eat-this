// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MapMustEat } from '@/lib/types'
import type { MustEatDetailState } from './useMustEatDetailState'

const openLoginModal = vi.fn()

vi.mock('@/lib/auth', () => ({
  useLoginModal: () => ({ open: openLoginModal }),
}))
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }))
vi.mock('./MustEatRevealOverlay', () => ({ default: () => null }))
vi.mock('./LazyMustEatImageLightbox', () => ({ default: () => null }))
vi.mock('./MustEatDetailMobile', () => ({
  default: ({ state }: { state: MustEatDetailState }) => (
    <button type="button" onClick={state.handleCardClick}>
      Reveal Must Eat
    </button>
  ),
}))

import MustEatDetail from './MustEatDetail'

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

describe('MustEatDetail login gate', () => {
  beforeEach(() => {
    openLoginModal.mockClear()
  })

  it('opens the current shared starter login layer for an in-range guest', () => {
    const onUnlock = vi.fn().mockResolvedValue(true)

    render(
      <MustEatDetail
        mustEat={mustEat}
        userLocation={{ lat: 52.52, lng: 13.405 }}
        isUnlocked={false}
        onUnlock={onUnlock}
        onClose={vi.fn()}
        uid={null}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reveal Must Eat' }))

    expect(openLoginModal).toHaveBeenCalledOnce()
    expect(openLoginModal).toHaveBeenCalledWith('starter')
    expect(onUnlock).not.toHaveBeenCalled()
  })
})
