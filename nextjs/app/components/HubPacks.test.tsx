import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import HubPacks from '@/app/components/HubPacks'

const names = { breakfast: 'Frühstück', pizza: 'Pizza', sweets: 'Süßes' }

function render(categoryNames: Record<string, string> = names) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="de" messages={{}}>
      <HubPacks categoryNames={categoryNames} />
    </NextIntlClientProvider>,
  )
}

describe('HubPacks', () => {
  it('renders the heading, the gift pack and a localized category pack name', () => {
    const html = render()
    expect(html).toContain('Booster Packs')
    expect(html).toContain('Welcome Pack')
    expect(html).toContain('Frühstück')
  })
  it('links category packs to the filtered map (nofollow) and offers gift email signup', () => {
    const html = render()
    expect(html).toContain('cat=breakfast')
    expect(html).toContain('rel="nofollow"')
    expect(html).toContain('type="email"')
    expect(html).toContain('Anmelden')
  })
  it('shows a formatted price and does NOT render the all-berlin pack', () => {
    const html = render()
    expect(html).toContain('€2,99')
    expect(html).not.toContain('All Berlin')
  })
  it('falls back to the English displayName when no localized name exists', () => {
    const html = render({})
    expect(html).toContain('Breakfast')
  })
})
