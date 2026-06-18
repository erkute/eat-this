import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import type { InitialMapData } from '@/lib/map/server-initial-map-data'
import type { MapMustEat } from '@/lib/types'
import { translations } from '@/lib/i18n/translations'

// The island pulls in Firebase/auth + browser-only map context. Stub the hooks
// so the component renders in its pre-mount state (initialMapData, all
// face-down) — the data partitioning is covered by the splitMustEats helper
// tests, this test targets the section shell (title + CTA href).
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ user: null, loading: false }),
}))
vi.mock('@/lib/map', async () => {
  const actual = await vi.importActual<typeof import('@/lib/map/unlockedMustEats')>(
    '@/lib/map/unlockedMustEats',
  )
  return {
    useMapData: ({ initialMapData }: { initialMapData: InitialMapData }) => initialMapData,
    useUnlockedMustEats: () => ({ unlockedIds: new Set<string>() }),
    // Real helper so the pre-mount face-up computation matches production.
    resolveUnlockedMustEatIds: actual.resolveUnlockedMustEatIds,
  }
})

import HubMustEatsTeaser from '@/app/components/HubMustEatsTeaser'

const me = (o: Partial<MapMustEat> = {}): MapMustEat => ({
  _id: 'm1',
  dish: 'Smash Burger',
  image: 'https://cdn.sanity.io/i.png',
  restaurant: { _id: 'r1', name: 'Bar Basta', slug: 'bar-basta', lat: 52.5, lng: 13.4 },
  ...o,
})

const data = (mustEats: MapMustEat[]): InitialMapData => ({
  restaurants: [],
  lockedRestaurants: [],
  mustEats,
  categories: [],
  totalCount: 0,
  revealedMustEatIds: [],
})

/** Helper: same as data() but with all must-eat ids in revealedMustEatIds */
const dataRevealed = (mustEats: MapMustEat[]): InitialMapData => ({
  ...data(mustEats),
  revealedMustEatIds: mustEats.map((m) => m._id),
})

// useTranslation() pulls in next-intl's useRouter, which needs the app router
// context mounted. The test never navigates — a stub is enough.
const routerStub = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
} as unknown as AppRouterInstance

function render(initialMapData: InitialMapData, locale: 'de' | 'en' = 'de') {
  return renderToStaticMarkup(
    <AppRouterContext.Provider value={routerStub}>
      <NextIntlClientProvider locale={locale} messages={translations[locale]} timeZone="Europe/Berlin">
        <HubMustEatsTeaser initialMapData={initialMapData} />
      </NextIntlClientProvider>
    </AppRouterContext.Provider>,
  )
}

describe('HubMustEatsTeaser', () => {
  it('renders the title + sub via the mustEats teaser translations', () => {
    const html = render(dataRevealed([me()]))
    expect(html).toContain(translations.de.mustEats.teaserTitle)
    expect(html).toContain(translations.de.mustEats.teaserSub)
    expect(html).toContain(translations.de.mustEats.teaserCta)
  })

  it('points the CTA at the map must-eats flow', () => {
    const html = render(dataRevealed([me()]))
    expect(html).toMatch(/href="\/map"/)
  })

  it('locale-prefixes the CTA for en', () => {
    const html = render(dataRevealed([me()]), 'en')
    expect(html).toMatch(/href="\/en\/map"/)
  })

  it('renders face-up cards with their must-eat image', () => {
    const html = render(dataRevealed([me()]))
    expect(html).toContain('cdn.sanity.io')
    expect(html).toContain('Smash Burger')
  })

  it('renders nothing when no card is face-up', () => {
    // revealedMustEatIds is empty → no face-up cards → section should be empty
    expect(render(data([me()]))).toBe('')
  })
})
