import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { PortableTextRenderer, extractArticleSpots } from './PortableTextRenderer'
import type { PortableTextBlock, SpotCardBlock } from './types'

function render(blocks: PortableTextBlock[]): string {
  return renderToStaticMarkup(<PortableTextRenderer blocks={blocks} />)
}

const spotCard = (over: Partial<SpotCardBlock> = {}): PortableTextBlock =>
  ({
    _type: 'spotCard',
    _key: 'sc-' + (over.restaurantSlug ?? 'x'),
    restaurantName: 'SOFI',
    restaurantSlug: 'sofi',
    district: 'Mitte',
    cuisineType: 'Bakery',
    restaurantPhoto: 'https://cdn/sofi.jpg',
    ...over,
  }) as unknown as PortableTextBlock

function para(children: unknown[], markDefs: unknown[] = []): PortableTextBlock {
  return { _type: 'block', _key: 'b1', style: 'normal', markDefs, children } as unknown as PortableTextBlock
}

const link = (key: string, href: string, blank = false) => ({ _key: key, _type: 'link', href, blank })
const span = (text: string, marks: string[] = []) => ({ _type: 'span', _key: 's' + text, text, marks })

describe('PortableTextRenderer links', () => {
  it('renders a link annotation as an anchor with the href', () => {
    const html = render([para([span('SOFI', ['l1']), span(' in Mitte.')], [link('l1', '/map?r=sofi')])])
    expect(html).toContain('href="/map?r=sofi"')
    expect(html).toContain('SOFI')
  })

  it('adds rel=nofollow to internal /map deep-links', () => {
    const html = render([para([span('Map', ['l1'])], [link('l1', '/map?r=sofi')])])
    expect(html).toContain('rel="nofollow"')
  })

  it('adds rel=nofollow to /en/map locale deep-links too', () => {
    const html = render([para([span('Map', ['l1'])], [link('l1', '/en/map?r=sofi')])])
    expect(html).toContain('rel="nofollow"')
  })

  it('does NOT mark a regular internal link as nofollow', () => {
    const html = render([para([span('Spot', ['l1'])], [link('l1', '/restaurant/sofi')])])
    expect(html).toContain('href="/restaurant/sofi"')
    expect(html).not.toContain('rel=')
  })

  it('opens external blank links in a new tab with noopener', () => {
    const html = render([para([span('Site', ['l1'])], [link('l1', 'https://example.com', true)])])
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noopener noreferrer"')
  })

  it('still renders strong and em marks', () => {
    const html = render([para([span('bold', ['strong']), span('it', ['em'])])])
    expect(html).toContain('<strong>bold</strong>')
    expect(html).toContain('<em>it</em>')
  })

  it('renders a link nested with strong (both marks apply)', () => {
    const html = render([para([span('SOFI', ['strong', 'l1'])], [link('l1', '/map?r=sofi')])])
    expect(html).toContain('href="/map?r=sofi"')
    expect(html).toContain('<strong>SOFI</strong>')
  })

  it('ignores a dangling mark key with no matching markDef', () => {
    const html = render([para([span('text', ['ghost'])], [])])
    expect(html).toContain('text')
    expect(html).not.toContain('<a')
  })
})

describe('extractArticleSpots with spotCard', () => {
  it('reads a spotCard block as an article spot', () => {
    const spots = extractArticleSpots([spotCard()])
    expect(spots).toHaveLength(1)
    expect(spots[0]).toMatchObject({ name: 'SOFI', slug: 'sofi', district: 'Mitte', cuisineType: 'Bakery', photo: 'https://cdn/sofi.jpg' })
  })

  it('dedupes spotCard + mustEatCard by slug, first occurrence wins', () => {
    const mustEat = { _type: 'mustEatCard', _key: 'me1', restaurantName: 'SOFI', restaurantSlug: 'sofi', district: 'Mitte' } as unknown as PortableTextBlock
    const spots = extractArticleSpots([mustEat, spotCard(), spotCard({ restaurantSlug: 'albatross-baeckerei', restaurantName: 'Albatross' })])
    expect(spots.map((s) => s.slug)).toEqual(['sofi', 'albatross-baeckerei'])
  })

  it('skips spotCard without a restaurantName', () => {
    const spots = extractArticleSpots([spotCard({ restaurantName: undefined })])
    expect(spots).toHaveLength(0)
  })

  it('renders a spotCard inline as a map link when renderSpotCard is provided', () => {
    const html = renderToStaticMarkup(
      <PortableTextRenderer blocks={[spotCard()]} renderSpotCard={(b) => <a href={`/map?r=${b.restaurantSlug}`} rel="nofollow">{b.restaurantName}</a>} />,
    )
    expect(html).toContain('href="/map?r=sofi"')
    expect(html).toContain('rel="nofollow"')
  })

  it('skips spotCard blocks when no renderSpotCard prop is passed', () => {
    const html = render([spotCard()])
    expect(html).not.toContain('SOFI')
  })
})
