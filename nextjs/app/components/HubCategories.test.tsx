import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import HubCategories from '@/app/components/HubCategories'
import type { HubCategory } from '@/lib/home/getHomeData'

function render(categories: HubCategory[]) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="de" messages={{}}>
      <HubCategories categories={categories} />
    </NextIntlClientProvider>,
  )
}

describe('HubCategories', () => {
  it('renders heading, category name (with umlaut) and line', () => {
    const html = render([{ name: 'Frühstück', slug: 'breakfast', line: 'Egg, Toast, repeat.' }])
    expect(html).toContain('Berlin nach Kategorien')
    expect(html).toContain('Frühstück')
    expect(html).toContain('Egg, Toast, repeat.')
  })
  it('links each card to the category-filtered map with nofollow', () => {
    const html = render([{ name: 'Pizza', slug: 'pizza', line: null }])
    expect(html).toContain('cat=pizza')
    expect(html).toContain('rel="nofollow"')
    expect(html).toContain('booster_pizza.webp')
  })
  it('renders nothing when there are no categories', () => {
    expect(render([])).toBe('')
  })
})
