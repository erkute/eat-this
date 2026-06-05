import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import type { InitialMapData } from '@/lib/map/server-initial-map-data'
import type { MapMustEat } from '@/lib/types'

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

function render(initialMapData: InitialMapData, locale: 'de' | 'en' = 'de') {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={{}}>
      <HubMustEatsTeaser initialMapData={initialMapData} />
    </NextIntlClientProvider>,
  )
}

describe('HubMustEatsTeaser', () => {
  // messages={{}} → next-intl echoes the key, which is enough to prove the
  // title/sub/cta are wired to the right i18n keys.
  it('renders the title + sub via the mustEats teaser keys', () => {
    const html = render(dataRevealed([me()]))
    expect(html).toContain('mustEats.teaserTitle')
    expect(html).toContain('mustEats.teaserSub')
    expect(html).toContain('mustEats.teaserCta')
  })

  it('points the CTA at the standalone /must-eats page', () => {
    const html = render(dataRevealed([me()]))
    expect(html).toMatch(/href="\/must-eats"/)
  })

  it('locale-prefixes the CTA for en', () => {
    const html = render(dataRevealed([me()]), 'en')
    expect(html).toMatch(/href="\/en\/must-eats"/)
  })

  it('renders only face-up cards: shows dish image, no card-back', () => {
    const html = render(dataRevealed([me({ dish: 'Smash Burger', image: 'https://cdn.sanity.io/i.png' })]))
    expect(html).toContain('cdn.sanity.io')
    expect(html).not.toContain('card-back')
  })

  it('renders nothing when no card is face-up', () => {
    // revealedMustEatIds is empty → no face-up cards → section should be empty
    expect(render(data([me()]))).toBe('')
  })
})
