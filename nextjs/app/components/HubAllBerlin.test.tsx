import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import { translations } from '@/lib/i18n/translations'
import HubAllBerlin from '@/app/components/HubAllBerlin'

function render() {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="de" messages={translations.de}>
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
  it('links the CTA to the All Berlin pack detail page', () => {
    const html = render()
    expect(html).toMatch(/href="[^"]*\/pack\/all-berlin"/)
  })
})
