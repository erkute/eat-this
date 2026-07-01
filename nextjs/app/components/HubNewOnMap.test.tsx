import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import type { AnchorHTMLAttributes } from 'react'
import { translations } from '@/lib/i18n/translations'
import HubNewOnMap from '@/app/components/HubNewOnMap'
import type { NewOnMapCard } from '@/lib/home/getHomeData'

type MockLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string
  prefetch?: unknown
}

vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: MockLinkProps) => {
    delete props.prefetch
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  },
  useRouter: () => ({
    prefetch: () => {},
  }),
}))

const card = (o: Partial<NewOnMapCard> = {}): NewOnMapCard => ({
  _id: 'r1', name: 'Bar Basta', slug: 'bar-basta', image: 'https://cdn.sanity.io/i.png',
  district: 'Mitte', category: 'Dinner', ...o,
})

function render(cards: NewOnMapCard[]) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="de" messages={translations.de}>
      <HubNewOnMap cards={cards} />
    </NextIntlClientProvider>,
  )
}

describe('HubNewOnMap', () => {
  it('renders the heading and a card with name + meta', () => {
    const html = render([card()])
    expect(html).toContain('Neu auf der Map')
    expect(html).toContain('Bar Basta')
    expect(html).toContain('Mitte · Dinner')
  })
  it('links each card to the map with nofollow', () => {
    const html = render([card({ slug: 'sofi' })])
    expect(html).toContain('r=sofi')
    expect(html).toContain('rel="nofollow"')
  })
  it('renders a card without an image (no <img>)', () => {
    const html = render([card({ image: null })])
    expect(html).not.toContain('<img')
    expect(html).toContain('Bar Basta')
  })
  it('renders nothing when there are no cards', () => {
    expect(render([])).toBe('')
  })
})
