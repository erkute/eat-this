import { describe, expect, it } from 'vitest';

import { mapMustEatsQuery } from '@/lib/map/queries';
import { articleBySlugQuery, emailMustEatsQuery } from '@/lib/queries';

const FORBIDDEN_PROJECTIONS = [
  /mustEatRef->dish/,
  /mustEatRef->description/,
  /mustEatRef->image/,
  /cardPhoto/,
];

describe('public Sanity premium boundary', () => {
  it('keeps the map Must-Eat query metadata-only', () => {
    expect(mapMustEatsQuery).toContain('revealedForAnon');
    expect(mapMustEatsQuery).toContain('restaurantRef->');
    for (const field of ['dish', 'description', 'descriptionEn', 'price']) {
      expect(mapMustEatsQuery).not.toMatch(new RegExp(`\\b${field}\\b`));
    }
    expect(mapMustEatsQuery).not.toContain('groqImageUrl');
    expect(mapMustEatsQuery).not.toMatch(/\n\s+"image":/);
  });

  /* Die Mail zeigt Must-Eat-Karten, aber nur die des oeffentlichen
     Schaufensters — und die holt das Skript ohne Konto von der Route. Die
     Query selbst bleibt Metadaten: kein Gericht, kein Bild aus Sanity. */
  it('does not project premium content into public articles or login emails', () => {
    for (const field of ['dish', 'description', 'descriptionEn', 'price']) {
      expect(emailMustEatsQuery).not.toMatch(new RegExp(`\\b${field}\\b`));
    }
    for (const query of [articleBySlugQuery, emailMustEatsQuery]) {
      for (const forbidden of FORBIDDEN_PROJECTIONS) {
        expect(query).not.toMatch(forbidden);
      }
    }
  });
});
