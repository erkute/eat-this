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
vi.mock('@/lib/map', () => ({
  useMapData: ({ initialMapData }: { initialMapData: InitialMapData }) => initialMapData,
  useUnlockedMustEats: () => ({ unlockedIds: new Set<string>() }),
}))

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

function render(mustEats: MapMustEat[], locale: 'de' | 'en' = 'de') {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={{}}>
      <HubMustEatsTeaser initialMapData={data(mustEats)} />
    </NextIntlClientProvider>,
  )
}

describe('HubMustEatsTeaser', () => {
  // messages={{}} → next-intl echoes the key, which is enough to prove the
  // title/sub/cta are wired to the right i18n keys.
  it('renders the title + sub via the mustEats teaser keys', () => {
    const html = render([me()])
    expect(html).toContain('mustEats.teaserTitle')
    expect(html).toContain('mustEats.teaserSub')
    expect(html).toContain('mustEats.teaserCta')
  })

  it('points the CTA at the standalone /must-eats page', () => {
    const html = render([me()])
    expect(html).toMatch(/href="\/must-eats"/)
  })

  it('locale-prefixes the CTA for en', () => {
    const html = render([me()], 'en')
    expect(html).toMatch(/href="\/en\/must-eats"/)
  })

  it('paints cards face-down pre-mount (no dish names leaked)', () => {
    const html = render([me({ dish: 'Secret Dish' })])
    expect(html).toContain('card-back.webp')
    expect(html).not.toContain('Secret Dish')
  })

  it('renders nothing when there are no must-eats', () => {
    expect(render([])).toBe('')
  })
})
