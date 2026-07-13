// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { BUDDY_ASK_EVENT } from '@/lib/buddy/homeStage'

const route = vi.hoisted(() => ({ pathname: '/' }))

vi.mock('next/navigation', () => ({
  usePathname: () => route.pathname,
}))

vi.mock('next/dynamic', () => ({
  default: () => function MockBuddyWidget() {
    return <div data-testid="buddy-widget" />
  },
}))

vi.mock('./BuddyWidget', () => ({ default: () => null }))

import BuddyWidgetLazy from './BuddyWidgetLazy'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  route.pathname = '/'
})

describe('BuddyWidgetLazy', () => {
  it('never mounts the heavy widget away from home', () => {
    vi.useFakeTimers()
    route.pathname = '/map'
    const { queryByTestId } = render(<BuddyWidgetLazy />)

    act(() => vi.advanceTimersByTime(5000))

    expect(queryByTestId('buddy-widget')).toBeNull()
  })

  it.each(['/', '/en'])('keeps the widget hooks unmounted while idle on %s', (pathname) => {
    vi.useFakeTimers()
    route.pathname = pathname
    const { queryByTestId } = render(<BuddyWidgetLazy />)

    act(() => vi.advanceTimersByTime(5000))
    expect(queryByTestId('buddy-widget')).toBeNull()
  })

  it('starts mounting immediately when the home stage asks before idle', () => {
    vi.useFakeTimers()
    const { queryByTestId } = render(<BuddyWidgetLazy />)

    fireEvent(window, new CustomEvent(BUDDY_ASK_EVENT, { detail: { question: 'Pizza?' } }))

    expect(queryByTestId('buddy-widget')).not.toBeNull()
  })
})
