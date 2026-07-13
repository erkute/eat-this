import { describe, expect, it } from 'vitest'

import { mapMustEatsQuery } from '@/lib/map/queries'
import {
  articleBySlugQuery,
  emailSpotCardQuery,
  emailSpotsQuery,
} from '@/lib/queries'

const FORBIDDEN_PROJECTIONS = [
  /mustEatRef->dish/,
  /mustEatRef->description/,
  /mustEatRef->image/,
  /cardPhoto/,
]

describe('public Sanity premium boundary', () => {
  it('keeps the map Must-Eat query metadata-only', () => {
    expect(mapMustEatsQuery).toContain('revealedForAnon')
    expect(mapMustEatsQuery).toContain('restaurantRef->')
    for (const field of ['dish', 'description', 'descriptionEn', 'price']) {
      expect(mapMustEatsQuery).not.toMatch(new RegExp(`\\b${field}\\b`))
    }
    expect(mapMustEatsQuery).not.toContain('groqImageUrl')
    expect(mapMustEatsQuery).not.toMatch(/\n\s+"image":/)
  })

  it('does not project premium content into public articles or login emails', () => {
    for (const query of [articleBySlugQuery, emailSpotsQuery, emailSpotCardQuery]) {
      for (const forbidden of FORBIDDEN_PROJECTIONS) {
        expect(query).not.toMatch(forbidden)
      }
    }
  })
})
