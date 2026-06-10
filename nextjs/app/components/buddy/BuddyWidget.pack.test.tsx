// @vitest-environment jsdom
// nextjs/app/components/buddy/BuddyWidget.pack.test.tsx
// Booster-Pack teaser card: rendered once per conversation under the first
// matching answer, hidden for owners of the pack (or All Berlin).
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, fireEvent, cleanup } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import { BUDDY_ASK_EVENT } from '@/lib/buddy/homeStage'
import type { PackTeaser } from '@/lib/buddy/types'
import type { BuddyDisplayMessage } from './useBuddyChat'

const auth: { user: { uid: string } | null } = { user: null }
vi.mock('@/lib/auth', () => ({ useAuth: () => auth }))
vi.mock('@/lib/map/useFavorites', () => ({
  useFavorites: () => ({ favoriteIds: new Set<string>(), toggle: vi.fn() }),
}))
const owned: { value: Set<string> | null } = { value: new Set() }
vi.mock('@/lib/firebase/useOwnedEntitlements', () => ({
  useOwnedEntitlements: () => owned.value,
}))
const chat: { messages: BuddyDisplayMessage[]; isStreaming: boolean } = {
  messages: [],
  isStreaming: false,
}
vi.mock('./useBuddyChat', () => ({
  useBuddyChat: () => ({ ...chat, send: vi.fn(), setGeo: vi.fn() }),
}))
vi.mock('@/i18n/navigation', () => ({
  usePathname: () => '/',
  Link: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}))

import BuddyWidget from './BuddyWidget'

afterEach(() => {
  cleanup()
  auth.user = null
  owned.value = new Set()
})

const PIZZA_PACK: PackTeaser = {
  packId: 'category-pizza',
  slug: 'pizza',
  name: 'Pizza',
  spectrum: 'Holzofen. Pinsa. NY-Slice.',
  description: 'Berlins Pizza-Spots auf deiner Map.',
  art: '/pics/booster/booster_pizza.webp',
  priceLabel: '2,99 €',
}

function renderOpenWidget() {
  const utils = render(
    <NextIntlClientProvider locale="de" messages={{}}>
      <BuddyWidget />
    </NextIntlClientProvider>,
  )
  fireEvent(window, new CustomEvent(BUDDY_ASK_EVENT, { detail: {} }))
  return utils
}

const packCards = () => document.querySelectorAll('[data-buddy-pack]')

describe('BuddyWidget pack teaser', () => {
  it('renders the pack card with catalog copy, price and pack link', () => {
    chat.messages = [
      { role: 'user', content: 'pizza?' },
      { role: 'assistant', content: 'Da hab ich was.', pack: PIZZA_PACK },
    ]
    chat.isStreaming = false
    renderOpenWidget()
    const card = packCards()[0] as HTMLAnchorElement
    expect(card).toBeTruthy()
    expect(card.getAttribute('href')).toBe('/pack/pizza')
    expect(card.textContent).toContain('Booster Pack · Pizza')
    expect(card.textContent).toContain('Holzofen. Pinsa. NY-Slice.')
    expect(card.textContent).toContain('Berlins Pizza-Spots auf deiner Map.')
    expect(card.textContent).toContain('2,99 €')
    expect(card.querySelector('img')?.getAttribute('src')).toBe('/pics/booster/booster_pizza.webp')
  })

  it('shows only the first pack card of a conversation', () => {
    chat.messages = [
      { role: 'user', content: 'pizza?' },
      { role: 'assistant', content: 'Eins.', pack: PIZZA_PACK },
      { role: 'user', content: 'und kaffee?' },
      {
        role: 'assistant',
        content: 'Zwei.',
        pack: { ...PIZZA_PACK, packId: 'category-coffee', slug: 'coffee', name: 'Coffee' },
      },
    ]
    chat.isStreaming = false
    renderOpenWidget()
    expect(packCards()).toHaveLength(1)
    expect(packCards()[0].getAttribute('data-buddy-pack')).toBe('category-pizza')
  })

  it('hides the card when the signed-in user owns the pack', () => {
    auth.user = { uid: 'u1' }
    owned.value = new Set(['category-pizza'])
    chat.messages = [
      { role: 'user', content: 'pizza?' },
      { role: 'assistant', content: 'Da hab ich was.', pack: PIZZA_PACK },
    ]
    renderOpenWidget()
    expect(packCards()).toHaveLength(0)
  })

  it('hides the card for All-Berlin owners and while ownership is loading', () => {
    auth.user = { uid: 'u1' }
    owned.value = new Set(['all-berlin'])
    chat.messages = [
      { role: 'user', content: 'pizza?' },
      { role: 'assistant', content: 'Da hab ich was.', pack: PIZZA_PACK },
    ]
    renderOpenWidget()
    expect(packCards()).toHaveLength(0)

    cleanup()
    owned.value = null // snapshot still loading
    renderOpenWidget()
    expect(packCards()).toHaveLength(0)
  })
})
