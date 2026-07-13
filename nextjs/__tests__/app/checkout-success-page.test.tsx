import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  retrieveVerified: vi.fn(),
  analytics: vi.fn(() => null),
}))

vi.mock('next-intl/server', () => ({ setRequestLocale: vi.fn() }))
vi.mock('../../i18n/navigation', () => ({
  Link: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={String(href)} {...props}>{children}</a>
  ),
}))
vi.mock('../../lib/stripe-session', () => ({
  retrieveVerifiedCheckoutSession: mocks.retrieveVerified,
}))
vi.mock('../../app/[locale]/checkout/success/CheckoutSuccessAnalytics', () => ({
  default: mocks.analytics,
}))

import CheckoutSuccessPage from '../../app/[locale]/checkout/success/page'

async function render(searchParams: Record<string, string> = {}, locale = 'de') {
  const element = await CheckoutSuccessPage({
    params: Promise.resolve({ locale }),
    searchParams: Promise.resolve(searchParams),
  })
  return renderToStaticMarkup(element)
}

beforeEach(() => {
  mocks.retrieveVerified.mockReset()
  mocks.analytics.mockClear()
})

describe('checkout success page', () => {
  it('renders and tracks only catalog-verified paid session values', async () => {
    mocks.retrieveVerified.mockResolvedValueOnce({
      session: {
        id: 'cs_verified', payment_status: 'paid', amount_total: 299,
        customer_details: { email: 'buyer@example.com' },
      },
      pack: { packId: 'category-pizza', displayName: 'Pizza' },
      mode: 'guest',
      locale: 'de',
      uid: null,
    })

    const html = await render({ session_id: 'cs_verified', pack: 'all-berlin' })

    expect(html).toContain('Zahlung bestätigt')
    expect(html).toContain('Pizza Pack')
    expect(html).toContain('bu•••@example.com')
    expect(html).not.toContain('All Berlin')
    expect(mocks.analytics).toHaveBeenCalledWith({
      transactionId: 'cs_verified',
      packId: 'category-pizza',
      packName: 'Pizza',
      amountCents: 299,
    }, undefined)
  })

  it('shows a pending state and emits no purchase event while unpaid', async () => {
    mocks.retrieveVerified.mockResolvedValueOnce({
      session: { id: 'cs_pending', payment_status: 'unpaid', amount_total: 299 },
      pack: { packId: 'category-pizza', displayName: 'Pizza' },
      mode: 'auth',
      locale: 'de',
      uid: 'u1',
    })

    const html = await render({ session_id: 'cs_pending' })

    expect(html).toContain('Zahlung in Bearbeitung')
    expect(html).not.toContain('Zahlung bestätigt')
    expect(mocks.analytics).not.toHaveBeenCalled()
  })

  it('shows an invalid state and ignores an attacker-controlled pack query', async () => {
    mocks.retrieveVerified.mockRejectedValueOnce(new Error('not found'))

    const html = await render({ session_id: 'fake', pack: 'all-berlin' }, 'en')

    expect(html).toContain('Purchase not found')
    expect(html).not.toContain('All Berlin')
    expect(mocks.analytics).not.toHaveBeenCalled()
  })
})
