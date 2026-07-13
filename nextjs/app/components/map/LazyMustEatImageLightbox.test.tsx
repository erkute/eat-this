// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'

const dynamicComponent = vi.hoisted(() => vi.fn())

vi.mock('next/dynamic', () => ({
  default: () => function MockMustEatImageLightbox() {
    dynamicComponent()
    return <div data-testid="must-eat-lightbox" />
  },
}))

import LazyMustEatImageLightbox from './LazyMustEatImageLightbox'

const rect = {
  width: 100,
  height: 140,
  x: 0,
  y: 0,
  top: 0,
  left: 0,
  right: 100,
  bottom: 140,
  toJSON: () => ({}),
} as DOMRect

afterEach(() => {
  cleanup()
  dynamicComponent.mockClear()
})

describe('LazyMustEatImageLightbox', () => {
  it('does not mount the dynamic component before an opening starts', () => {
    const { queryByTestId, rerender } = render(
      <LazyMustEatImageLightbox
        active={false}
        imageUrl="/card.webp"
        alt="Card"
        originRect={null}
        onClose={vi.fn()}
      />,
    )

    expect(queryByTestId('must-eat-lightbox')).toBeNull()
    expect(dynamicComponent).not.toHaveBeenCalled()

    rerender(
      <LazyMustEatImageLightbox
        active
        imageUrl="/card.webp"
        alt="Card"
        originRect={rect}
        onClose={vi.fn()}
      />,
    )

    expect(queryByTestId('must-eat-lightbox')).not.toBeNull()
    expect(dynamicComponent).toHaveBeenCalledOnce()
  })

  it('can stay mounted with a null origin during the fly-back', () => {
    const { queryByTestId } = render(
      <LazyMustEatImageLightbox
        active
        imageUrl="/card.webp"
        alt="Card"
        originRect={null}
        onClose={vi.fn()}
      />,
    )

    expect(queryByTestId('must-eat-lightbox')).not.toBeNull()
  })
})
