import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import PackBuyButton from './PackBuyButton'

vi.mock('@/lib/auth', () => ({ useAuth: () => ({ user: null }) }))
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }))

const props = {
  packId: 'breakfast',
  packName: 'Breakfast',
  amountCents: 299,
  locale: 'de' as const,
  label: 'Kaufen',
  pendingLabel: 'Lädt',
  ownedLabel: 'Öffnen',
  ownedHref: '/profile',
  errorLabel: 'Fehler',
}

describe('PackBuyButton styling contract', () => {
  it('lets an embedding surface own the complete button class', () => {
    const html = renderToStaticMarkup(<PackBuyButton {...props} className="overview-buy" />)

    expect(html).toContain('class="overview-buy"')
    expect(html).not.toMatch(/class="[^"]+ overview-buy"/)
  })
})
