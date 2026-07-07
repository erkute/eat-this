// @vitest-environment jsdom
// nextjs/app/components/buddy/BuddyWidget.mood.test.tsx
// Expression policy: idle while streaming with no answer text yet; the mouth
// flap starts only once text is actually appearing.
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
vi.mock('@/lib/map/UserLocationContext', () => ({
  useUserLocationContext: () => ({ location: null, loading: false, error: null, request: vi.fn() }),
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
  it('stays idle while streaming with no answer text yet', () => {
    chat.messages = [
      { role: 'user', content: 'Wo gibt’s gute Pizza?' },
      { role: 'assistant', content: '' },
    ]
    chat.isStreaming = true
    renderOpenWidget()
    expect(panelMood()).toBe('idle')
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

  it('renders spot cards with map wording and a heart save label', () => {
    chat.messages = [
      { role: 'user', content: 'Bars, die offen haben' },
      {
        role: 'assistant',
        content: 'Nimm den hier:\n[[spot:beast-berlin]]',
        spots: [
          {
            _id: 'restaurant-beast',
            name: 'Beast Berlin',
            slug: 'beast-berlin',
            cuisineType: 'Bar',
            bezirk: 'Mitte',
            shortDescription: 'Steakhauskultur im Pressecafé.',
            tip: null,
            priceRange: '30-80 €',
            mapsUrl: null,
            image: '/pics/test/beast.webp',
            openNow: true,
            openLabel: 'Offen · bis 01:00',
            distanceLabel: null,
          },
        ],
      },
    ]
    chat.isStreaming = false
    renderOpenWidget()

    expect(document.body.textContent).toContain('Auf der Map ansehen')
    expect(document.body.textContent).not.toContain('Auf der Karte ansehen')
    const save = document.querySelector('button[aria-label="Spot herzen"]')
    expect(save).not.toBeNull()
    expect(save?.textContent).toContain('Merken')
    expect(save?.querySelector('svg')).not.toBeNull()
  })
})
