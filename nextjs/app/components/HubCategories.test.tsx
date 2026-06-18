import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import { translations } from '@/lib/i18n/translations'
import HubCategories from '@/app/components/HubCategories'
import type { HubCategory } from '@/lib/home/getHomeData'

function render(categories: HubCategory[]) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="de" messages={translations.de}>
      <HubCategories categories={categories} />
    </NextIntlClientProvider>,
  )
}

describe('HubCategories', () => {
  it('renders heading, category name (with umlaut) and line', () => {
    const html = render([{ name: 'Frühstück', slug: 'breakfast', line: 'Egg, Toast, repeat.' }])
    expect(html).toContain('Kategorien &amp; Packs')
    expect(html).toContain('Frühstück')
    expect(html).toContain('Egg, Toast, repeat.')
  })
  it('links each category to the map and its pack', () => {
    const html = render([{ name: 'Pizza', slug: 'pizza', line: null }])
    expect(html).toContain('cat=pizza')
    expect(html).toContain('rel="nofollow"')
    expect(html).toContain('/pack/pizza')
    expect(html).not.toContain('€2,99')
    expect(html).toContain('booster_pizza.webp')
  })
  it('renders nothing when there are no categories', () => {
    expect(render([])).toBe('')
  })
})
