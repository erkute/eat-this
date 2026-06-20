import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import { translations } from '@/lib/i18n/translations'

vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: null, loading: false }) }))

import HubAllBerlin from '@/app/components/HubAllBerlin'

function render() {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="de" messages={translations.de}>
      <HubAllBerlin />
    </NextIntlClientProvider>,
  )
}

describe('HubAllBerlin', () => {
  it('renders the All Berlin heading and offer copy', () => {
    const html = render()
    expect(html).toContain('id="hub-allberlin"')
    expect(html).toMatch(/All<br\/?>Berlin/)
    expect(html).toContain('Alle neuen Booster Packs in einem')
    expect(html).toContain('€20,00')
    expect(html).not.toContain('€26,91')
    expect(html).not.toContain('Spar €6,91')
  })
  it('renders a direct checkout CTA instead of linking to the detail page', () => {
    const html = render()
    expect(html).toContain('Kaufen')
    expect(html).not.toContain('aria-hidden="true">€20,00')
    expect(html).not.toMatch(/href="[^"]*\/pack\/all-berlin"/)
  })
})
