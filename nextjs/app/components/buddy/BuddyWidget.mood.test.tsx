// @vitest-environment jsdom
// nextjs/app/components/buddy/BuddyWidget.mood.test.tsx
// Expression policy: thinking (O-mouth still) while streaming with no answer
// text yet; the mouth flap starts only once text is actually appearing.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { BUDDY_ASK_EVENT } from '@/lib/buddy/homeStage'
import type { BuddyDisplayMessage } from './useBuddyChat'

vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: null }) }))
vi.mock('@/lib/map/useFavorites', () => ({
  useFavorites: () => ({ favoriteIds: new Set<string>(), toggle: vi.fn() }),
}))
vi.mock('@/lib/firebase/useOwnedEntitlements', () => ({
  useOwnedEntitlements: () => new Set<string>(),
}))
vi.mock('@/i18n/navigation', () => ({
  usePathname: () => '/',
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))

const chat: { messages: BuddyDisplayMessage[]; isStreaming: boolean } = {
  messages: [],
  isStreaming: false,
}
vi.mock('./useBuddyChat', () => ({
  useBuddyChat: () => ({ ...chat, send: vi.fn(), setGeo: vi.fn() }),
}))

import BuddyWidget from './BuddyWidget'

afterEach(cleanup)

function renderOpenWidget() {
  const utils = render(
    <NextIntlClientProvider locale="de" messages={{}}>
      <BuddyWidget />
    </NextIntlClientProvider>,
  )
  fireEvent(window, new CustomEvent(BUDDY_ASK_EVENT, { detail: {} }))
  return utils
}

const panelMood = () =>
  document.querySelector('#buddy-panel [data-mood]')?.getAttribute('data-mood')

describe('BuddyWidget expression policy', () => {
  it('ponders (thinking) while streaming with no answer text yet', () => {
    chat.messages = [
      { role: 'user', content: 'Wo gibt’s gute Pizza?' },
      { role: 'assistant', content: '' },
    ]
    chat.isStreaming = true
    renderOpenWidget()
    expect(panelMood()).toBe('thinking')
  })

  it('talks once answer text is appearing', () => {
    chat.messages = [
      { role: 'user', content: 'Wo gibt’s gute Pizza?' },
      { role: 'assistant', content: 'Da hab ich was für dich:' },
    ]
    chat.isStreaming = true
    renderOpenWidget()
    expect(panelMood()).toBe('talking')
  })

  it('idles when nothing is streaming', () => {
    chat.messages = [
      { role: 'user', content: 'Wo gibt’s gute Pizza?' },
      { role: 'assistant', content: 'Da hab ich was für dich:' },
    ]
    chat.isStreaming = false
    renderOpenWidget()
    expect(panelMood()).toBe('idle')
  })
})
