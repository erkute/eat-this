// @vitest-environment jsdom
// nextjs/app/components/HubFragRemy.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { BUDDY_ASK_EVENT, type BuddyAskDetail } from '@/lib/buddy/homeStage'
import HubFragRemy from './HubFragRemy'

// jsdom has no IntersectionObserver — capture the callback so tests can drive
// stage visibility by hand.
type IoCallback = (entries: Array<Partial<IntersectionObserverEntry>>) => void
let ioCallback: IoCallback | null = null
const ioDisconnect = vi.fn()

beforeEach(() => {
  ioCallback = null
  ioDisconnect.mockClear()
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: IoCallback) {
        ioCallback = cb
      }
      observe() {}
      disconnect = ioDisconnect
    },
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderSection() {
  return render(
    <NextIntlClientProvider locale="de" messages={{}}>
      <HubFragRemy />
    </NextIntlClientProvider>,
  )
}

const fakeEntry = (visible: boolean): Partial<IntersectionObserverEntry> => ({
  isIntersecting: visible,
  boundingClientRect: { left: 10, top: 20, width: 132, height: 132 } as DOMRect,
})

describe('HubFragRemy', () => {
  it('renders the time-of-day lead and the two quick answers', () => {
    renderSection()
    // Daypart lead + answers land after mount via useEffect.
    const lead = document.querySelector('[data-fragremy-lead]')
    expect((lead?.textContent ?? '').length).toBeGreaterThan(0)
    const chips = document.querySelectorAll('[data-fragremy-chips] button')
    expect(chips.length).toBe(2)
  })

  it('dispatches buddy:ask with the chip question on chip click', () => {
    let got: BuddyAskDetail | null = null
    const onAsk = (e: Event) => {
      got = (e as CustomEvent<BuddyAskDetail>).detail
    }
    window.addEventListener(BUDDY_ASK_EVENT, onAsk)
    renderSection()
    const chip = document.querySelector<HTMLButtonElement>('[data-fragremy-chips] button')!
    fireEvent.click(chip)
    window.removeEventListener(BUDDY_ASK_EVENT, onAsk)
    expect(got).toEqual({ question: chip.textContent })
  })

  it('animates Remy briefly when the section enters', () => {
    renderSection()
    ioCallback!([fakeEntry(true)])
    expect(document.querySelector('[data-talking]')).not.toBeNull()
  })

  it('disconnects the observer on unmount', () => {
    const { unmount } = renderSection()
    unmount()
    expect(ioDisconnect).toHaveBeenCalled()
  })
})
