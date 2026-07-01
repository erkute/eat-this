import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'
import { translations } from '@/lib/i18n/translations'
import HubMagazine from '@/app/components/HubMagazine'
import type { HubArticle } from '@/lib/home/getHomeData'

const article = (o: Partial<HubArticle> = {}): HubArticle => ({
  title: 'Döner in Berlin: Wo ich hingehe',
  slug: 'doener-in-berlin',
  image: 'https://cdn.sanity.io/i.webp',
  kicker: 'Die Kolumne',
  ...o,
})

function render(articles: HubArticle[]) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="de" messages={translations.de}>
      <HubMagazine articles={articles} />
    </NextIntlClientProvider>,
  )
}

describe('HubMagazine', () => {
  it('renders heading, an article title (umlaut) and the kicker stamp', () => {
    const html = render([article()])
    expect(html).toContain('Auf den Teller')
    expect(html).toContain('Döner in Berlin')
    expect(html).toContain('Die Kolumne')
  })
  it('links each card to the news article WITHOUT nofollow (indexed)', () => {
    const html = render([article({ slug: 'donuts' })])
    expect(html).toContain('news/donuts')
    expect(html).not.toContain('rel="nofollow"')
  })
  it('renders nothing when there are no articles', () => {
    expect(render([])).toBe('')
  })
  it('omits the image and kicker stamp when absent', () => {
    const html = render([article({ image: null, kicker: null })])
    expect(html).not.toContain('<img')
    expect(html).toContain('Döner in Berlin')
  })
})
