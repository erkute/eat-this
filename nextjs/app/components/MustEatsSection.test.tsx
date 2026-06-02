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

import MustEatsSection from '@/app/components/MustEatsSection'

const EMPTY: InitialMapData = {
  restaurants: [],
  lockedRestaurants: [],
  mustEats: [],
  categories: [],
  totalCount: 0,
  revealedMustEatIds: [],
}

function render(locale: 'de' | 'en' = 'de') {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={{}}>
      <MustEatsSection initialMapData={EMPTY} locale={locale} />
    </NextIntlClientProvider>,
  )
}

describe('MustEatsSection', () => {
  it('renders the Must Eats H1', () => {
    const html = render()
    expect(html).toMatch(/<h1[^>]*>Must<br\/?>Eats<\/h1>/)
  })

  it('points the closing CTA at the packs hub anchor', () => {
    const html = render()
    expect(html).toMatch(/href="\/home#hub-packs"/)
  })

  it('locale-prefixes the packs CTA for en', () => {
    const html = render('en')
    expect(html).toMatch(/href="\/en\/home#hub-packs"/)
  })
})
