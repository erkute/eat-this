import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import type { InitialMapData } from '@/lib/map/server-initial-map-data'

// The server shell composes two client islands that pull in Firebase/auth and
// browser-only context. This test targets the shell itself (H1 + closing CTA),
// so stub the islands out — their behaviour is covered by the pure-helper tests
// and the live app's providers.
vi.mock('@/app/components/MustEatsGallery', () => ({
  default: () => null,
}))
vi.mock('@/app/components/SiteFooter', () => ({
  default: () => null,
}))
vi.mock('@/app/components/MustEatsOnboarding', () => ({
  default: () => null,
}))

import MustEatsSection from '@/app/components/MustEatsSection'

const EMPTY: InitialMapData = {
  restaurants: [],
  lockedRestaurants: [],
  mustEats: [],
  categories: [],
  totalCount: 0,
  revealedMustEatIds: [],
}

function render(locale: 'de' | 'en' = 'de', data: InitialMapData = EMPTY) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={{}}>
      <MustEatsSection initialMapData={data} locale={locale} />
    </NextIntlClientProvider>,
  )
}

describe('MustEatsSection', () => {
  it('renders the Must Eats H1', () => {
    const html = render()
    expect(html).toMatch(/<h1[^>]*>Must<br\/?>Eats<\/h1>/)
  })

  it('points the closing CTA at the booster packs overview', () => {
    const html = render()
    expect(html).toMatch(/href="\/packs"/)
  })

  it('locale-prefixes the packs CTA for en', () => {
    const html = render('en')
    expect(html).toMatch(/href="\/en\/packs"/)
  })

  it('renders the explanatory sub copy (de)', () => {
    const html = render()
    expect(html).toContain('Unsere klare Empfehlung pro Spot')
    expect(html).toContain('den Rest deckst du vor Ort selbst auf.')
  })

  it('renders the explanatory sub copy (en)', () => {
    const html = render('en')
    expect(html).toContain('Our clear pick for each spot')
    expect(html).toContain('you reveal the rest yourself, on site.')
  })

  it('uses the shared card-back asset for hero cards without an image', () => {
    const html = render('de', {
      ...EMPTY,
      mustEats: [
        {
          _id: 'hero-covered',
          dish: 'Covered Dish',
          restaurant: {
            _id: 'r1',
            name: 'Test Spot',
            slug: 'test-spot',
            lat: 52.5,
            lng: 13.4,
          },
        },
      ],
    } as InitialMapData)

    expect(html).toContain('/pics/card-back.webp?v=6')
    expect(html).not.toContain('card-back-gallery')
  })

  it('closing block sells booster packs (de)', () => {
    const html = render()
    expect(html).toContain('Mehr Must\u00a0Eats')
    expect(html).toContain('und Spots.')
    expect(html).toContain('Kauf ein Booster Pack')
    expect(html).toContain('Packs kaufen')
  })

  it('renders all nine category packs without the starter artwork', () => {
    const html = render()

    for (const src of [
      '/pics/booster/booster_breakfast.webp',
      '/pics/booster/booster_coffee.webp',
      '/pics/booster/booster_dinner.webp',
      '/pics/booster/booster_drinks.webp',
      '/pics/booster/booster_fastfood.webp',
      '/pics/booster/booster_finedining.webp',
      '/pics/booster/booster_lunch.webp',
      '/pics/booster/booster_pizza.webp',
      '/pics/booster/booster_sweets.webp',
    ]) {
      expect(html).toContain(src)
    }

    expect(html).not.toContain('/pics/booster/booster.webp')
    expect(html).not.toContain('/pics/booster/booster_free.webp')
    expect(html.match(/src="\/pics\/booster\/[^"?]+\.webp"/g)).toHaveLength(9)
  })
})
