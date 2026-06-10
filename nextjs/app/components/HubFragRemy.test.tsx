// @vitest-environment jsdom
// nextjs/app/components/HubFragRemy.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { BUDDY_ASK_EVENT, BUDDY_STAGE_EVENT, type BuddyAskDetail, type BuddyStageDetail } from '@/lib/buddy/homeStage'
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
  it('opens the chat (buddy:ask, no question) when the input pill is clicked', () => {
    let got: BuddyAskDetail | null = null
    let calls = 0
    const onAsk = (e: Event) => {
      calls++
      got = (e as CustomEvent<BuddyAskDetail>).detail
    }
    window.addEventListener(BUDDY_ASK_EVENT, onAsk)
    renderSection()
    const pill = document.querySelector<HTMLButtonElement>('[data-fragremy-open]')!
    fireEvent.click(pill)
    window.removeEventListener(BUDDY_ASK_EVENT, onAsk)
    expect(calls).toBe(1)
    expect(got).toEqual({})
  })

  it('dispatches buddy:stage with a rect when the stage enters and leaves', () => {
    const events: BuddyStageDetail[] = []
    const onStage = (e: Event) => events.push((e as CustomEvent<BuddyStageDetail>).detail)
    window.addEventListener(BUDDY_STAGE_EVENT, onStage)
    renderSection()
    ioCallback!([fakeEntry(true)])
    ioCallback!([fakeEntry(false)])
    window.removeEventListener(BUDDY_STAGE_EVENT, onStage)
    expect(events).toHaveLength(2)
    expect(events[0].visible).toBe(true)
    expect(events[0].rect).toEqual({ left: 10, top: 20, width: 132, height: 132 })
    expect(events[1].visible).toBe(false)
  })

  it('releases the stage (visible: false) on unmount', () => {
    const events: BuddyStageDetail[] = []
    const onStage = (e: Event) => events.push((e as CustomEvent<BuddyStageDetail>).detail)
    const { unmount } = renderSection()
    window.addEventListener(BUDDY_STAGE_EVENT, onStage)
    unmount()
    window.removeEventListener(BUDDY_STAGE_EVENT, onStage)
    expect(ioDisconnect).toHaveBeenCalled()
    expect(events).toEqual([{ visible: false }])
  })
})
