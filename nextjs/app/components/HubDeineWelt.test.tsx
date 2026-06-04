import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import type { InitialMapData } from '@/lib/map/server-initial-map-data'

// Auth state is swapped per test: while loading (= the SSR pass) the static
// shell must render so globals.css can show it pre-paint for returning
// signed-in visitors (html[data-auth="1"]); resolved-anon renders nothing.
const authState = { user: null as { uid: string } | null, loading: true }
vi.mock('@/lib/auth', () => ({ useAuth: () => authState }))
vi.mock('@/lib/firebase/useOwnedEntitlements', () => ({ useOwnedEntitlements: () => null }))
vi.mock('@/lib/map', () => ({ useMapData: () => ({ restaurants: [] }) }))
vi.mock('@/lib/map/UserLocationContext', () => ({ useUserLocationContext: () => ({ location: null }) }))

import HubDeineWelt from '@/app/components/HubDeineWelt'

const initialMapData = { restaurants: [] } as unknown as InitialMapData

function render() {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="de" messages={{}}>
      <HubDeineWelt initialMapData={initialMapData} />
    </NextIntlClientProvider>,
  )
}

describe('HubDeineWelt', () => {
  beforeEach(() => {
    authState.user = null
    authState.loading = true
  })

  it('SSRs the static shell with the data-auth-only hook while auth is loading', () => {
    const html = render()
    expect(html).toContain('data-auth-only')
    expect(html).toContain('Heute auf')
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
    expect(html).toContain('Hallo Ersan')
  })
})
