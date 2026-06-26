import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import { translations } from '@/lib/i18n/translations'
import type { InitialMapData } from '@/lib/map/server-initial-map-data'

// Auth state is swapped per test: while loading (= the SSR pass) the static
// shell must render so globals.css can show it pre-paint for returning
// signed-in visitors (html[data-auth="1"]); resolved-anon renders nothing.
const authState = { user: null as { uid: string } | null, loading: true }
vi.mock('@/lib/auth', () => ({ useAuth: () => authState }))
vi.mock('@/lib/firebase/useOwnedEntitlements', () => ({ useOwnedEntitlements: () => null }))
vi.mock('@/lib/map', () => ({
  useMapData: () => ({ restaurants: [], mustEats: [], revealedMustEatIds: new Set<string>() }),
  useUnlockedMustEats: () => ({ unlockedIds: new Set<string>() }),
  resolveUnlockedMustEatIds: () => new Set<string>(),
}))
vi.mock('@/lib/map/useFavorites', () => ({ useFavorites: () => ({ favorites: [] }) }))
vi.mock('@/app/components/MapIntentLink', () => ({
  default: ({ href, rel, className, children }: { href: string; rel?: string; className?: string; children: ReactNode }) => (
    <a href={href} rel={rel} className={className}>
      {children}
    </a>
  ),
}))

import HubDeineWelt from '@/app/components/HubDeineWelt'

const initialMapData = { restaurants: [], mustEats: [], revealedMustEatIds: [] } as unknown as InitialMapData

function render() {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="de" messages={translations.de} timeZone="Europe/Berlin">
      <HubDeineWelt initialMapData={initialMapData} />
    </NextIntlClientProvider>,
  )
}

describe('HubDeineWelt', () => {
  beforeEach(() => {
    authState.user = null
    authState.loading = true
  })

  it('SSRs the launcher shell with the data-auth-only hook while auth is loading', () => {
    const html = render()
    expect(html).toContain('data-auth-only')
    // Greeting + launcher question are the lean dock's copy.
    expect(html).toContain('Hey')
    expect(html).toContain('Deine Map wartet.')
    // The collection-progress line and the district picker are gone.
    expect(html).not.toContain('auf deiner Map')
    expect(html).not.toContain('Bezirk wählen')
    expect(html).not.toContain('Standort aktivieren')
    // The two quick actions live in the red panel.
    expect(html).toContain('Profil')
    expect(html).toContain('Map öffnen')
    // Both visual collections still render.
    expect(html).toContain('Spots')
    expect(html).toContain('Must Eats')
    // Deep links into the noindex map/profile routes must carry nofollow —
    // this markup now ships in the indexed SSR HTML of "/".
    expect(html).toContain('rel="nofollow"')
  })

  it('renders nothing once auth resolves to logged-out', () => {
    authState.loading = false
    expect(render()).toBe('')
  })

  it('greets a resolved user by first name', () => {
    authState.loading = false
    authState.user = { uid: 'u1', displayName: 'Ersan Tester' } as never
    const html = render()
    expect(html).toContain('Hey Ersan')
  })
})
