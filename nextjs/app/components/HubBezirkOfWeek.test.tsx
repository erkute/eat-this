import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import { translations } from '@/lib/i18n/translations'
import HubBezirkOfWeek from '@/app/components/HubBezirkOfWeek'
import type { HubBezirk } from '@/lib/home/getHomeData'

const bezirk = (o: Partial<HubBezirk> = {}): HubBezirk => ({
  name: 'Neukölln',
  slug: 'neukoelln',
  tagline: 'Frische Welle vom Reuterkiez bis Sonnenallee',
  spots: [
    { _id: 's1', name: 'Schüsseldienst', slug: 'schuesseldienst', image: 'https://cdn.sanity.io/i.png', category: 'Lunch' },
  ],
  ...o,
})

function render(b: HubBezirk | null) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="de" messages={translations.de}>
      <HubBezirkOfWeek bezirk={b} />
    </NextIntlClientProvider>,
  )
}

describe('HubBezirkOfWeek', () => {
  it('renders the bezirk name (umlaut), tagline, a spot tile and the foot link', () => {
    const html = render(bezirk())
    expect(html).toContain('Bezirk der Woche')
    expect(html).toContain('Neukölln')
    expect(html).toContain('Frische Welle')
    expect(html).toContain('Schüsseldienst')
    expect(html).toContain('bezirk=neukoelln')
  })
  it('links each tile to the spot on the map with nofollow', () => {
    const html = render(bezirk())
    expect(html).toContain('r=schuesseldienst')
    expect(html).toContain('rel="nofollow"')
  })
  it('renders nothing when bezirk is null', () => {
    expect(render(null)).toBe('')
  })
})
