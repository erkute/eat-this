import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import HubAllBerlin from '@/app/components/HubAllBerlin'

function render() {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="de" messages={{}}>
      <HubAllBerlin />
    </NextIntlClientProvider>,
  )
}

describe('HubAllBerlin', () => {
  it('renders the All Berlin heading, price and savings', () => {
    const html = render()
    expect(html).toMatch(/All<br\/?>Berlin/)
    expect(html).toContain('€20,00')
    expect(html).toContain('€26,91')
    expect(html).toContain('Spar €6,91')
  })
  it('links the CTA to the map with nofollow', () => {
    const html = render()
    expect(html).toContain('rel="nofollow"')
    expect(html).toMatch(/href="[^"]*\/map"/)
  })
})
