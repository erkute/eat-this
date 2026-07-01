// nextjs/app/components/buddy/BuddyWidget.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'

// BuddyWidget reads auth + favourites for the "save to my map" button; stub
// them so the component renders without an <AuthProvider> / Firebase.
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: null }) }))
vi.mock('@/lib/map/useFavorites', () => ({
  useFavorites: () => ({ favoriteIds: new Set<string>(), toggle: vi.fn() }),
}))
vi.mock('@/lib/map/UserLocationContext', () => ({
  useUserLocationContext: () => ({ location: null, loading: false, error: null, request: vi.fn() }),
}))
vi.mock('@/lib/firebase/useOwnedEntitlements', () => ({
  useOwnedEntitlements: () => new Set<string>(),
}))

import BuddyWidget from './BuddyWidget'

describe('BuddyWidget', () => {
  it('renders no floating launcher while closed', () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="de" messages={{}}>
        <BuddyWidget />
      </NextIntlClientProvider>,
    )
    expect(html).not.toMatch(/data-buddy-launcher/)
    expect(html).not.toMatch(/data-buddy-panel="open"/)
  })
})
