import Anthropic from '@anthropic-ai/sdk'
import { describe, expect, it, vi } from 'vitest'
import {
  generateNewsArticle,
  type GenerateNewsArticleInput,
} from './generate-news-article.server'

const input: GenerateNewsArticleInput = {
  brief: 'Ein neuer, belegter Berliner Food-Guide mit konkreten Fakten und klarer Haltung.',
  category: 'guides',
  heroImageUrl: null,
  sourceUrls: ['https://example.com/source'],
  imageDescription: 'Eine Schale handgezogener Nudeln auf einem Holztisch',
  includeEnglish: true,
  length: 'standard',
}

function rawArticle() {
  const blocks = [
    {
      style: 'normal',
      children: [
        { text: 'Konkreter Einstieg mit ' },
        { text: 'Quelle', href: 'https://example.com/source' },
        { text: '.' },
      ],
    },
    { style: 'h2', children: [{ text: 'Was wichtig ist' }] },
    { style: 'normal', children: [{ text: 'Ein zweiter, belastbarer Absatz.' }] },
  ]
  return {
    titleDe: 'Nudeln in Berlin: ein konkreter Guide',
    titleEn: 'Noodles in Berlin: a practical guide',
    excerptDe: 'Ein direkter Guide zu handgezogenen Nudeln in Berlin.',
    excerptEn: 'A direct guide to hand-pulled noodles in Berlin.',
    contentDe: blocks,
    contentEn: blocks,
    metaTitleDe: 'Nudeln in Berlin – ein konkreter Guide',
    metaTitleEn: 'Noodles in Berlin – a practical guide',
    metaDescriptionDe: 'Handgezogene Nudeln in Berlin: konkrete Adressen, Stile und Unterschiede in einem direkten Guide.',
    metaDescriptionEn: 'Hand-pulled noodles in Berlin: specific addresses, styles and differences in one direct guide.',
    heroAlt: 'Schale mit handgezogenen Nudeln auf einem Holztisch',
    sources: [
      { title: 'Primary source', url: 'https://example.com/source' },
      { title: 'Unsafe', url: 'https://attacker.example/source' },
    ],
  }
}

function anthropicReturning(value: unknown) {
  const create = vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify(value) }],
    stop_reason: 'end_turn',
  })
  return {
    client: { messages: { create } } as unknown as Anthropic,
    create,
  }
}

describe('generateNewsArticle', () => {
  it('converts structured spans and safe links to Sanity Portable Text', async () => {
    const { client, create } = anthropicReturning(rawArticle())

    const result = await generateNewsArticle(input, client)

    expect(result.slug).toBe('nudeln-in-berlin-ein-konkreter-guide')
    expect(result.categoryLabelDe).toBe('Guides')
    expect(result.contentDe).toHaveLength(3)
    expect(result.contentDe[0].markDefs).toEqual([
      expect.objectContaining({
        _type: 'link',
        href: 'https://example.com/source',
      }),
    ])
    expect(result.contentDe[0].children[1].marks).toHaveLength(1)
    expect(result.sources).toEqual([
      { title: 'Primary source', url: 'https://example.com/source' },
    ])

    const request = create.mock.calls[0][0]
    expect(request.tools[0]).toMatchObject({
      max_uses: 6,
      name: 'web_search',
      type: 'web_search_20260209',
    })
    expect(request.tools[0].allowed_domains).toContain('example.com')
  })

  it('does not invent an alt text when no image motif was provided', async () => {
    const { client } = anthropicReturning(rawArticle())

    const result = await generateNewsArticle(
      { ...input, heroImageUrl: null, imageDescription: null },
      client,
    )

    expect(result.heroAlt).toBeNull()
  })

  it('sends an existing Sanity hero image to the vision-capable model', async () => {
    const { client, create } = anthropicReturning(rawArticle())
    const heroImageUrl =
      'https://cdn.sanity.io/images/ehwjnjr2/production/example-1200x800.jpg'

    const result = await generateNewsArticle(
      { ...input, heroImageUrl, imageDescription: null },
      client,
    )

    expect(result.heroAlt).toContain('handgezogenen Nudeln')
    expect(create.mock.calls[0][0].messages[0].content).toContainEqual({
      type: 'image',
      source: { type: 'url', url: heroImageUrl },
    })
  })

  it('supports a German-only draft', async () => {
    const raw = {
      ...rawArticle(),
      contentEn: null,
      excerptEn: null,
      metaDescriptionEn: null,
      metaTitleEn: null,
      titleEn: null,
    }
    const { client } = anthropicReturning(raw)

    const result = await generateNewsArticle(
      { ...input, includeEnglish: false },
      client,
    )

    expect(result.title).toBeNull()
    expect(result.content).toBeNull()
    expect(result.seo.metaTitleEn).toBeNull()
  })

  it('rejects SEO fields that violate the schema limits', async () => {
    const { client } = anthropicReturning({
      ...rawArticle(),
      metaTitleDe: 'x'.repeat(61),
    })

    await expect(generateNewsArticle(input, client)).rejects.toThrow(
      'metaTitleDe exceeds 60 characters',
    )
  })

  it('resumes a paused web-search turn before parsing the final JSON', async () => {
    const create = vi
      .fn()
      .mockResolvedValueOnce({
        content: [{ type: 'server_tool_use', id: 'tool-1', name: 'web_search' }],
        stop_reason: 'pause_turn',
      })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: JSON.stringify(rawArticle()) }],
        stop_reason: 'end_turn',
      })
    const client = { messages: { create } } as unknown as Anthropic

    await expect(generateNewsArticle(input, client)).resolves.toMatchObject({
      titleDe: 'Nudeln in Berlin: ein konkreter Guide',
    })
    expect(create).toHaveBeenCalledTimes(2)
  })
})
