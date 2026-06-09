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

import BuddyWidget from './BuddyWidget'

describe('BuddyWidget', () => {
  it('renders a launcher button (closed by default)', () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="de" messages={{}}>
        <BuddyWidget />
      </NextIntlClientProvider>,
    )
    expect(html).toMatch(/data-buddy-launcher/)
    // panel is not open initially
    expect(html).not.toMatch(/data-buddy-panel="open"/)
  })
})
