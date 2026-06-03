import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import MapPromoCTA from '@/app/components/MapPromoCTA'

type Args = Parameters<typeof MapPromoCTA>[0]

function render(props: Args) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={props.locale} messages={{}}>
      <MapPromoCTA {...props} />
    </NextIntlClientProvider>,
  )
}

describe('MapPromoCTA', () => {
  it('deep-links to the bezirk-filtered map with rel=nofollow + name (de)', () => {
    const html = render({ kind: 'bezirk', name: 'Neukölln', mapHref: '/map?bezirk=neukoelln', locale: 'de' })
    expect(html).toContain('href="/map?bezirk=neukoelln"')
    expect(html).toContain('rel="nofollow"')
    expect(html).toContain('Ganz Neukölln auf der Map')
    expect(html).toContain('Zur Map')
  })

  it('renders EN copy + interpolated category name', () => {
    const html = render({ kind: 'kategorie', name: 'Pizza', mapHref: '/map?cat=pizza', locale: 'en' })
    expect(html).toContain('/map?cat=pizza')
    expect(html).toContain('Pizza on the map')
    expect(html).toContain('Open the map')
  })

  it('renders restaurant copy (no name in headline) + ?r= deep-link', () => {
    const html = render({ kind: 'restaurant', name: 'Cocolo', mapHref: '/map?r=cocolo', locale: 'de' })
    expect(html).toContain('href="/map?r=cocolo"')
    expect(html).toContain('Auf der Map ansehen')
  })

  it('chip variant renders an inline yellow pill (title + nofollow deep-link, no section heading)', () => {
    const html = render({ kind: 'bezirk', name: 'Mitte', mapHref: '/map?bezirk=mitte', locale: 'de', variant: 'chip' })
    expect(html).toContain('href="/map?bezirk=mitte"')
    expect(html).toContain('rel="nofollow"')
    expect(html).toContain('Ganz Mitte auf der Map')
    expect(html).not.toContain('<h2')
  })
})
