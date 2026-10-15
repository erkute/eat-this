import { describe, expect, it } from 'vitest';
import { mapMustEatsQuery } from './queries';

describe('mapMustEatsQuery', () => {
  /* Das Must-Eat-Detail blaettert durch genau diese Liste. Ohne Sortierung kam
     sie in Sanitys _id-Folge, und Vor/Zurueck sprang 022 → 021 → 036. */
  it('delivers the deck in card-number order', () => {
    expect(mapMustEatsQuery).toMatch(/\|\s*order\(order asc, _id asc\)/);
  });
});
