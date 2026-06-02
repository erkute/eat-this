import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'

// HubWelcomePack reads auth to hide itself for signed-in users. In this
// isolated SSR render there's no AuthProvider — mock anon so the gift pack
// still renders (its production wrapper is the (spa) layout's AuthProvider).
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: null, loading: false }) }))

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
  it('links category packs to their pack detail page and offers gift email signup', () => {
    const html = render()
    expect(html).toContain('/pack/breakfast')
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
