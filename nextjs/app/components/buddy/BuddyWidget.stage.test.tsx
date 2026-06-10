// @vitest-environment jsdom
// nextjs/app/components/buddy/BuddyWidget.stage.test.tsx
// Home-stage protocol: the corner launcher hides while the hub's "Frag Remy"
// section is on screen, and buddy:ask opens the panel (optionally asking).
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { BUDDY_ASK_EVENT, BUDDY_STAGE_EVENT } from '@/lib/buddy/homeStage'

vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: null }) }))
vi.mock('@/lib/map/useFavorites', () => ({
  useFavorites: () => ({ favoriteIds: new Set<string>(), toggle: vi.fn() }),
}))
const send = vi.fn()
vi.mock('./useBuddyChat', () => ({
  useBuddyChat: () => ({ messages: [], isStreaming: false, send, setGeo: vi.fn() }),
}))
vi.mock('@/i18n/navigation', () => ({
  usePathname: () => '/',
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))

import BuddyWidget from './BuddyWidget'

afterEach(() => {
  cleanup()
  send.mockClear()
})

function renderWidget() {
  return render(
    <NextIntlClientProvider locale="de" messages={{}}>
      <BuddyWidget />
    </NextIntlClientProvider>,
  )
}

const stage = (visible: boolean) =>
  new CustomEvent(BUDDY_STAGE_EVENT, {
    detail: { visible, rect: { left: 10, top: 20, width: 132, height: 132 } },
  })

describe('BuddyWidget home-stage protocol', () => {
  it('hides the launcher while the stage is visible, shows it again after', () => {
    renderWidget()
    const launcher = document.querySelector('[data-buddy-launcher]')!
    expect(launcher.getAttribute('data-stage')).toBeNull()

    fireEvent(window, stage(true))
    expect(launcher.getAttribute('data-stage')).toBe('true')

    fireEvent(window, stage(false))
    expect(launcher.getAttribute('data-stage')).toBeNull()
  })

  it('opens the panel and sends the question on buddy:ask', () => {
    renderWidget()
    expect(document.querySelector('[data-buddy-panel="open"]')).toBeNull()

    fireEvent(
      window,
      new CustomEvent(BUDDY_ASK_EVENT, { detail: { question: 'Wo gibt’s gute Pizza?' } }),
    )
    expect(document.querySelector('[data-buddy-panel="open"]')).not.toBeNull()
    expect(send).toHaveBeenCalledWith('Wo gibt’s gute Pizza?')
  })

  it('opens the panel without sending when buddy:ask has no question', () => {
    renderWidget()
    fireEvent(window, new CustomEvent(BUDDY_ASK_EVENT, { detail: {} }))
    expect(document.querySelector('[data-buddy-panel="open"]')).not.toBeNull()
    expect(send).not.toHaveBeenCalled()
  })
})
