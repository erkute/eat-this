import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import { translations } from '@/lib/i18n/translations'

// HubWelcomePack reads auth to hide itself for signed-in users. In this
// isolated SSR render there's no AuthProvider — mock anon so the gift pack
// still renders (its production wrapper is the (spa) layout's AuthProvider).
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: null, loading: false }) }))

import HubPacks from '@/app/components/HubPacks'

const names = { breakfast: 'Frühstück', pizza: 'Pizza', sweets: 'Süßes' }

function render(categoryNames: Record<string, string> = names) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="de" messages={translations.de}>
      <HubPacks categoryNames={categoryNames} />
    </NextIntlClientProvider>,
  )
}

describe('HubPacks', () => {
  it('renders the heading, the gift pack and a localized category pack name', () => {
    const html = render()
    expect(html).toContain('Booster Packs')
    expect(html).toContain('Welcome Pack')
    expect(html).toContain('Booster Pack')
    expect(html).toContain('Frühstück')
    expect(html).not.toContain('Pack · Frühstück')
  })
  it('marks the gift pack with the data-signup-gift hook (pre-paint hide for signed-in)', () => {
    // globals.css hides [data-signup-gift] under html[data-auth="1"] (set by
    // CRITICAL_BOOTSTRAP from _authHint) so the SSR'd card never flashes for
    // returning signed-in visitors before client auth resolves.
    expect(render()).toContain('data-signup-gift')
  })
  it('renders direct checkout CTAs for category packs and offers gift email signup', () => {
    const html = render()
    expect(html).toContain('Kaufen · €2,99')
    expect(html).not.toContain('/pack/breakfast')
    expect(html).toContain('type="email"')
    expect(html).toContain('Anmelden')
  })
  it('does NOT render the all-berlin pack', () => {
    const html = render()
    expect(html).not.toContain('All Berlin')
  })
  it('falls back to the English displayName when no localized name exists', () => {
    const html = render({})
    expect(html).toContain('Breakfast')
  })
})
