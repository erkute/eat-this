import { describe, expect, it } from 'vitest'
import {
  buildBrandedTitle,
  METADATA_DESCRIPTION_MAX,
  METADATA_TITLE_MAX,
  truncateMetadataDescription,
} from './metadata-text'

describe('buildBrandedTitle', () => {
  it('adds the compact brand once', () => {
    expect(buildBrandedTitle('Die beste Pizza in Berlin')).toBe(
      'Die beste Pizza in Berlin | EAT THIS',
    )
    expect(buildBrandedTitle('Die beste Pizza in Berlin | Eat This Berlin')).toBe(
      'Die beste Pizza in Berlin | EAT THIS',
    )
  })

  it('keeps long titles within the final title budget', () => {
    const title = buildBrandedTitle(
      'Hokey Pokey Boutique — Eis & Concept-Store in Prenzlauer Berg',
    )
    expect(title.length).toBeLessThanOrEqual(METADATA_TITLE_MAX)
    expect(title).toMatch(/… \| EAT THIS$/)
  })
})

describe('truncateMetadataDescription', () => {
  it('keeps descriptions within the metadata budget', () => {
    const description = truncateMetadataDescription('Langer Satz ohne Punkt '.repeat(20))
    expect(description.length).toBeLessThanOrEqual(METADATA_DESCRIPTION_MAX)
  })

  it('prefers a complete sentence when one fits', () => {
    const description = truncateMetadataDescription(
      'Ein vollständiger erster Satz mit genug Substanz für das Snippet. ' +
        'Der zweite Satz ist absichtlich so lang, dass er nicht mehr vollständig in das festgelegte Description-Budget passt und deshalb wegfällt.',
    )
    expect(description).toBe('Ein vollständiger erster Satz mit genug Substanz für das Snippet.')
  })
})
