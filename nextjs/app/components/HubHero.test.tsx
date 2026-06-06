import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import { translations } from '@/lib/i18n/translations'
import HubHero from '@/app/components/HubHero'
import type { HomeSpot } from '@/lib/home/getHomeData'

const baseSpot: HomeSpot = {
  _id: 'r1',
  name: 'Bar Basta',
  slug: 'bar-basta',
  image: 'https://cdn.sanity.io/images/x/y-972x1300.png',
  district: 'Mitte',
  sub: 'Çilbir-Frühstück & ODB-Sandwich-Abend.',
  featured: true,
  featuredOnDate: null,
  mustEatCount: 3,
}

function render(ui: React.ReactElement) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="de" messages={translations.de}>
      {ui}
    </NextIntlClientProvider>,
  )
}

describe('HubHero', () => {
  it('renders the spot name and sub', () => {
    const html = render(<HubHero spot={baseSpot} today="2026-06-01" />)
    expect(html).toContain('Bar Basta')
    expect(html).toContain('ODB-Sandwich')
    expect(html).toContain('Spot des Tages')
  })
  it('links to the map (nofollow) and the restaurant detail', () => {
    const html = render(<HubHero spot={baseSpot} today="2026-06-01" />)
    expect(html).toContain('r=bar-basta')
    expect(html).toContain('rel="nofollow"')
    expect(html).toContain('restaurant/bar-basta')
  })
  it('omits the photo when image is absent', () => {
    const html = render(
      <HubHero spot={{ ...baseSpot, image: null, sub: null }} today="2026-06-01" />,
    )
    expect(html).not.toContain('<img')
  })
})
